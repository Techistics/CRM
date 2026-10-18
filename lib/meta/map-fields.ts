/**
 * lib/meta/map-fields.ts
 *
 * Maps raw Meta Lead Ads field_data arrays to CRM field keys.
 *
 * The caller provides a `fieldMap` that declares which Meta field name maps to
 * which CRM key.  Any Meta fields not covered by the map are collected in
 * `unmapped` so callers can log or store them for debugging.
 *
 * A default field map is exported for forms that have no explicit configuration.
 *
 * Priority (highest → lowest):
 *   1. form field_map  (explicit, per-form)
 *   2. connection default_field_map  (explicit, per-connection fallback)
 *   3. keyword guess  (automatic, from question text)
 *   4. DEFAULT_FIELD_MAP  (hardcoded fallback)
 */

import type { MetaFieldData } from './graph'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Union of all CRM keys that Meta fields can map to. */
export type CrmKey =
  | 'fullName'
  | 'contactNumber'
  | 'email'
  | 'city'
  | 'country'
  | 'destinationCountry'
  | 'programOfInterest'
  | 'lastQualification'
  | 'grades'
  | 'tuitionBudget'
  | 'englishTest'

const VALID_CRM_KEYS = new Set<CrmKey>([
  'fullName',
  'contactNumber',
  'email',
  'city',
  'country',
  'destinationCountry',
  'programOfInterest',
  'lastQualification',
  'grades',
  'tuitionBudget',
  'englishTest',
])

/** { "<meta_field_name>": "<crm_key>" } */
export type FieldMap = Record<string, CrmKey>

export type MappedFields = Partial<Record<CrmKey, string>>

export interface MapMetaFieldsResult {
  mapped: MappedFields
  /** Meta field names that had no entry in fieldMap and no keyword match. */
  unmapped: Record<string, string>
  /**
   * Meta field names that were resolved purely by keyword guessing.
   * Shape: { "<meta_field_name>": "<crm_key>" }
   */
  guessed: Record<string, CrmKey>
}

// ─── Default field map ────────────────────────────────────────────────────────

/**
 * Used when a Meta form has no explicit field_map configured in the tenant
 * meta_connection.  Covers the most common Lead Ads field names.
 */
export const DEFAULT_FIELD_MAP: FieldMap = {
  full_name: 'fullName',
  first_name: 'fullName',
  last_name: 'fullName',
  phone_number: 'contactNumber',
  email: 'email',
  city: 'city',
}

// ─── Keyword rules ────────────────────────────────────────────────────────────

/**
 * Ordered list of keyword → CRM-key rules used when a question is not covered
 * by any explicit fieldMap entry.
 *
 * Normalisation before matching: lowercase the meta field name and replace
 * all underscores with spaces so "study_abroad" → "study abroad".
 *
 * First matching rule wins per question. Each CRM field gets at most one
 * guessed source.
 */
const KEYWORD_RULES: { keywords: RegExp; crmKey: CrmKey }[] = [
  {
    keywords: /country|destination|study in|abroad/,
    crmKey: 'destinationCountry',
  },
  {
    keywords: /course|program|subject|degree|field of study/,
    crmKey: 'programOfInterest',
  },
  {
    keywords: /qualification|education|last degree|level of study/,
    crmKey: 'lastQualification',
  },
  {
    keywords: /grade|marks|gpa|percentage|cgpa/,
    crmKey: 'grades',
  },
  {
    keywords: /budget|tuition|afford/,
    crmKey: 'tuitionBudget',
  },
  {
    keywords: /ielts|toefl|pte|english/,
    crmKey: 'englishTest',
  },
  {
    keywords: /city|location/,
    crmKey: 'city',
  },
]

