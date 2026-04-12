import { DEFAULT_LEAD_COUNTRY } from '@/constants/lead-defaults'

export type CountryDocumentTemplate = {
  key: string
  label: string
  required: boolean
}

const DEFAULT_TEMPLATE: CountryDocumentTemplate[] = [
  { key: 'passport', label: 'Passport', required: true },
  { key: 'resume', label: 'Resume / CV', required: true },
  { key: 'academic_transcripts', label: 'Academic Transcripts', required: true },
  { key: 'financial_proof', label: 'Financial Proof', required: true },
]

export const COUNTRY_DOCUMENT_CHECKLISTS: Record<
  string,
  CountryDocumentTemplate[]
> = {
  [DEFAULT_LEAD_COUNTRY]: DEFAULT_TEMPLATE,
  India: DEFAULT_TEMPLATE,
  Canada: [
    ...DEFAULT_TEMPLATE,
    { key: 'ielts', label: 'IELTS / Language Score', required: true },
    { key: 'sop', label: 'Statement of Purpose', required: true },
  ],
  USA: [
    ...DEFAULT_TEMPLATE,
    { key: 'toefl', label: 'TOEFL / Language Score', required: false },
    { key: 'gre_gmat', label: 'GRE / GMAT (if required)', required: false },
  ],
  UK: [
    ...DEFAULT_TEMPLATE,
    { key: 'ukvi', label: 'UKVI Documents', required: false },
    { key: 'personal_statement', label: 'Personal Statement', required: true },
  ],
}

export function getChecklistTemplateForCountry(country: string | null | undefined) {
  const key = country?.trim()
  if (!key) return COUNTRY_DOCUMENT_CHECKLISTS[DEFAULT_LEAD_COUNTRY] ?? DEFAULT_TEMPLATE
  return COUNTRY_DOCUMENT_CHECKLISTS[key] ?? DEFAULT_TEMPLATE
}
