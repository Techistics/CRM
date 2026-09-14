'use client'

import {
  CRM_IMPORT_FIELDS,
  importFieldLabel,
  type ImportFieldKey,
} from '@/lib/leads/import-fields'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Props = {
  headers: string[]
  mapping: Record<string, ImportFieldKey>
  onMappingChange: (header: string, fieldKey: ImportFieldKey) => void
}

export function ImportColumnMapper({ headers, mapping, onMappingChange }: Props) {
  if (headers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No columns found in this file. Check that the first row contains headers.
      </p>
    )
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-b bg-muted/40 p-3 text-xs font-semibold uppercase tracking-wide">
        <span>CSV Column</span>
        <span>Map To</span>
        <span>CRM Field</span>
      </div>
      <div className="divide-y">
        {headers.map((header) => {
          const selected = mapping[header] ?? 'skip'
          return (
            <div
              key={header}
              className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center p-3"
            >
              <span className="text-sm font-medium truncate" title={header}>
                {header}
              </span>
              <Select
                value={selected}
                onValueChange={(value) => onMappingChange(header, value as ImportFieldKey)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select field" />
                </SelectTrigger>
                <SelectContent>
                  {CRM_IMPORT_FIELDS.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                      {field.required ? ' *' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground truncate">
                {importFieldLabel(selected)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
