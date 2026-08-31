import { z } from 'zod'

export const applicationUpsertBodySchema = z
  .object({
    universityName: z.string().trim().min(1, 'University name is required').max(500),
    courseName: z.string().trim().min(1, 'Course name is required').max(500),
    source: z.enum(['direct_uni', 'partner_portal']),
    partnerPortalName: z.string().trim().max(500).optional().nullable(),
    applicationStatus: z.enum(['tag', 'new_application', 'intake']),
    intakeMonth: z.number().int().min(1).max(12).optional().nullable(),
    intakeYear: z.number().int().min(2000).max(2200).optional().nullable(),
  })
  .refine(
    (d) =>
      d.source !== 'partner_portal' || (typeof d.partnerPortalName === 'string' && d.partnerPortalName.trim().length > 0),
    {
      message: 'Partner Portal Name is required when source is Partner Portal',
      path: ['partnerPortalName'],
    },
  )
  .refine(
    (d) => d.applicationStatus !== 'intake' || (d.intakeMonth != null && d.intakeYear != null),
    {
      message: 'Intake month and year are required when status is Intake',
      path: ['intakeMonth'],
    },
  )
