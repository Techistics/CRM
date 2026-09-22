'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { CheckCircle2, ChevronDown, FileUp, Loader2 } from 'lucide-react'

import { useToast } from '@/hooks/use-toast'
import { tenantPath } from '@/lib/tenant-path'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ImportBatchHistory } from '@/components/leads/ImportBatchHistory'
import { ImportColumnMapper } from '@/components/leads/ImportColumnMapper'
import type { ImportFieldKey } from '@/lib/leads/import-fields'

type ImportState = 'idle' | 'mapping' | 'parsing' | 'preview' | 'confirming' | 'done'

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
    activityNote?: string | null
  }>
}

type DetectResponse = {
  fileName: string
  headers: string[]
  totalRows: number
  suggestedMapping: Record<string, ImportFieldKey>
  pipelineStages: Array<{ key: string; label: string }>
}

type ConfirmResponse = {
  imported: number
  assigned: number
  skipped: number
  agentBreakdown: Array<{ agentId: string; agentName: string; leadsAssigned: number }>
}

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
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null)
  const [confirmResult, setConfirmResult] = useState<ConfirmResponse | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  // agentId -> count admin wants to assign to that agent
  const [agentCounts, setAgentCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [expectedOpen, setExpectedOpen] = useState(false)
  const [detectResult, setDetectResult] = useState<DetectResponse | null>(null)
  const [columnMapping, setColumnMapping] = useState<Record<string, ImportFieldKey>>({})
  const [fileDataBase64, setFileDataBase64] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [modalType, setModalType] = useState<'valid' | 'duplicates' | 'errors' | null>(null)
  const [visibleCount, setVisibleCount] = useState(10)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setVisibleCount((prev) => prev + 10)
    }
  }

  const hasFullNameMapping = useMemo(
    () => Object.values(columnMapping).includes('fullName'),
    [columnMapping],
  )

  const totalAssigned = useMemo(
    () => Object.values(agentCounts).reduce((sum, c) => sum + (c || 0), 0),
    [agentCounts],
  )
  const remaining = parseResult ? parseResult.validRows - totalAssigned : 0
  const overAssigned = remaining < 0
  const countMismatch = parseResult ? totalAssigned !== parseResult.validRows : true

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
    // Start every agent's count at 0 — admin fills in what they want.
    setAgentCounts(Object.fromEntries(members.map((m) => [m.userId, 0])))
  }

  function handleFile(f: File) {
    setFile(f)
    setParseResult(null)
    setConfirmResult(null)
    setDetectResult(null)
    setColumnMapping({})
    setFileDataBase64(null)
    setState('idle')
    setError(null)
  }

  function setMappingForHeader(header: string, fieldKey: ImportFieldKey) {
    setColumnMapping((prev) => ({ ...prev, [header]: fieldKey }))
  }

  function setAgentCount(agentId: string, value: string) {
    const num = Math.max(0, parseInt(value, 10) || 0)
    setAgentCounts((prev) => ({ ...prev, [agentId]: num }))
  }

  function autoSplitEvenly() {
    if (!parseResult || agents.length === 0) return
    const base = Math.floor(parseResult.validRows / agents.length)
    const extra = parseResult.validRows % agents.length
    const next: Record<string, number> = {}
    agents.forEach((agent, idx) => {
      next[agent.userId] = base + (idx < extra ? 1 : 0)
    })
    setAgentCounts(next)
  }

  function clearAllCounts() {
    setAgentCounts(Object.fromEntries(agents.map((a) => [a.userId, 0])))
  }

  async function handleDetect() {
    if (!file) return
    setState('parsing')
    setError(null)
    setDetectResult(null)
    setParseResult(null)
    setConfirmResult(null)

    try {
      const base64 = await readAsBase64(file)
      setFileDataBase64(base64)
      const detectRes = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'detect',
          fileData: base64,
          fileName: file.name,
          tenantSlug,
        }),
      })
      const data = await detectRes.json()

      if (!detectRes.ok) {
        setError(data.error ?? 'Import failed')
        toast({ variant: 'destructive', title: 'Import Failed', description: data.error ?? 'Invalid file data.' })
        setState('idle')
      } else {
        setDetectResult(data.data)
        setColumnMapping(data.data.suggestedMapping ?? {})
        setState('mapping')
      }
    } catch {
      setError('Something went wrong. Try again.')
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to server.' })
      setState('idle')
    }
  }

  async function handleParse() {
    if (!file || !fileDataBase64) return
    if (!hasFullNameMapping) {
      toast({ variant: 'destructive', title: 'Mapping required', description: 'Map at least one CSV column to Full Name.' })
      return
    }
    setState('parsing')
    setError(null)
    setParseResult(null)
    setConfirmResult(null)

    try {
      const parseRes = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'parse',
          fileData: fileDataBase64,
          fileName: file.name,
          tenantSlug,
          columnMapping,
        }),
      })
      const data = await parseRes.json()

      if (!parseRes.ok) {
        setError(data.error ?? 'Import failed')
        toast({ variant: 'destructive', title: 'Import Failed', description: data.error ?? 'Invalid file data.' })
        setState('mapping')
      } else {
        setParseResult(data.data)
        setState('preview')
        await fetchAgents()
      }
    } catch {
      setError('Something went wrong. Try again.')
      toast({ variant: 'destructive', title: 'Network Error', description: 'Could not connect to server.' })
      setState('mapping')
    }
  }

  async function handleConfirm() {
    if (!parseResult) return
    if (totalAssigned !== parseResult.validRows) {
      toast({ variant: 'destructive', title: 'Assignment count mismatch', description: `Assigned leads must exactly equal ${parseResult.validRows}.` })
      return
    }
    setState('confirming')
    try {
      const agentAssignments = Object.entries(agentCounts)
        .filter(([, count]) => count > 0)
        .map(([agentId, count]) => ({ agentId, count }))

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          parsedData: parseResult.parsedData,
          agentAssignments,
          tenantSlug,
          fileName: parseResult.fileName,
          totalRows: parseResult.totalRows,
          duplicateRows: parseResult.duplicateRows,
          errorRows: parseResult.errorRows,
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
        <h1 className="text-2xl font-semibold text-[#223955] dark:text-white">Import Leads</h1>
      </div>

      {state === 'idle' && (
        <>
          <Card
            className={`rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer ${dragOver ? 'border-primary/60 bg-primary/5' : ''
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
          <Button onClick={handleDetect} disabled={!file}>Map Columns</Button>

          <Collapsible open={expectedOpen} onOpenChange={setExpectedOpen}>
            <CollapsibleTrigger className="flex items-center text-sm font-medium">
              How column mapping works <ChevronDown className="h-4 w-4 ml-1" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <p className="text-sm text-muted-foreground">
                After upload, match each CSV column to a CRM field. Unmatched columns can be mapped to
                {' '}<strong>Notes (Activity Log)</strong> so the data appears on the lead activity timeline.
                Only <strong>Full Name</strong> is required.
              </p>
            </CollapsibleContent>
          </Collapsible>
        </>
      )}

      {state === 'mapping' && detectResult && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div>
              <p className="font-medium">Map CSV columns to CRM fields</p>
              <p className="text-sm text-muted-foreground mt-1">
                {detectResult.totalRows} rows · {detectResult.headers.length} columns in {detectResult.fileName}
              </p>
            </div>
            <ImportColumnMapper
              headers={detectResult.headers}
              mapping={columnMapping}
              onMappingChange={setMappingForHeader}
            />
            {!hasFullNameMapping && (
              <p className="text-sm text-red-600">Map at least one column to Full Name before continuing.</p>
            )}
          </Card>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => { setState('idle'); setDetectResult(null) }}>
              Back
            </Button>
            <Button onClick={handleParse} disabled={!hasFullNameMapping}>
              Parse &amp; Preview
            </Button>
          </div>
        </div>
      )}

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
              <div className="rounded border p-3">
                <p className="text-xs text-muted-foreground">Total Rows</p>
                <p className="font-semibold">{parseResult.totalRows}</p>
              </div>
              <div 
                className="rounded border p-3 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors"
                onClick={() => { setModalType('valid'); setVisibleCount(10); }}
              >
                <p className="text-xs text-emerald-700">Valid Leads</p>
                <p className="font-semibold text-emerald-700">{parseResult.validRows}</p>
              </div>
              <div 
                className="rounded border p-3 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => { setModalType('duplicates'); setVisibleCount(10); }}
              >
                <p className="text-xs text-amber-700">Duplicates</p>
                <p className="font-semibold text-amber-700">{parseResult.duplicateRows}</p>
              </div>
              <div 
                className="rounded border p-3 bg-red-50 cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => { setModalType('errors'); setVisibleCount(10); }}
              >
                <p className="text-xs text-red-700">Errors</p>
                <p className="font-semibold text-red-700">{parseResult.errorRows}</p>
              </div>
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
            <div className="flex items-center justify-between">
              <p className="font-medium">Counselor assignment</p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={autoSplitEvenly}>
                  Split Evenly
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearAllCounts}>
                  Clear
                </Button>
              </div>
            </div>

            {agents.map((agent) => (
              <div key={agent.userId} className="flex items-center justify-between rounded border p-3">
                <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Active: {agent.activeLeadCount}</span>
                  <Input
                    type="number"
                    min={0}
                    max={parseResult.validRows}
                    value={agentCounts[agent.userId] ?? 0}
                    onChange={(e) => setAgentCount(agent.userId, e.target.value)}
                    className="w-20 h-8 text-right"
                  />
                </div>
              </div>
            ))}

            <div className={`text-sm rounded-md px-3 py-2 ${countMismatch ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {overAssigned
                ? `Over by ${Math.abs(remaining)} — reduce counts to match ${parseResult.validRows} valid leads.`
                : remaining > 0
                  ? `Under by ${remaining} — assign ${remaining} more lead${remaining === 1 ? '' : 's'} to reach ${parseResult.validRows}.`
                  : `Assigned: ${totalAssigned} / ${parseResult.validRows} — all leads accounted for.`}
            </div>
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

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => { setState('mapping'); setParseResult(null) }}>
              Back to Mapping
            </Button>
            <Button variant="outline" onClick={() => { setState('idle'); setFile(null); setParseResult(null); setDetectResult(null) }}>
              Cancel Import
            </Button>
            <Button onClick={handleConfirm} disabled={countMismatch}>
              Confirm Import ({parseResult.validRows} leads)
            </Button>
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

      <Dialog open={modalType !== null} onOpenChange={(open) => { if (!open) setModalType(null) }}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {modalType === 'valid' && 'Valid Leads'}
              {modalType === 'duplicates' && 'Duplicates'}
              {modalType === 'errors' && 'Errors'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 mt-4 pr-2" onScroll={handleScroll}>
            {modalType === 'valid' && parseResult && (
              <div className="overflow-x-auto pb-4">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="text-left border-b sticky top-0 bg-background/95 backdrop-blur z-10">
                    <tr>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Name</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Contact</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Email</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">City</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Country</th>
                      <th className="py-2 px-3 font-medium text-muted-foreground">Stage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.parsedData.slice(0, visibleCount).map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-3">{row.fullName}</td>
                        <td className="py-3 px-3">{row.contactNumber}</td>
                        <td className="py-3 px-3">{row.email ?? '—'}</td>
                        <td className="py-3 px-3">{row.city ?? '—'}</td>
                        <td className="py-3 px-3">{row.country ?? '—'}</td>
                        <td className="py-3 px-3">{row.stage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {modalType === 'duplicates' && parseResult && (
              <div className="space-y-3 pb-4">
                {parseResult.duplicates.slice(0, visibleCount).map((item, idx) => (
                  <div key={idx} className="p-3 border border-amber-200 rounded-md text-sm text-amber-800 bg-amber-50">
                    <span className="font-medium">Row {item.row}:</span> {item.name} matched on <span className="font-semibold">{item.matchedOn}</span>
                  </div>
                ))}
              </div>
            )}
            {modalType === 'errors' && parseResult && (
              <div className="space-y-3 pb-4">
                {parseResult.errors.slice(0, visibleCount).map((item, idx) => (
                  <div key={idx} className="p-3 border border-red-200 rounded-md text-sm text-red-800 bg-red-50">
                    <span className="font-medium">Row {item.row}:</span> {item.field} - {item.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}