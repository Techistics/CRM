export type SubStatusFieldType = 'select' | 'text'

export type SubStatusCustomField = {
  key: string
  label: string
  type: SubStatusFieldType
  options?: string[]
}

export function slugFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
}

export function normalizeCustomFields(raw: unknown): SubStatusCustomField[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const fields: SubStatusCustomField[] = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const label = typeof row.label === 'string' ? row.label.trim() : ''
    if (!label) continue

    const type: SubStatusFieldType = row.type === 'text' ? 'text' : 'select'
    let key = typeof row.key === 'string' && row.key.trim() ? row.key.trim() : slugFieldKey(label)
    if (!key) key = `field_${fields.length + 1}`
    while (seen.has(key)) key = `${key}_${fields.length + 1}`
    seen.add(key)

    const field: SubStatusCustomField = { key, label, type }
    if (type === 'select') {
      const options = Array.isArray(row.options)
        ? row.options.map((o) => String(o).trim()).filter(Boolean)
        : []
      field.options = options
    }
    fields.push(field)
  }

  return fields
}

export function buildCustomFieldsFromDraft(
  draft: Array<{ label: string; type: SubStatusFieldType; optionsText: string }>,
): SubStatusCustomField[] {
  const seen = new Set<string>()
  const fields: SubStatusCustomField[] = []

  for (const row of draft) {
    const label = row.label.trim()
    if (!label) continue

    let key = slugFieldKey(label)
    if (!key) key = `field_${fields.length + 1}`
    while (seen.has(key)) key = `${key}_${fields.length + 1}`
    seen.add(key)

    const field: SubStatusCustomField = { key, label, type: row.type }
    if (row.type === 'select') {
      field.options = row.optionsText
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    }
    fields.push(field)
  }

  return fields
}

export function customFieldsToDraft(
  fields: SubStatusCustomField[],
): Array<{ label: string; type: SubStatusFieldType; optionsText: string }> {
  return fields.map((f) => ({
    label: f.label,
    type: f.type,
    optionsText: f.type === 'select' ? (f.options ?? []).join(', ') : '',
  }))
}

export function normalizeFieldValues(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v.trim()
  }
  return out
}

export function validateFieldValues(
  fields: SubStatusCustomField[],
  values: Record<string, string>,
): string | null {
  for (const field of fields) {
    const value = values[field.key]?.trim() ?? ''
    if (!value) return `${field.label} is required`
    if (field.type === 'select' && field.options?.length) {
      if (!field.options.includes(value)) return `${field.label} has an invalid option`
    }
  }
  return null
}

export function areCustomFieldsComplete(
  fields: SubStatusCustomField[],
  values: Record<string, string>,
): boolean {
  return validateFieldValues(fields, values) === null
}
