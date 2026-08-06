# Veloce Cockpit delivery

Veloce Cockpit is the role-focused interface for the existing DealerOps DMS core in this repository.

## Start the integrated system

```bash
docker compose up -d --build veloce-web
```

Open `http://localhost:15175` and sign in with `demo` / `demo` for the seeded workspace.

The root Compose stack starts:

- `postgres`: DealerOps PostgreSQL system of record
- `dealerops-api`: Spring Boot domain API on `http://localhost:18081`
- `veloce-web`: Veloce Node BFF and web interface on `http://localhost:15175`

For architecture, workflows, configuration, and validation details, see [`dealer-management-systems/veloce-dms/README.md`](dealer-management-systems/veloce-dms/README.md).

## Implemented product direction

1. Veloce is branded as a cockpit rather than a second DMS core.
2. The existing visual language is retained and made mobile-friendly.
3. DealerOps Spring Boot and PostgreSQL own operational data.
4. Veloce uses authenticated, allowlisted same-origin API access.
5. Workshop-first and sales workflows now operate on DealerOps records.

## Next increments

- Digital vehicle inspections with photos and customer approval
- Technician dispatch, bay planning, and time recording
- Parts requests, availability, and purchasing
- Test-drive, trade-in, financing, and delivery checklists
- Production identity, MFA, granular roles, and branch-level permissions
