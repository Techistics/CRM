import { z } from 'zod'

const optionalEmail = z
  .union([z.string().email().max(320), z.literal(''), z.null()])
  .optional()

export const leadCreateBodySchema = z.object({
  fullName: z.string().trim().min(1, 'fullName is required').max(500),
  stage: z.string().min(1).default('new_lead'),
  contactNumber: z.string().trim().max(80).optional().nullable(),
  email: optionalEmail,
  city: z.string().trim().max(200).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  lastQualification: z.string().trim().max(500).optional().nullable(),
  grades: z.string().trim().max(200).optional().nullable(),
  source: z.string().trim().max(120).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  dealValue: z.coerce.number().positive().optional().nullable(),
  dealCurrency: z.enum(['USD', 'GBP', 'EUR', 'PKR', 'AED', 'CAD', 'AUD']).default('USD'),
  force: z.boolean().optional(),
  notes: z.string().optional(),
}).strict()

export const leadPatchBodySchema = z
  .object({
    fullName: z.string().trim().min(1).max(500).optional(),
    email: optionalEmail,
    contactNumber: z.string().trim().max(80).optional().nullable(),
    city: z.string().trim().max(200).optional().nullable(),
    country: z.string().trim().max(120).optional().nullable(),
    lastQualification: z.string().trim().max(500).optional().nullable(),
    grades: z.string().trim().max(200).optional().nullable(),
    dealValue: z.coerce.number().positive().optional().nullable(),
    dealCurrency: z.enum(['USD', 'GBP', 'EUR', 'PKR', 'AED', 'CAD', 'AUD']).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: 'At least one field is required',
  })
  .strict()
