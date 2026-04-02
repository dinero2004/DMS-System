ALTER TABLE sales_contract ADD COLUMN IF NOT EXISTS prep_fee_cents BIGINT DEFAULT 0;
ALTER TABLE sales_contract ADD COLUMN IF NOT EXISTS additional_costs_text TEXT;
ALTER TABLE sales_contract ADD COLUMN IF NOT EXISTS additional_costs_cents BIGINT DEFAULT 0;
ALTER TABLE sales_contract ALTER COLUMN lead_id DROP NOT NULL;
