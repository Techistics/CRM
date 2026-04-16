ALTER TABLE "lead_document_checklist" ALTER COLUMN "required" TYPE boolean USING (required = 'true');--> statement-breakpoint
ALTER TABLE "lead_document_checklist" ALTER COLUMN "required" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "lead_document_checklist" ALTER COLUMN "is_submitted" TYPE boolean USING (is_submitted = 'true');--> statement-breakpoint
ALTER TABLE "lead_document_checklist" ALTER COLUMN "is_submitted" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read" TYPE boolean USING (read = 'true');--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "read" SET DEFAULT false;
