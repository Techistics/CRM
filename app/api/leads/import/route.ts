import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { leads, csvImports, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const COLUMN_MAP: Record<string, string> = {
  'name': 'fullName',
  'full name': 'fullName',
  'fullname': 'fullName',
  'student name': 'fullName',
  'student': 'fullName',
  'phone': 'contactNumber',
  'mobile': 'contactNumber',
  'contact': 'contactNumber',
  'contact number': 'contactNumber',
  'phone number': 'contactNumber',
  'mob': 'contactNumber',
  'mobile number': 'contactNumber',
  'email': 'email',
  'e-mail': 'email',
  'email address': 'email',
  'city': 'city',
  'location': 'city',
  'area': 'city',
  'address': 'city',
  'qualification': 'lastQualification',
  'last qualification': 'lastQualification',
  'education': 'lastQualification',
  'degree': 'lastQualification',
  'grades': 'grades',
  'grade': 'grades',
  'marks': 'grades',
  'result': 'grades',
  'score': 'grades',
  'gpa': 'grades',
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
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get email from Clerk directly, then look up by email
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const email = clerkUser.emailAddresses[0]?.emailAddress

  const [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))

  if (!adminUser || adminUser.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — not admin' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const fileName = file.name
  const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
  const isCSV = fileName.endsWith('.csv')

  if (!isExcel && !isCSV) {
    return NextResponse.json({ error: 'Only CSV and Excel files are supported' }, { status: 400 })
  }

  const [importRecord] = await db
    .insert(csvImports)
    .values({
      importedBy: adminUser.id,
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
    let importedRows = 0
    let skippedRows = 0

    for (const row of rows) {
      const mapped = mapRow(row)

      if (!mapped.fullName && !mapped.contactNumber && !mapped.email) {
        skippedRows++
        continue
      }

      const fullName = mapped.fullName || mapped.email || mapped.contactNumber || 'Unknown'

      await db
        .insert(leads)
        .values({
          fullName,
          contactNumber: mapped.contactNumber,
          email: mapped.email,
          city: mapped.city,
          lastQualification: mapped.lastQualification,
          grades: mapped.grades,
          source: 'csv_import',
          rawData: row,
          stage: 'new_lead',
          createdBy: adminUser.id,
        })
        .onConflictDoNothing()

      importedRows++
    }

    await db
      .update(csvImports)
      .set({ status: 'done', totalRows, importedRows, skippedRows })
      .where(eq(csvImports.id, importRecord.id))

    return NextResponse.json({ success: true, totalRows, importedRows, skippedRows })

  } catch (err) {
    console.error('Import error:', err)
    await db
      .update(csvImports)
      .set({ status: 'failed' })
      .where(eq(csvImports.id, importRecord.id))

    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}