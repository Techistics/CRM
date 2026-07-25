'use client'

import type { SubStatusCustomField } from '@/lib/pipeline/sub-status-fields'

type Props = {
  fields: SubStatusCustomField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export default function SubStatusCustomFieldsForm({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null

  return (
    <div className="w-full space-y-3 sm:col-span-2">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
            {field.label} <span className="text-red-400">*</span>
          </label>
          {field.type === 'select' ? (
            <select
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 transition-shadow"
            >
              <option value="">— Select {field.label.toLowerCase()} —</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={values[field.key] ?? ''}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 transition-shadow"
            />
          )}
        </div>
      ))}
    </div>
  )
}
