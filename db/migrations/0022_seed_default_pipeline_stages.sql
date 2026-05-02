-- Seed default pipeline stages for existing tenants that don't have config yet.
-- This preserves backwards compatibility and keeps the app usable without forcing setup immediately.

INSERT INTO "pipeline_stages" ("tenant_id","key","label","sort_order")
SELECT t.id, v.key, v.label, v.sort_order
FROM "tenants" t
JOIN (
  VALUES
    ('new_lead', 'New Lead', 0),
    ('unresponsive', 'Unresponsive', 1),
    ('follow_up', 'Follow Up', 2),
    ('docs_received', 'Docs Received', 3),
    ('options_sent', 'Options Sent', 4),
    ('final_decision', 'Final Decision', 5),
    ('walkin_booked', 'Walk-in Booked', 6),
    ('walkin_conducted', 'Walk-in Done', 7),
    ('cancelled', 'Cancelled', 8),
    ('visa_applied', 'Visa Applied', 9),
    ('visa_granted', 'Visa Granted', 10),
    ('paid', 'Paid', 11)
) AS v(key, label, sort_order) ON TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM "pipeline_stages" ps WHERE ps.tenant_id = t.id
);

