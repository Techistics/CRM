/**
 * lib/meta/graph.ts
 *
 * Thin client for the Meta Graph API used by the Lead Ads webhook pipeline.
 * Fetches a single leadgen object by its leadgen_id.
 *
 * Auth strategy (per Meta docs):
 *   1. Send the page token in the Authorization: Bearer header.
 *   2. If Meta returns a non-200 that suggests the header was rejected,
 *      retry with the token appended as the `access_token` query parameter.
 *
 * Security:
 *   - The token is NEVER included in thrown errors or console output.
 *   - A 10-second hard timeout is enforced via AbortController.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? 'v23.0'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MetaFieldData {
  name: string
  values: string[]
}

export interface MetaLeadgenResponse {
  id: string
  created_time: string
  form_id: string
  field_data: MetaFieldData[]
}

export interface MetaCampaignResponse {
  id: string
  name: string
  status: string
}

export interface MetaAdAccountResponse {
  id: string
  accountId: string
  name: string
}

/** Shape of the error body Meta returns on failure. */
interface MetaErrorBody {
  error?: {
    message?: string
    type?: string
    code?: number
    fbtrace_id?: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildUrl(leadgenId: string, withToken?: string): string {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgenId)}`
  if (withToken) {
    const params = new URLSearchParams({ access_token: withToken })
    return `${base}?${params.toString()}`
  }
  return base
}

function makeController(): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  }
}

/**
 * Extracts a safe error message from a Meta error body.
 * Never leaks the access token — only uses fields already present in the body.
 */
async function extractMetaError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as MetaErrorBody
    const msg = body?.error?.message
    if (msg && typeof msg === 'string') return msg
  } catch {
    // ignore JSON parse failure
  }
  return res.statusText || 'Unknown Meta Graph error'
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetches a Meta Lead Ads leadgen object from the Graph API.
 *
 * @param leadgenId  The leadgen_id from the webhook change value.
 * @param pageToken  A valid Page access token. Never logged or thrown.
 *
 * @throws {Error} with `status` and Meta's `error.message` on non-200 responses.
 * @throws {Error} on network failure or 10-second timeout.
 */
export async function fetchLead(
  leadgenId: string,
  pageToken: string,
): Promise<MetaLeadgenResponse> {
  // ── Attempt 1: Authorization header (preferred) ──────────────────────────
  const { signal, clear } = makeController()

  let res: Response
  try {
    res = await fetch(buildUrl(leadgenId), {
      method: 'GET',
      headers: { Authorization: `Bearer ${pageToken}` },
      signal,
    })
  } catch (fetchErr) {
    clear()
    // Wrap network / abort errors without including the token.
    const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
    throw new Error(`[fetchLead] Network error fetching leadgen ${leadgenId}: ${msg}`)
  }
  clear()

  if (res.ok) {
    return res.json() as Promise<MetaLeadgenResponse>
  }

  // ── Determine whether to fall back ──────────────────────────────────────
  // Meta returns 190 (OAuthException) or 400 when the Bearer header is not
  // accepted.  Fall back for any 4xx to give the query-param strategy a chance.
  const shouldFallback = res.status >= 400 && res.status < 500

  if (!shouldFallback) {
    const metaMsg = await extractMetaError(res)
    throw new Error(`[fetchLead] Graph API error ${res.status} for leadgen ${leadgenId}: ${metaMsg}`)
  }

  // ── Attempt 2: access_token query param (fallback) ───────────────────────
  const { signal: signal2, clear: clear2 } = makeController()

  let res2: Response
  try {
    res2 = await fetch(buildUrl(leadgenId, pageToken), {
      method: 'GET',
      signal: signal2,
    })
  } catch (fetchErr2) {
    clear2()
    const msg = fetchErr2 instanceof Error ? fetchErr2.message : String(fetchErr2)
    throw new Error(
      `[fetchLead] Network error on fallback fetch for leadgen ${leadgenId}: ${msg}`,
    )
  }
  clear2()

  if (res2.ok) {
    return res2.json() as Promise<MetaLeadgenResponse>
  }

  const metaMsg2 = await extractMetaError(res2)
  throw new Error(
    `[fetchLead] Graph API error ${res2.status} for leadgen ${leadgenId}: ${metaMsg2}`,
  )
}

// ─── Name fetchers ────────────────────────────────────────────────────────────

/**
 * Fetches the `name` field of a Meta lead-gen form.
 * GET /{GRAPH_VERSION}/{formId}?fields=name
 *
 * @param formId     The Meta form ID.
 * @param pageToken  A valid Page access token. Never logged or thrown.
 * @returns The form name string, or null on any failure.
 */
export async function fetchFormName(
  formId: string,
  pageToken: string,
): Promise<string | null> {
  return fetchEntityName(formId, pageToken)
}

/**
 * Fetches the `name` field of a Meta ad.
 * GET /{GRAPH_VERSION}/{adId}?fields=name
 *
 * @param adId       The Meta ad ID.
 * @param pageToken  A valid Page access token. Never logged or thrown.
 * @returns The ad name string, or null on any failure.
 */
export async function fetchAdName(
  adId: string,
  pageToken: string,
): Promise<string | null> {
  return fetchEntityName(adId, pageToken)
}

/**
 * Shared implementation for fetchFormName / fetchAdName.
 * Returns null instead of throwing — callers treat name lookups as non-fatal.
 */
async function fetchEntityName(
  entityId: string,
  pageToken: string,
): Promise<string | null> {
  const base = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(entityId)}`
  const params = new URLSearchParams({ fields: 'name' })

