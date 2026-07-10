'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, ChevronDown, FileUp, Loader2, ArrowRight } from 'lucide-react'

import { useToast } from '@/hooks/use-toast'
import { tenantPath } from '@/lib/tenant-path'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { ImportBatchHistory } from '@/components/leads/ImportBatchHistory'

type ImportState = 'idle' | 'extracting' | 'mapping' | 'parsing' | 'preview' | 'confirming' | 'done'

type Agent = {
  userId: string
  name: string
  email: string
  role: string
  activeLeadCount: number
}

type ParseResponse = {
  fileName: string
  totalRows: number
  validRows: number
  duplicateRows: number
  errorRows: number
  preview: Array<{
    fullName: string
    contactNumber: string
    email?: string | null
    city?: string | null
    country?: string | null
    stage: string
    dealValue?: number | null
  }>
  errors: Array<{ row: number; field: string; message: string }>
  duplicates: Array<{ row: number; name: string; matchedOn: string }>
  parsedData: Array<{
    fullName: string
    contactNumber: string
    email?: string | null
    city?: string | null
    country?: string | null
    stage: string
    source?: string | null
    dealValue?: number | null
    notes?: string | null
  }>
}

type ConfirmResponse = {
  imported: number
  assigned: number
  skipped: number
  agentBreakdown: Array<{ agentId: string; agentName: string; leadsAssigned: number }>
}

const MAPPABLE_FIELDS = [
  { key: 'fullName', label: 'Full Name', required: true },
  { key: 'contactNumber', label: 'Phone / Contact', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'country', label: 'Country', required: false },
  { key: 'stage', label: 'Pipeline Stage', required: false },
  { key: 'source', label: 'Source / Campaign', required: false },
  { key: 'intakeMonth', label: 'Intake Month', required: false },
  { key: 'destinationCountry', label: 'Study Destination', required: false },
  { key: 'programOfInterest', label: 'Program of Interest', required: false },
  { key: 'notes', label: 'Notes', required: false },
]

