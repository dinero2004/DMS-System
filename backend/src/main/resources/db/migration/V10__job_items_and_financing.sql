CREATE TABLE workshop_job_item (
    id              VARCHAR(36) PRIMARY KEY,
    job_id          VARCHAR(36) NOT NULL REFERENCES workshop_job(id) ON DELETE CASCADE,
    item_type       VARCHAR(20) NOT NULL,
    art_nr          VARCHAR(20),
    name            VARCHAR(200) NOT NULL,
    quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit            VARCHAR(20) DEFAULT 'Stk',
    unit_price_cents BIGINT NOT NULL DEFAULT 0,
    discount_pct    NUMERIC(5,2) DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_item_job ON workshop_job_item(job_id);

CREATE TABLE financing_offer (
    id                   VARCHAR(36) PRIMARY KEY,
    car_id               VARCHAR(36) REFERENCES car(id),
    client_id            VARCHAR(36) REFERENCES client(id),
    offer_type           VARCHAR(20) NOT NULL,
    vehicle_value_cents  BIGINT NOT NULL,
    down_payment_cents   BIGINT NOT NULL DEFAULT 0,
    residual_value_cents BIGINT,
    residual_pct         NUMERIC(5,2),
    duration_months      INT NOT NULL,
    interest_rate_pct    NUMERIC(5,2) NOT NULL,
    monthly_payment_cents BIGINT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
