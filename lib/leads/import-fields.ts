export type ImportFieldKey =
  | 'fullName'
  | 'contactNumber'
  | 'email'
  | 'city'
  | 'country'
  | 'stage'
  | 'source'
  | 'intakeMonth'
  | 'intakeYear'
  | 'lastQualification'
  | 'grades'
  | 'destinationCountry'
  | 'programOfInterest'
  | 'tuitionBudget'
  | 'englishTest'
  | 'dealValue'
  | 'dealCurrency'
  | 'activity'
  | 'skip'

export type ImportFieldDef = {
  key: ImportFieldKey
  label: string
  required?: boolean
}

export const CRM_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: 'fullName', label: 'Full Name', required: true },
  { key: 'contactNumber', label: 'Contact Number' },
  { key: 'email', label: 'Email' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'stage', label: 'Pipeline Stage' },
  { key: 'source', label: 'Source' },
  { key: 'intakeMonth', label: 'Intake Month' },
  { key: 'intakeYear', label: 'Intake Year' },
  { key: 'lastQualification', label: 'Qualification' },
  { key: 'grades', label: 'Grades' },
  { key: 'destinationCountry', label: 'Destination Country' },
  { key: 'programOfInterest', label: 'Program of Interest' },
  { key: 'tuitionBudget', label: 'Tuition Budget' },
  { key: 'englishTest', label: 'English Test' },
  { key: 'dealValue', label: 'Deal Value' },
  { key: 'dealCurrency', label: 'Deal Currency' },
  { key: 'activity', label: 'Notes (Activity Log)' },
  { key: 'skip', label: 'Skip / Ignore' },
]

/** Legacy header aliases → CRM field key */
export const IMPORT_COLUMN_ALIASES: Record<string, ImportFieldKey> = {
  'full name': 'fullName',
  fullname: 'fullName',
  name: 'fullName',
  contact: 'contactNumber',
  phone: 'contactNumber',
  contactnumber: 'contactNumber',
  contact_number: 'contactNumber',
  email: 'email',
  city: 'city',
  country: 'country',
  stage: 'stage',
  source: 'source',
  notes: 'activity',
  note: 'activity',
  intake: 'intakeMonth',
  'intake month': 'intakeMonth',
  intake_month: 'intakeMonth',
  intakemonth: 'intakeMonth',
  'intake year': 'intakeYear',
  intake_year: 'intakeYear',
  intakeyear: 'intakeYear',
  qualification: 'lastQualification',
  last_qualification: 'lastQualification',
  lastqualification: 'lastQualification',
  what_is_your_current_level_of_education_and_field_of_study: 'lastQualification',
  'what_is_your_current_level_of_education_and_field_of_study?': 'lastQualification',
  grades: 'grades',
  gpa: 'grades',
  'what_is_your_approximate_academic_percentage_/_gpa': 'grades',
  'what_is_your_approximate_academic_percentage_/_gpa?': 'grades',
  destination: 'destinationCountry',
  'destination country': 'destinationCountry',
  destination_country: 'destinationCountry',
  'study destination': 'destinationCountry',
  study_destination: 'destinationCountry',
  destinationcountry: 'destinationCountry',
  program: 'programOfInterest',
  programme: 'programOfInterest',
  'program of interest': 'programOfInterest',
  program_of_interest: 'programOfInterest',
  'programme of interest': 'programOfInterest',
  programofinterest: 'programOfInterest',
  'tuition budget': 'tuitionBudget',
  tuition_budget: 'tuitionBudget',
  tuitionbudget: 'tuitionBudget',
  'estimated tuition budget': 'tuitionBudget',
  what_is_your_estimated_tuition_budget: 'tuitionBudget',
  'what_is_your_estimated_tuition_budget?': 'tuitionBudget',
  'english test': 'englishTest',
  english_test: 'englishTest',
  englishtest: 'englishTest',
  'english language test': 'englishTest',
  have_you_completed_an_english_language_test: 'englishTest',
  'have_you_completed_an_english_language_test?': 'englishTest',
  'deal value': 'dealValue',
  deal_value: 'dealValue',
  dealvalue: 'dealValue',
  'deal currency': 'dealCurrency',
  deal_currency: 'dealCurrency',
  dealcurrency: 'dealCurrency',
  currency: 'dealCurrency',
}

export function normalizeImportHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, ' ')
}

export function suggestColumnMapping(headers: string[]): Record<string, ImportFieldKey> {
  const mapping: Record<string, ImportFieldKey> = {}
  const usedFields = new Set<ImportFieldKey>()

  for (const header of headers) {
    const normalized = normalizeImportHeader(header)
    const alias = IMPORT_COLUMN_ALIASES[normalized]
    if (alias && alias !== 'skip' && !usedFields.has(alias)) {
      mapping[header] = alias
      usedFields.add(alias)
      continue
    }

    const direct = CRM_IMPORT_FIELDS.find(
      (f) => f.key !== 'skip' && f.key !== 'activity' && normalizeImportHeader(f.label) === normalized,
    )
    if (direct && !usedFields.has(direct.key)) {
      mapping[header] = direct.key
      usedFields.add(direct.key)
      continue
    }

    mapping[header] = 'skip'
  }

  return mapping
}

export function importFieldLabel(key: ImportFieldKey): string {
  return CRM_IMPORT_FIELDS.find((f) => f.key === key)?.label ?? key
}