export default function ImportPage({
  canDeleteBatches = true,
  leadsListPath,
}: {
  canDeleteBatches?: boolean
  leadsListPath?: string
}) {
  const routeParams = useParams<{ tenantSlug: string }>()
  const tenantSlug = routeParams.tenantSlug
  const leadsHref = leadsListPath ?? tenantPath(tenantSlug, '/admin/leads')
  const { toast } = useToast()
  const [state, setState] = useState<ImportState>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [extractedHeaders, setExtractedHeaders] = useState<string[]>([])
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({})
  const [matchedOpen, setMatchedOpen] = useState(false)
  const [globalSource, setGlobalSource] = useState('')
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [expectedOpen, setExpectedOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedCount = selectedAgentIds.size
  const distributionCount = useMemo(() => {
    if (!parseResult || selectedCount === 0) return 0
    return Math.ceil(parseResult.validRows / selectedCount)
  }, [parseResult, selectedCount])

  async function readAsBase64(inputFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const value = reader.result
        if (typeof value !== 'string') {
          reject(new Error('Failed to read file'))
          return
        }
        const base64 = value.split(',')[1]
        resolve(base64 ?? '')
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(inputFile)
    })
  }

  async function fetchAgents() {
    const res = await fetch('/api/admin/team-members')
    if (!res.ok) {
      throw new Error('Failed to load agents')
    }
    const data = await res.json()
    const members: Agent[] = (data.data?.members ?? []).filter((m: Agent) => m.role !== 'ADMIN')
    setAgents(members)
    setSelectedAgentIds(new Set(members.map((member) => member.userId)))
  }

  async function handleFile(f: File) {
    setFile(f)
    setParseResult(null)
    setConfirmResult(null)
    setExtractedHeaders([])
    setCustomMapping({})
    setGlobalSource('')
    setError(null)
    setState('extracting')
    
    try {
      const base64 = await readAsBase64(f)
      const payload = { action: 'extract_headers', fileData: base64, fileName: f.name, tenantSlug }
      const res = await fetch('/api/leads/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to read headers')
      
      const headers = data.data.headers ?? []
      setExtractedHeaders(headers)
      
      // Auto-match common fields
      const autoMap: Record<string, string> = {}
      headers.forEach((h: string) => {
        const norm = h.toLowerCase().trim().replace(/\s+/g, ' ')
        const fieldMap: Record<string, string> = {
          'name': 'fullName', 'full name': 'fullName', 'fullname': 'fullName',
          'email': 'email', 'email address': 'email', 'mailing address': 'email',
          'phone': 'contactNumber', 'contact': 'contactNumber', 'mobile': 'contactNumber', 'contact number': 'contactNumber',
          'city': 'city', 'country': 'country',
          'stage': 'stage',
          'source': 'source', 'campaign': 'source', 'campaign name': 'source',
          'intake': 'intakeMonth', 'intake month': 'intakeMonth',
          'program': 'programOfInterest', 'course': 'programOfInterest', 'program of interest': 'programOfInterest',
          'destination': 'destinationCountry', 'study destination': 'destinationCountry',
          'notes': 'notes',
        }
        if (fieldMap[norm]) {
          autoMap[fieldMap[norm]] = h
        }
      })
      setCustomMapping(autoMap)
      
      setState('mapping')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setState('idle')
    }
  }

  async function handleParse() {
    if (!file) return
    setState('parsing')
    setError(null)
    setParseResult(null)
    setConfirmResult(null)

    try {
      const base64 = await readAsBase64(file)
      const payload = {
        action: 'parse',
        fileData: base64,
        fileName: file.name,
        tenantSlug,
        customMapping,
      }
      const parseRes = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await parseRes.json()

      if (!parseRes.ok) {
        setError(data.error ?? 'Import failed')
        toast({ variant: 'destructive', title: 'Import Failed', description: data.error ?? 'Invalid file data.' })
      } else {
        setParseResult(data.data)
        setState('preview')
        await fetchAgents()
      }
    } catch {
      setError('Something went wrong. Try again.')
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to server.' })
      setState('idle')
    } finally {
      setState((current) => (current === 'parsing' ? 'idle' : current))
    }
  }

  async function handleConfirm() {
    if (!parseResult) return
    setState('confirming')
    try {
      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          parsedData: parseResult.parsedData,
          assignToAgentIds: Array.from(selectedAgentIds),
          tenantSlug,
          fileName: parseResult.fileName,
          totalRows: parseResult.totalRows,
          duplicateRows: parseResult.duplicateRows,
          errorRows: parseResult.errorRows,
          globalSource: globalSource.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? 'Import failed')
      }
      setConfirmResult(data.data)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setState('preview')
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 p-0 sm:p-2 lg:p-4">
      <div>
        <h1 className="text-2xl font-semibold text-[#223955]">Import Leads</h1>
      </div>

      {state === 'idle' && (
        <>
          <Card
            className={`rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer ${
              dragOver ? 'border-primary/60 bg-primary/5' : ''
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragOver(false)
              const droppedFile = event.dataTransfer.files[0]
              if (droppedFile) handleFile(droppedFile)
            }}
          >
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileUp className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">Upload leads file</p>
                <p className="text-sm text-muted-foreground mt-1">Drag and drop or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Supports CSV and XLSX · Max 10MB</p>
              </div>
              <Button variant="outline" size="sm">Browse files</Button>
              {file && <p className="text-xs text-muted-foreground">Selected: {file.name}</p>}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0]
                if (selected) handleFile(selected)
              }}
            />
          </Card>
          <Button onClick={handleParse} disabled={!file}>Parse File</Button>

          <Collapsible open={expectedOpen} onOpenChange={setExpectedOpen}>
            <CollapsibleTrigger className="flex items-center text-sm font-medium">
              Expected format <ChevronDown className="h-4 w-4 ml-1" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-md border text-sm">
                <div className="grid grid-cols-2 border-b p-2 font-medium">
                  <span>Field</span>
                  <span>Accepted columns</span>
                </div>
                {[
                  ['fullName (required)', 'full name, fullname, name'],
                  ['contactNumber', 'contact, phone, contactnumber, contact_number'],
                  ['email', 'email'],
                  ['intake (optional)', 'intake, intake month, intake_month, intakemonth'],
                  ['stage (optional)', 'stage — uses first pipeline stage if blank'],
                  ['city', 'city'],
                  ['country', 'country'],
                  ['source', 'source'],
                  ['notes', 'notes → stored as qualification'],
                ].map(([field, aliases]) => (
                  <div key={field} className="grid grid-cols-2 p-2 border-b last:border-b-0">
                    <span>{field}</span>
                    <span className="text-muted-foreground">{aliases}</span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {state === 'extracting' && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Reading file format...</span>
        </div>
      )}

      {state === 'mapping' && (() => {
        const mappedFields = MAPPABLE_FIELDS.filter(f => customMapping[f.key])
        const unmappedFields = MAPPABLE_FIELDS.filter(f => !customMapping[f.key])

        return (
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Map Columns</h2>
              <p className="text-sm text-muted-foreground">Match your file's headers to the CRM fields. Unmapped fields will be auto-matched if possible.</p>
            </div>
            
            <div className="space-y-4">
              {mappedFields.length > 0 && (
                <Collapsible open={matchedOpen} onOpenChange={setMatchedOpen} className="rounded-md border bg-slate-50/50 dark:bg-slate-900/50">
                  <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {mappedFields.length} Auto-Matched Columns
                    </span>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${matchedOpen ? 'rotate-180' : ''}`} />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t overflow-x-auto">
                      <table className="w-full min-w-[500px] text-sm">
                        <thead className="bg-muted/40 border-b">
                          <tr>
                            <th className="p-3 text-left font-medium">CRM Field</th>
                            <th className="p-3 text-left font-medium w-8"></th>
                            <th className="p-3 text-left font-medium">Your CSV Header</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappedFields.map(field => (
                            <tr key={field.key} className="border-b last:border-b-0 opacity-70 hover:opacity-100 transition-opacity">
                              <td className="p-3">
                                <span className="font-medium">{field.label}</span>
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                              </td>
                              <td className="p-3 text-muted-foreground"><ArrowRight className="h-4 w-4" /></td>
                              <td className="p-3">
                                <div className="relative w-[200px] sm:w-[280px]">
                                  <select
                                    value={customMapping[field.key] ?? 'unmapped'}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      setCustomMapping(prev => {
                                        const next = { ...prev }
                                        if (val === 'unmapped') delete next[field.key]
                                        else next[field.key] = val
                                        return next
                                      })
                                    }}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none pr-8 cursor-pointer"
                                  >
                                    <option value="unmapped">-- Do not map --</option>
                                    {extractedHeaders.map(h => (
                                      <option key={h} value={h}>{h}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {unmappedFields.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full min-w-[500px] text-sm">
                    <thead className="bg-muted/40 border-b">
                      <tr>
                        <th className="p-3 text-left font-medium">CRM Field <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">Unmapped</span></th>
                        <th className="p-3 text-left font-medium w-8"></th>
                        <th className="p-3 text-left font-medium">Your CSV Header</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmappedFields.map(field => (
                        <tr key={field.key} className="border-b last:border-b-0">
                          <td className="p-3">
                            <span className="font-medium">{field.label}</span>
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </td>
                          <td className="p-3 text-muted-foreground"><ArrowRight className="h-4 w-4" /></td>
                          <td className="p-3">
                            <div className="relative w-[200px] sm:w-[280px]">
                              <select
                                value={customMapping[field.key] ?? 'unmapped'}
                                onChange={(e) => {
                                  const val = e.target.value
                                  setCustomMapping(prev => {
                                    const next = { ...prev }
                                    if (val === 'unmapped') delete next[field.key]
                                    else next[field.key] = val
                                    return next
                                  })
                                }}
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none pr-8 cursor-pointer"
                              >
                                <option value="unmapped">-- Do not map --</option>
                                {extractedHeaders.map(h => (
                                  <option key={h} value={h}>{h}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setState('idle'); setFile(null) }}>Cancel</Button>
              <Button onClick={handleParse}>Preview Import</Button>
            </div>
          </Card>
        );
      })()}

      {state === 'parsing' && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Parsing your file...</span>
        </div>
      )}

      {state === 'preview' && parseResult && (
        <div className="space-y-6">
          <Card className="p-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded border p-3"><p className="text-xs text-muted-foreground">Total Rows</p><p className="font-semibold">{parseResult.totalRows}</p></div>
              <div className="rounded border p-3 bg-emerald-50"><p className="text-xs text-emerald-700">Valid Leads</p><p className="font-semibold text-emerald-700">{parseResult.validRows}</p></div>
              <div className="rounded border p-3 bg-amber-50"><p className="text-xs text-amber-700">Duplicates</p><p className="font-semibold text-amber-700">{parseResult.duplicateRows}</p></div>
              <div className="rounded border p-3 bg-red-50"><p className="text-xs text-red-700">Errors</p><p className="font-semibold text-red-700">{parseResult.errorRows}</p></div>
            </div>
          </Card>

          <Card className="p-4">
            <p className="font-medium mb-3">Preview</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2">Name</th><th className="py-2">Contact</th><th className="py-2">Email</th><th className="py-2">City</th><th className="py-2">Country</th><th className="py-2">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {parseResult.preview.map((row) => (
                    <tr key={`${row.fullName}-${row.contactNumber}`} className="border-b">
                      <td className="py-2">{row.fullName}</td><td>{row.contactNumber}</td><td>{row.email ?? '—'}</td><td>{row.city ?? '—'}</td><td>{row.country ?? '—'}</td><td>{row.stage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <p className="font-medium">Counselor assignment</p>
            {agents.map((agent) => {
              const checked = selectedAgentIds.has(agent.userId)
              return (
                <div key={agent.userId} className="flex items-center justify-between rounded border p-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSelectedAgentIds((prev) => {
                          const next = new Set(prev)
                          if (value) next.add(agent.userId)
                          else next.delete(agent.userId)
                          return next
                        })
                      }}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{agent.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{agent.name}</p>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {agent.role === 'PRO' ? 'Pro' : agent.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{agent.email}</p>
                    </div>
                  </div>
                  <span className="text-xs rounded bg-muted px-2 py-1">Active: {agent.activeLeadCount}</span>
                </div>
              )
            })}
            {selectedCount > 0 ? (
              <p className="text-sm text-muted-foreground">
                Distribution preview: each selected counselor will receive ~{distributionCount} leads
              </p>
            ) : (
              <p className="text-sm text-amber-600">All leads will be imported as Unassigned</p>
            )}
          </Card>

          {(parseResult.errors.length > 0 || parseResult.duplicates.length > 0) && (
            <Card className="p-4 space-y-3">
              <p className="font-medium">Errors and duplicates</p>
              {parseResult.errors.slice(0, 20).map((item) => (
                <p key={`${item.row}-${item.field}`} className="text-sm text-red-600">
                  Row {item.row}: {item.field} - {item.message}
                </p>
              ))}
              {parseResult.duplicates.slice(0, 20).map((item) => (
                <p key={`${item.row}-${item.matchedOn}`} className="text-sm text-amber-600">
                  Row {item.row}: {item.name} matched on {item.matchedOn}
                </p>
              ))}
            </Card>
          )}

          <Card className="p-4 space-y-3">
            <p className="font-medium">Campaign Source (Optional)</p>
            <p className="text-sm text-muted-foreground">Apply a single marketing campaign or source to all imported leads. This overrides any source mapped from the file.</p>
            <Input 
              placeholder="e.g. UK Fair July 2026" 
              value={globalSource} 
              onChange={e => setGlobalSource(e.target.value)} 
              className="max-w-md"
            />
          </Card>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => { setState('idle'); setFile(null); setParseResult(null) }}>
              Cancel Import
            </Button>
            <Button onClick={handleConfirm}>Confirm Import ({parseResult.validRows} leads)</Button>
          </div>
        </div>
      )}

      {state === 'confirming' && parseResult && (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Importing {parseResult.validRows} leads...</span>
        </div>
      )}

      {state === 'done' && confirmResult && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-semibold">Import Complete</p>
              <p className="text-sm text-muted-foreground">{confirmResult.imported} leads imported successfully</p>
            </div>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr><th className="p-2 text-left">Counselor</th><th className="p-2 text-left">Assigned</th></tr>
              </thead>
              <tbody>
                {confirmResult.agentBreakdown.map((item) => (
                  <tr key={item.agentId} className="border-b last:border-b-0">
                    <td className="p-2">{item.agentName}</td>
                    <td className="p-2">{item.leadsAssigned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setState('idle'); setFile(null); setParseResult(null); setConfirmResult(null) }}>
              Import Another File
            </Button>
            <Button asChild>
              <Link href={leadsHref}>View Leads →</Link>
            </Button>
          </div>
        </Card>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ImportBatchHistory canDelete={canDeleteBatches} />
    </div>
  )
}