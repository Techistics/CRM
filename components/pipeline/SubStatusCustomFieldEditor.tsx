'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { SubStatusFieldType } from '@/lib/pipeline/sub-status-fields'

export type CustomFieldDraft = {
  label: string
  type: SubStatusFieldType
  optionsText: string
}

type Props = {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  fields: CustomFieldDraft[]
  onFieldsChange: (fields: CustomFieldDraft[]) => void
}

export default function SubStatusCustomFieldEditor({
  enabled,
  onEnabledChange,
  fields,
  onFieldsChange,
}: Props) {
  const updateField = (index: number, patch: Partial<CustomFieldDraft>) => {
    onFieldsChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)))
  }

  const removeField = (index: number) => {
    onFieldsChange(fields.filter((_, i) => i !== index))
  }

  const addField = () => {
    onFieldsChange([...fields, { label: '', type: 'select', optionsText: '' }])
  }

  return (
    <div className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-3">
      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Custom fields</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onEnabledChange(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
            enabled ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform mt-1 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {enabled && (
        <div className="space-y-2">
          {fields.length === 0 && (
            <p className="text-xs text-slate-400">Add dropdowns or text boxes for this sub-status.</p>
          )}

          {fields.map((field, index) => (
            <div
              key={index}
              className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-800/60"
            >
              <div className="flex items-start gap-2">
                <input
                  value={field.label}
                  onChange={(e) => updateField(index, { label: e.target.value })}
                  placeholder="Field label (e.g. University)"
                  className="flex-1 h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="p-2 text-slate-400 hover:text-red-500"
                  aria-label="Remove field"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <select
                value={field.type}
                onChange={(e) =>
                  updateField(index, { type: e.target.value as SubStatusFieldType })
                }
                className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
              >
                <option value="select">Dropdown</option>
                <option value="text">Text box</option>
              </select>

              {field.type === 'select' && (
                <input
                  value={field.optionsText}
                  onChange={(e) => updateField(index, { optionsText: e.target.value })}
                  placeholder="Options (comma separated)"
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100"
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addField}
            className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Add field
          </button>
        </div>
      )}
    </div>
  )
}
