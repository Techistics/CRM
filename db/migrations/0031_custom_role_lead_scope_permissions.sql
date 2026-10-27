DO $$
DECLARE
  permissions_type text;
BEGIN
  SELECT data_type
  INTO permissions_type
  FROM information_schema.columns
  WHERE table_schema = current_schema()
    AND table_name = 'custom_roles'
    AND column_name = 'permissions';

  IF permissions_type IS NULL THEN
    RAISE EXCEPTION 'custom_roles.permissions column was not found in schema %', current_schema();
  END IF;

  CASE permissions_type
    WHEN 'jsonb' THEN
      UPDATE custom_roles AS cr
      SET permissions = (
        SELECT COALESCE(jsonb_agg(item.permission ORDER BY item.ordinal), '[]'::jsonb)
        FROM jsonb_array_elements(cr.permissions) WITH ORDINALITY AS item(permission, ordinal)
        WHERE item.permission <> '"kanban.view"'::jsonb
      ) || CASE
        WHEN cr.permissions @> '["leads.view"]'::jsonb
          AND NOT cr.permissions @> '["leads.view_all"]'::jsonb
        THEN '["leads.view_all"]'::jsonb
        ELSE '[]'::jsonb
      END
      WHERE cr.permissions @> '["kanban.view"]'::jsonb
        OR (
          cr.permissions @> '["leads.view"]'::jsonb
          AND NOT cr.permissions @> '["leads.view_all"]'::jsonb
        );
    WHEN 'json' THEN
      UPDATE custom_roles AS cr
      SET permissions = ((
        SELECT COALESCE(jsonb_agg(item.permission ORDER BY item.ordinal), '[]'::jsonb)
        FROM jsonb_array_elements(cr.permissions::jsonb) WITH ORDINALITY AS item(permission, ordinal)
        WHERE item.permission <> '"kanban.view"'::jsonb
      ) || CASE
        WHEN cr.permissions::jsonb @> '["leads.view"]'::jsonb
          AND NOT cr.permissions::jsonb @> '["leads.view_all"]'::jsonb
        THEN '["leads.view_all"]'::jsonb
        ELSE '[]'::jsonb
      END)::json
      WHERE cr.permissions::jsonb @> '["kanban.view"]'::jsonb
        OR (
          cr.permissions::jsonb @> '["leads.view"]'::jsonb
          AND NOT cr.permissions::jsonb @> '["leads.view_all"]'::jsonb
        );
    WHEN 'text' THEN
      UPDATE custom_roles AS cr
      SET permissions = ((
        SELECT COALESCE(jsonb_agg(item.permission ORDER BY item.ordinal), '[]'::jsonb)
        FROM jsonb_array_elements(cr.permissions::jsonb) WITH ORDINALITY AS item(permission, ordinal)
        WHERE item.permission <> '"kanban.view"'::jsonb
      ) || CASE
        WHEN cr.permissions::jsonb @> '["leads.view"]'::jsonb
          AND NOT cr.permissions::jsonb @> '["leads.view_all"]'::jsonb
        THEN '["leads.view_all"]'::jsonb
        ELSE '[]'::jsonb
      END)::text
      WHERE cr.permissions::jsonb @> '["kanban.view"]'::jsonb
        OR (
          cr.permissions::jsonb @> '["leads.view"]'::jsonb
          AND NOT cr.permissions::jsonb @> '["leads.view_all"]'::jsonb
        );
    ELSE
      RAISE EXCEPTION 'Unsupported custom_roles.permissions data type: %', permissions_type;
  END CASE;
END;
$$;
