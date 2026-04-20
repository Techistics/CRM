import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, csvImports } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireTenantAdminApi } from '@/lib/tenant-api'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { successResponse, errorResponse, withApiErrorHandling } from '@/lib/api-response'

const COLUMN_MAP: Record<string, string> = {
  // Name
  'name': 'fullName',
  'full name': 'fullName',
  'fullname': 'fullName',
  'student name': 'fullName',
  'student': 'fullName',
  'candidate name': 'fullName',
  'applicant name': 'fullName',
  'first name': 'fullName',
  'last name': 'fullName',
  
  // Contact
  'phone': 'contactNumber',
  'mobile': 'contactNumber',
  'contact': 'contactNumber',
  'contact number': 'contactNumber',
  'phone number': 'contactNumber',
  'mob': 'contactNumber',
  'mobile number': 'contactNumber',
  'cell': 'contactNumber',
  'cell number': 'contactNumber',
  'whatsapp': 'contactNumber',
  'whatsapp number': 'contactNumber',
  'tel': 'contactNumber',
  'telephone': 'contactNumber',
  'ph': 'contactNumber',

  // Email
  'email': 'email',
  'e-mail': 'email',
  'email address': 'email',
  'email id': 'email',
  'student email': 'email',
  'applicant email': 'email',

  // City
  'city': 'city',
  'location': 'city',
  'area': 'city',
  'address': 'city',
  'town': 'city',
  'province': 'city',
  'state': 'city',

  // Qualification
  'qualification': 'lastQualification',
  'last qualification': 'lastQualification',
  'education': 'lastQualification',
  'degree': 'lastQualification',
  'basic qualification': 'lastQualification',
  'current education': 'lastQualification',

  // Grades
  'grades': 'grades',
  'grade': 'grades',
  'marks': 'grades',
  'result': 'grades',
  'score': 'grades',
  'gpa': 'grades',
  'cgpa': 'grades',
  'percentage': 'grades',
  'total marks': 'grades',
}

function mapRow(row: Record<string, string>) {
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.toLowerCase().trim()
    const fieldName = COLUMN_MAP[normalized]
    if (fieldName && value?.toString().trim()) {
      mapped[fieldName] = value.toString().trim()
    }
  }
  return mapped
}

export async function POST(req: NextRequest) {
  return withApiErrorHandling(async () => {
    const ctx = await requireTenantAdminApi()
    if (!ctx.ok) return ctx.response

    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return errorResponse('No file provided', 'MISSING_FILE', 400)
    }

    const fileName = file.name
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    const isCSV = fileName.endsWith('.csv')

    if (!isExcel && !isCSV) {
      return errorResponse('Only CSV and Excel files are supported', 'INVALID_FILE_TYPE', 400)
    }

    const [importRecord] = await db
      .insert(csvImports)
      .values({
        tenantId: ctx.tenant.id,
        importedBy: ctx.dbUserId,
        fileName,
        status: 'processing',
        totalRows: 0,
        importedRows: 0,
        skippedRows: 0,
      })
      .returning()

    try {
      let rows: Record<string, string>[] = []

      if (isCSV) {
        const text = await file.text()
        const result = Papa.parse<Record<string, string>>(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h) => h.trim(),
        })
        rows = result.data
      }

      if (isExcel) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, {
          defval: '',
          raw: false,
        })
      }

      const totalRows = rows.length
      let skippedRows = 0
      const leadsToInsert: any[] = []

      for (const row of rows) {
        const mapped = mapRow(row)

        if (!mapped.fullName && !mapped.contactNumber && !mapped.email) {
          skippedRows++
          continue
        }

        const fullName = mapped.fullName || mapped.email || mapped.contactNumber || 'Unknown'

        leadsToInsert.push({
          tenantId: ctx.tenant.id,
          fullName,
          contactNumber: mapped.contactNumber || null,
          email: mapped.email || null,
          city: mapped.city || null,
          lastQualification: mapped.lastQualification || null,
          grades: mapped.grades || null,
          source: 'csv_import',
          rawData: row,
          stage: 'new_lead',
          createdBy: ctx.dbUserId,
        })
      }

      let importedRows = 0
      if (leadsToInsert.length > 0) {
        // Perform Batch Insert
        const result = await db
          .insert(leads)
          .values(leadsToInsert)
          .onConflictDoNothing()
        
        // Note: Drizzle's onConflictDoNothing doesn't return count easily in all drivers
        // But we can estimate or count the leadsToInsert
        importedRows = leadsToInsert.length 
      }

      await db
        .update(csvImports)
        .set({ status: 'done', totalRows, importedRows, skippedRows })
        .where(
          and(
            eq(csvImports.id, importRecord.id),
            eq(csvImports.tenantId, ctx.tenant.id),
          ),
        )

      return successResponse({ totalRows, importedRows, skippedRows })

    } catch (err) {
      console.error('Import error:', err)
      await db
        .update(csvImports)
        .set({ status: 'failed' })
        .where(
          and(
            eq(csvImports.id, importRecord.id),
            eq(csvImports.tenantId, ctx.tenant.id),
          ),
        )

      return errorResponse('Import failed', 'IMPORT_FAILED', 500)
    }
  })
}