  // ── Attempt 1: Authorization header ──────────────────────────────────────
  const { signal, clear } = makeController()
  let res: Response
  try {
    res = await fetch(`${base}?${params.toString()}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${pageToken}` },
      signal,
    })
  } catch {
    clear()
    return null
  }
  clear()

  if (res.ok) {
    try {
      const body = (await res.json()) as { name?: string }
      return typeof body.name === 'string' ? body.name : null
    } catch {
      return null
    }
  }

  // ── Attempt 2: access_token query param (fallback for 4xx) ───────────────
  const shouldFallback = res.status >= 400 && res.status < 500
  if (!shouldFallback) {
    return null
  }

  const params2 = new URLSearchParams({ fields: 'name', access_token: pageToken })
  const { signal: signal2, clear: clear2 } = makeController()
  let res2: Response
  try {
    res2 = await fetch(`${base}?${params2.toString()}`, {
      method: 'GET',
      signal: signal2,
    })
  } catch {
    clear2()
    return null
  }
  clear2()

  if (res2.ok) {
    try {
      const body2 = (await res2.json()) as { name?: string }
      return typeof body2.name === 'string' ? body2.name : null
    } catch {
      return null
    }
  }

  return null
}

/**
 * Fetches the campaign associated with a Meta ad.
 * Returns null on any API, network, timeout, or response parsing failure.
 */