/** Normalise a Meta field name for keyword matching. */
function normaliseKey(metaName: string): string {
  return metaName.toLowerCase().replace(/_/g, ' ')
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Maps a Meta `field_data` array to CRM fields using the provided `fieldMap`,
 * then runs a keyword guess over any still-unmapped questions.
 *
 * Rules applied (in order):
 *  1. For each field in `field_data`, look up its `name` in `fieldMap`.
 *  2. If the mapped crm_key is not a valid CRM key, treat it as unmapped.
 *  3. Take `values[0]`, trim whitespace, skip empty strings.
 *  4. fullName fallback: if `fieldMap` has no explicit `fullName` mapping but
 *     Meta sent `first_name`, `last_name`, or `full_name`, combine them.
 *  5. For questions still in `unmapped`, run keyword guessing:
 *     - Normalise the meta field name (lowercase, underscores → spaces).
 *     - Test each KEYWORD_RULES entry in order; first match wins per question.
 *     - Never overwrite a CRM field already mapped; each CRM field gets at
 *       most one guessed value.
 *     - Guessed mappings are recorded in the returned `guessed` object.
 *     - Truly unmatched questions remain in `unmapped`.
 *
 * @param fieldData  The `field_data` array from the Meta leadgen response.
 * @param fieldMap   Caller-supplied map, or `DEFAULT_FIELD_MAP` for unconfigured forms.
 */
export function mapMetaFields(
  fieldData: MetaFieldData[],
  fieldMap: FieldMap,
): MapMetaFieldsResult {
  const mapped: MappedFields = {}
  const unmapped: Record<string, string> = {}
  const guessed: Record<string, CrmKey> = {}

  // Build a lookup: metaFieldName → rawValue (trimmed, non-empty)
  const rawValues: Record<string, string> = {}
  for (const field of fieldData) {
    const val = field.values[0]?.trim() ?? ''
    if (val) rawValues[field.name] = val
  }

  // Check whether fieldMap has *any* entry whose crm_key resolves to fullName.
  const mapHasFullName = Object.values(fieldMap).some((v) => v === 'fullName')

  // ── Apply fieldMap entries ────────────────────────────────────────────────
  for (const [metaName, rawValue] of Object.entries(rawValues)) {
    const crmKey = fieldMap[metaName]

    if (!crmKey) {
      // No mapping defined — collect as unmapped (keyword guess runs later).
      unmapped[metaName] = rawValue
      continue
    }

    if (!VALID_CRM_KEYS.has(crmKey)) {
      // Unknown crm_key in the caller's fieldMap — ignore silently.
      unmapped[metaName] = rawValue
      continue
    }

    // Later entries win if the same crm_key appears multiple times
    // (e.g. first_name and last_name both map to fullName — handled below).
    mapped[crmKey] = rawValue
  }

  // ── fullName fallback / combination ──────────────────────────────────────
  // If the field map has no fullName mapping, attempt to construct the name
  // from the Meta standard name fields, prioritising full_name > first+last.
  if (!mapHasFullName) {
    const fullNameRaw = rawValues['full_name']
    const firstName = rawValues['first_name']
    const lastName = rawValues['last_name']

    if (fullNameRaw) {
      mapped.fullName = fullNameRaw
    } else if (firstName || lastName) {
      mapped.fullName = [firstName, lastName].filter(Boolean).join(' ')
    }
  } else if (!mapped.fullName) {
    // fieldMap declared fullName mappings but none resolved to a value;
    // still try the implicit name fields as a best-effort fallback.
    const firstName = rawValues['first_name']
    const lastName = rawValues['last_name']
    const fullNameRaw = rawValues['full_name']

    if (fullNameRaw) {
      mapped.fullName = fullNameRaw
    } else if (firstName || lastName) {
      mapped.fullName = [firstName, lastName].filter(Boolean).join(' ')
    }
  }

  // ── fullName via map: combine first_name + last_name when both map to fullName ─
  // If first_name and last_name are *both* in the fieldMap pointing to fullName,
  // the loop above would have set mapped.fullName to whichever came last in
  // field_data.  Re-combine them properly.
  const firstNameKey = Object.entries(fieldMap).find(
    ([k, v]) => v === 'fullName' && k === 'first_name',
  )?.[0]
  const lastNameKey = Object.entries(fieldMap).find(
    ([k, v]) => v === 'fullName' && k === 'last_name',
  )?.[0]

  if (firstNameKey && lastNameKey && rawValues[firstNameKey] && rawValues[lastNameKey]) {
    mapped.fullName = [rawValues[firstNameKey], rawValues[lastNameKey]].join(' ')
  }

  // ── Keyword guess over still-unmapped questions ───────────────────────────
  // Track which CRM keys have already been claimed by a keyword guess so that
  // each target field is only guessed once (first match wins).
  const guessedCrmKeys = new Set<CrmKey>()

  for (const [metaName, rawValue] of Object.entries(unmapped)) {
    const normalised = normaliseKey(metaName)

    for (const rule of KEYWORD_RULES) {
      if (!rule.keywords.test(normalised)) continue

      const crmKey = rule.crmKey

      // Never overwrite an already-mapped CRM field.
      if (mapped[crmKey] !== undefined) break

      // Each CRM field gets at most one guessed value.
      if (guessedCrmKeys.has(crmKey)) break

      // Apply the guess.
      mapped[crmKey] = rawValue
      guessed[metaName] = crmKey
      guessedCrmKeys.add(crmKey)
      delete unmapped[metaName]
      break
    }
  }

  return { mapped, unmapped, guessed }
}
