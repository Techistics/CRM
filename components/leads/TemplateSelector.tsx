'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type TemplateRow = {
  id: string
  tenantId: string
  name: string
  stage: string | null
  message: string
  createdBy: string | null
  createdAt: string
}

export function TemplateSelector({
  tenantSlug,
  leadName,
  leadCountry,
  leadProgramme,
  currentStage,
  onSelect,
}: {
  leadId: string
  tenantSlug: string
  leadName: string
  leadCountry: string | null
  leadProgramme: string | null
  currentStage: string
  onSelect?: (message: string) => void
}) {
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('tenantSlug', tenantSlug)
      params.set('stage', currentStage)
      const res = await fetch(`/api/templates?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to load templates')
      setTemplates((json?.data?.templates ?? []) as TemplateRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!showTemplates) return
    void fetchTemplates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTemplates, currentStage])

  const firstName = useMemo(() => leadName.split(' ')[0] ?? leadName, [leadName])

  const rendered = useMemo(() => {
    return templates.map((template) => {
      const message = template.message
        .replace('{name}', firstName)
        .replace('{country}', leadCountry ?? 'your preferred country')
        .replace('{programme}', leadProgramme ?? 'your programme')
      return { template, message }
    })
  }, [templates, firstName, leadCountry, leadProgramme])

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => setShowTemplates((s) => !s)}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        Templates
      </Button>

      {showTemplates ? (
        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading templates…
            </div>
          ) : error ? (
            <div className="text-xs text-destructive">{error}</div>
          ) : rendered.length === 0 ? (
            <div className="text-xs text-muted-foreground">No templates for this stage yet.</div>
          ) : (
            rendered.map(({ template, message }) => (
              <div
                key={template.id}
                onClick={() => onSelect?.(message)}
                className={cn(
                  'p-2 rounded-lg border hover:bg-muted/50 cursor-pointer',
                  'group transition-colors',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{message}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={async () => {
                      await navigator.clipboard.writeText(message)
                      toast.success('Copied to clipboard!')
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

