# Veloce Cockpit

Veloce Cockpit is the focused, role-oriented front door to the DealerOps Command DMS. It keeps the original Veloce visual language while using the DealerOps Spring Boot API and PostgreSQL database as its system of record.

Veloce no longer reads or writes a bundled JSON export. Customer, vehicle, workshop, sales, contract, financing, and invoice data comes from DealerOps through a same-origin backend-for-frontend (BFF).

## Current workflows

### Workshop-first workflow

1. Create a repair order for an existing customer vehicle.
2. Add the first billable labor or part item.
3. Move the job from `OPEN` to `IN_PROGRESS` and then `DONE`.
4. Create a draft workshop invoice.
5. Post the invoice and record payment.

### Sales workflow

1. Create a customer if the person is not already in DealerOps.
2. Create a lead and optionally connect it to a retail-stock vehicle.
3. Move the lead through `NEW`, `CONTACTED`, `NEGOTIATION`, and `WON` or `LOST`.
4. Create a sales contract for a won lead.

## Architecture

```text
Browser :15175
    |
    v
Veloce Cockpit (Node BFF)
    |  authenticated same-origin proxy
    v
DealerOps Spring Boot API
    |
    v
DealerOps PostgreSQL
```

The BFF exposes only an allowlisted subset of DealerOps routes. DealerOps owns authentication, sessions, validation, business records, PDFs, and persistence.

## Run

From the repository root:

```bash
docker compose up -d --build veloce-web
```

Docker Compose starts the required DealerOps database and API automatically.

Open:

- Cockpit: `http://localhost:15175`
- Health: `http://localhost:15175/health`
- DealerOps API for diagnostics: `http://localhost:18081`

Demo login:

```text
username: demo
password: demo
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | Veloce container port |
| `DMS_BACKEND_URL` | `http://dealerops-api:8080` | DealerOps API base URL |
| `DMS_BACKEND_TIMEOUT_MS` | `8000` | Upstream request timeout |

## API surface

- `GET /health`: Veloce and DealerOps health summary.
- `GET /api/cockpit`: authenticated aggregate for cockpit screens and KPIs.
- `/api/core/...`: restricted same-origin proxy for approved DealerOps workflow routes.

The old unauthenticated `/api/data` export endpoint has been removed.

## Validation

Run the Node tests:

```bash
npm test
```

The tests cover KPI scoping and the DealerOps proxy allowlist. Production acceptance should also include DealerOps backend tests and end-to-end browser coverage for each role.

## Product direction

Veloce is intentionally a cockpit, not a second DMS core. New user experiences should reuse DealerOps domain records and APIs. Near-term priorities are digital inspections, technician time/dispatch, parts requests, estimate approval, test drives, trade-ins, financing, and delivery checklists.
