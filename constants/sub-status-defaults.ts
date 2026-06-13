export type SubStatusType = 'in_progress' | 'closed_lost' | 'defer'

export type DefaultSubStatus = {
  label: string
  type: SubStatusType
  closedActions: string[]
}

export const DEFAULT_SUB_STATUSES: Record<string, DefaultSubStatus[]> = {
  new_lead: [
    { label: 'In Progress', type: 'in_progress', closedActions: ['No contact attempted', 'Contact attempted', 'Connected'] },
    { label: 'Closed Lost', type: 'closed_lost', closedActions: ['Did not intend to enquire', 'Do not contact', 'Duplicate', 'Fake', 'Insufficient English', 'Insufficient finances', 'Invalid contact details', 'No response', 'Not going overseas', 'Seeking job/migration', 'Test'] },
  ],
  mql: [
    { label: 'In Progress', type: 'in_progress', closedActions: ['No contact attempted', 'Contact attempted', 'Connected', 'Counselling Appointment fixed'] },
    { label: 'Closed Lost', type: 'closed_lost', closedActions: ['Did not intend to enquire', 'Do not contact', 'Insufficient English', 'Insufficient finances', 'No response', 'Not commissionable', 'Not going overseas', 'Seeking job/migration', 'Using another agent', 'Will apply directly'] },
  ],
  sql: [
    { label: 'In Progress', type: 'in_progress', closedActions: ['First Counselling', 'Shortlisting Done', 'Documents Awaited', 'Documents Received'] },
    { label: 'Closed Lost', type: 'closed_lost', closedActions: ['Do not contact', 'Financial issue', 'Insufficient English', 'No response', 'Not commissionable', 'Not going overseas', 'Paid services only', 'Seeking job/migration', 'Using another agent', 'Will apply directly', 'GTE non-compliant (Aus only)'] },
  ],
  application_pending: [
    { label: 'In Progress', type: 'in_progress', closedActions: ['Application Requested', 'Application on Hold-App Team', 'Application on Hold-Consultant'] },
    { label: 'Closed Lost', type: 'closed_lost', closedActions: ['Do not contact', 'Financial issue', 'Insufficient English', 'No response', 'Not commissionable', 'Not going overseas', 'Paid services only', 'Using another agent', 'Will apply directly', 'GTE non-compliant (Aus only)'] },
  ],
  applicant: [
    { label: 'In Progress', type: 'in_progress', closedActions: ['Application Sent', 'Offer Received-Conditional', 'Offer Received-Unconditional', 'Offer Accepted'] },
    { label: 'Closed Lost', type: 'closed_lost', closedActions: ['All Rejections', 'Do not contact', 'Financial issue', 'Insufficient academics', 'Insufficient English', 'No response', 'Not commissionable', 'Not going overseas', 'Paid services only', 'Using another agent', 'Will apply directly', 'GTE non-compliant (Aus only)'] },
    { label: 'Defer', type: 'defer', closedActions: [] },
  ],
  final_choice: [
    { label: 'Closed Lost', type: 'closed_lost', closedActions: ['Do not contact', 'Failed credibility interviews', 'Financial issue', 'Insufficient academics', 'Insufficient English', 'No response', 'Not commissionable', 'Not going overseas', 'Paid services only', 'Using another agent', 'Visa Rejected', 'GTE non-compliant (Aus only)'] },
    { label: 'Defer', type: 'defer', closedActions: [] },
  ],
}

// Positional defaults — index 0 = stage 1, index 1 = stage 2, etc.
export const POSITIONAL_SUB_STATUSES: DefaultSubStatus[][] = [
  DEFAULT_SUB_STATUSES['new_lead'],           // position 0
  DEFAULT_SUB_STATUSES['mql'],                // position 1
  DEFAULT_SUB_STATUSES['sql'],                // position 2
  DEFAULT_SUB_STATUSES['application_pending'],// position 3
  DEFAULT_SUB_STATUSES['applicant'],          // position 4
  DEFAULT_SUB_STATUSES['final_choice'],       // position 5
  // positions 6+ → empty array (admin fills manually)
]

export function getDefaultsForPosition(index: number): DefaultSubStatus[] {
  return POSITIONAL_SUB_STATUSES[index] ?? []
}