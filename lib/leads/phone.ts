/**
 * lib/leads/phone.ts
 *
 * Single source of truth for phone-number normalisation. Every write path that
 * touches `leads.contact_number` must run the caller-supplied value through
 * `normalizePhone` so the column only ever holds E.164 strings or NULL.
 */

import { sql, type SQL } from 'drizzle-orm'
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js'

import { leads } from '@/db/schema'

const PK_DIALLING_CODE = '+92'
/** Shortest length we still consider a real phone number. */
const MIN_DIGITS = 7
/** Total digit count of a Pakistani number written with the country code. */
const PK_WITH_COUNTRY_CODE_DIGITS = 12
/** Total digit count of a Pakistani number written with a leading trunk 0. */
const PK_NATIONAL_DIGITS = 11
/** Total digit count of a Pakistani mobile number without the trunk 0. */
const PK_MOBILE_DIGITS = 10
/** Shortest stored digit string that can still be a Pakistani number. */
const PK_STORED_DIGITS_MIN = 10
/** Longest stored digit string that can still be a Pakistani number. */
const PK_STORED_DIGITS_MAX = 13

/**
 * Normalises a raw phone number to E.164 (e.g. "+923224971053").
 *
 * Junk input ("phone", "xxxxxxx", "t", …) always yields `null`; the raw string
 * is never returned. Pakistan (+92) formats are recognised without needing a
 * country hint, anything else must already be a valid international number.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null

  const trimmed = raw.trim()
  if (trimmed === '') return null

  // Meta sometimes ships numbers as "p:+923001234567".
  const withoutPrefix = trimmed.replace(/^p:/i, '')
  const stripped = withoutPrefix.replace(/[\s\-().]/g, '')
  const digits = stripped.replace(/\D/g, '')

  if (digits.length < MIN_DIGITS) return null

  // Already international (+92 …).
  if (stripped.startsWith(PK_DIALLING_CODE)) return `+${digits}`

  // International prefix written as 00 (0092 300 1234567).
  if (digits.startsWith('0092')) return `${PK_DIALLING_CODE}${digits.slice(4)}`

  // 923001234567 — country code without the "+".
  if (digits.startsWith('92') && digits.length === PK_WITH_COUNTRY_CODE_DIGITS) {
    return `+${digits}`
  }

  // 03001234567 — national format with the trunk 0.
  if (digits.startsWith('0') && digits.length === PK_NATIONAL_DIGITS) {
    return `${PK_DIALLING_CODE}${digits.slice(1)}`
  }

  // 3001234567 — mobile number stripped of any prefix.
  if (digits.length === PK_MOBILE_DIGITS && digits.startsWith('3')) {
    return `${PK_DIALLING_CODE}${digits}`
  }

  // Any other country, but only when it is already valid in E.164 form.
  if (stripped.startsWith('+')) {
    try {
      if (isValidPhoneNumber(stripped)) {
        return parsePhoneNumber(stripped).format('E.164')
      }
    } catch {
      return null
    }
  }

  return null
}

// ─── Format-tolerant duplicate matching ───────────────────────────────────────

/**
 * Digits-only view of `leads.contact_number` (legacy rows are not necessarily
 * stored in E.164 form: "0325 1234567", "92-325-1234567", "p:+92…", …).
 *
 * Written as '\\D' in the JS source so Postgres receives the `\D` class.
 */
const storedDigitsSql = sql`regexp_replace(coalesce(${leads.contactNumber}, ''), '\\D', '', 'g')`

/**
 * SQL predicate matching a normalised (E.164) number against
 * `leads.contact_number`, regardless of how the stored row was written.
 *
 * - `null` input: nothing to compare, returns `null` so callers skip the check.
 * - Pakistani (`+92…`): compares the last 10 digits and accepts any stored form
 *   whose digits are 10–13 long and start with 92 / 0 / 3. This makes
 *   `+923001234567`, `0325…`, `92 325…`, `p:+92…` and `325…` the same number.
 * - Any other country: exact match on the full digit string only. Foreign
 *   numbers are never matched on their last 10 digits.
 *
 * Callers must combine the fragment with `tenantId` and `isNull(deletedAt)`.
 */
export function phoneMatchCondition(normalized: string | null): SQL | null {
  if (normalized == null) return null

  const digits = normalized.replace(/\D/g, '')
  if (digits.length === 0) return null

  if (normalized.trim().startsWith(PK_DIALLING_CODE)) {
    const last10 = digits.slice(-PK_MOBILE_DIGITS)
    return sql`(
      right(${storedDigitsSql}, 10) = ${last10}
      and length(${storedDigitsSql}) between 10 and 13
      and (
        left(${storedDigitsSql}, 2) = '92'
        or left(${storedDigitsSql}, 1) = '0'
        or left(${storedDigitsSql}, 1) = '3'
      )
    )`
  }

  return sql`${storedDigitsSql} = ${digits}`
}

/**
 * JS mirror of `phoneMatchCondition`, used when rows already fetched from the
 * DB have to be paired back to the numbers being written. Both sides must run
 * through this helper so the pairing uses the same rule as the SQL predicate.
 *
 * Pakistani numbers collapse to their last 10 digits; everything else keeps
 * its full digit string.
 */
export function phoneMatchKey(raw: string | null | undefined): string | null {
  if (raw == null) return null

  const trimmed = raw.trim()
  if (trimmed === '') return null

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 0) return null

  // Incoming E.164 number (+92 …).
  if (trimmed.startsWith(PK_DIALLING_CODE)) return digits.slice(-PK_MOBILE_DIGITS)

  // Stored national / loose Pakistani form (0325…, 92 325…, 325…).
  const looksPakistani =
    digits.length >= PK_STORED_DIGITS_MIN &&
    digits.length <= PK_STORED_DIGITS_MAX &&
    (digits.startsWith('92') || digits.startsWith('0') || digits.startsWith('3'))

  return looksPakistani ? digits.slice(-PK_MOBILE_DIGITS) : digits
}
