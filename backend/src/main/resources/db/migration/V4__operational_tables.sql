CREATE TABLE IF NOT EXISTS workshop_job (
    id          VARCHAR(36) PRIMARY KEY,
    client_id   VARCHAR(36) NOT NULL REFERENCES client(id),
    car_id      VARCHAR(36) NOT NULL REFERENCES car(id),
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(30) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workshop_job_client ON workshop_job(client_id);
CREATE INDEX IF NOT EXISTS idx_workshop_job_car ON workshop_job(car_id);

CREATE TABLE IF NOT EXISTS sales_lead (
    id             VARCHAR(36) PRIMARY KEY,
    client_id      VARCHAR(36) NOT NULL REFERENCES client(id),
    car_id         VARCHAR(36) REFERENCES car(id),
    status         VARCHAR(30) NOT NULL,
    interest_model VARCHAR(255),
    notes          TEXT,
    lead_source    VARCHAR(120),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_lead_client ON sales_lead(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_lead_car ON sales_lead(car_id);

CREATE TABLE IF NOT EXISTS sales_contract (
    id                    VARCHAR(36) PRIMARY KEY,
    lead_id               VARCHAR(36) REFERENCES sales_lead(id),
    client_id             VARCHAR(36) NOT NULL REFERENCES client(id),
    car_id                VARCHAR(36) REFERENCES car(id),
    selling_price_cents   BIGINT NOT NULL,
    prep_fee_cents        BIGINT DEFAULT 0,
    additional_costs_text TEXT,
    additional_costs_cents BIGINT DEFAULT 0,
    insurance_company     VARCHAR(255),
    registration_plate    VARCHAR(64),
    contract_date         DATE NOT NULL,
    notes                 TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_contract_client ON sales_contract(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_contract_car ON sales_contract(car_id);

CREATE TABLE IF NOT EXISTS invoice (
    id             VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    client_id      VARCHAR(36) NOT NULL REFERENCES client(id),
    reference_type VARCHAR(30) NOT NULL,
    reference_id   VARCHAR(36) NOT NULL,
    amount_cents   BIGINT NOT NULL,
    currency       VARCHAR(3) NOT NULL,
    status         VARCHAR(30) NOT NULL,
    issued_at      TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_client ON invoice(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reference ON invoice(reference_type, reference_id);
