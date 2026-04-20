ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value decimal(12,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_currency varchar(3) DEFAULT 'USD';