export async function fetchAdCampaign(
  adId: string,
  pageToken: string,
): Promise<MetaCampaignResponse | null> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(adId)}`,
  )
  url.searchParams.set('fields', 'campaign{id,name,status}')
  const result = await fetchGraphJson<{ campaign?: unknown }>(url, pageToken)
  if (!result || !result.campaign || typeof result.campaign !== 'object') return null

  const campaign = result.campaign as Record<string, unknown>
  if (
    typeof campaign.id !== 'string' ||
    typeof campaign.name !== 'string' ||
    typeof campaign.status !== 'string'
  ) {
    return null
  }

  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
  }
}

/**
 * Fetches every campaign in a Meta ad account, following Graph API paging.
 * Returns an empty array on any API, network, timeout, or response parsing failure.
 */
export async function fetchAdAccountCampaigns(
  adAccountId: string,
  pageToken: string,
): Promise<MetaCampaignResponse[]> {
  const campaigns = await fetchAdAccountCampaignStatuses(adAccountId, pageToken)
  return campaigns?.filter((campaign) => campaign.status.toUpperCase() === 'ACTIVE') ?? []
}

/**
 * Fetches campaign status values for synchronization. Returns null on failure
 * so callers can distinguish an unavailable response from an empty account.
 */
export async function fetchAdAccountCampaignStatuses(
  adAccountId: string,
  pageToken: string,
): Promise<MetaCampaignResponse[] | null> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/act_${encodeURIComponent(adAccountId)}/campaigns`,
  )
  url.searchParams.set('fields', 'id,name,status')
  url.searchParams.set('limit', '100')

  const campaigns: MetaCampaignResponse[] = []
  const visited = new Set<string>()
  let nextUrl: URL | null = url

  while (nextUrl) {
    if (
      nextUrl.protocol !== 'https:' ||
      nextUrl.hostname !== 'graph.facebook.com' ||
      visited.has(nextUrl.toString())
    ) {
      return null
    }
    visited.add(nextUrl.toString())

    const result: { data?: unknown; paging?: { next?: unknown } } | null =
      await fetchGraphJson<{ data?: unknown; paging?: { next?: unknown } }>(
        nextUrl,
        pageToken,
      )
    if (!result || !Array.isArray(result.data)) return null

    for (const value of result.data) {
      if (!value || typeof value !== 'object') return null
      const campaign = value as Record<string, unknown>
      if (
        typeof campaign.id !== 'string' ||
        typeof campaign.name !== 'string' ||
        typeof campaign.status !== 'string'
      ) {
        return null
      }
      campaigns.push({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
      })
    }

    const next: unknown = result.paging?.next
    if (next === undefined) {
      nextUrl = null
    } else if (typeof next === 'string') {
      try {
        nextUrl = new URL(next, nextUrl)
      } catch {
        return null
      }
    } else {
      return null
    }
  }

  return campaigns
}

/**
 * Lists ad accounts available to the page token, following Graph API paging.
 * Returns an empty array on any API, network, timeout, or response parsing failure.
 */
export async function fetchAdAccounts(
  pageToken: string,
): Promise<MetaAdAccountResponse[]> {
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts`)
  url.searchParams.set('fields', 'id,account_id,name')
  url.searchParams.set('limit', '50')

  const accounts: MetaAdAccountResponse[] = []
  const visited = new Set<string>()
  let nextUrl: URL | null = url

  while (nextUrl) {
    if (
      nextUrl.protocol !== 'https:' ||
      nextUrl.hostname !== 'graph.facebook.com' ||
      visited.has(nextUrl.toString())
    ) {
      return []
    }
    visited.add(nextUrl.toString())

    const result = await fetchGraphJson<{
      data?: unknown
      paging?: { next?: unknown }
    }>(nextUrl, pageToken)
    if (!result || !Array.isArray(result.data)) return []

    for (const value of result.data) {
      if (!value || typeof value !== 'object') return []
      const account = value as Record<string, unknown>
      if (
        typeof account.id !== 'string' ||
        typeof account.account_id !== 'string' ||
        typeof account.name !== 'string'
      ) {
        return []
      }
      accounts.push({
        id: account.id,
        accountId: account.account_id,
        name: account.name,
      })
    }

    const next: unknown = result.paging?.next
    if (next === undefined) {
      nextUrl = null
    } else if (typeof next === 'string') {
      try {
        nextUrl = new URL(next, nextUrl)
      } catch {
        return []
      }
    } else {
      return []
    }
  }

  return accounts
}

async function fetchGraphJson<T>(url: URL, pageToken: string): Promise<T | null> {
  const { signal, clear } = makeController()
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${pageToken}` },
      signal,
    })
  } catch {
    clear()
    return null
  }
  clear()

  if (response.ok) {
    try {
      return (await response.json()) as T
    } catch {
      return null
    }
  }

  if (response.status < 400 || response.status >= 500) return null

  const fallbackUrl = new URL(url)
  fallbackUrl.searchParams.set('access_token', pageToken)
  const { signal: fallbackSignal, clear: clearFallback } = makeController()
  let fallbackResponse: Response
  try {
    fallbackResponse = await fetch(fallbackUrl, {
      method: 'GET',
      signal: fallbackSignal,
    })
  } catch {
    clearFallback()
    return null
  }
  clearFallback()

  if (!fallbackResponse.ok) return null
  try {
    return (await fallbackResponse.json()) as T
  } catch {
    return null
  }
}
