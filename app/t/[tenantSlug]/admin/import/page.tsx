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
import { Badge } from '@/components/ui/badge'
import { ImportBatchHistory } from '@/components/leads/ImportBatchHistory'

type ImportState = 'idle' | 'parsing' | 'preview' | 'confirming' | 'done'

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
  const inputRef = useRef<HTMLInputElement>(null)

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
    setState('idle')
    setError(null)
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
            <Button variant="outline" onClick={() => { setState('idle'); setFile(null); setParseResult(null) }}>
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
    </div>
  )
}