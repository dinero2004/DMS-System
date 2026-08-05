# DMS Valuation MVP Backend

Spring Boot backend foundation for a Dealer Management System valuation MVP.

## Run locally

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start the API:

```bash
mvn spring-boot:run
```

The API runs at `http://localhost:8080`.

## Useful endpoints

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/service-records`
- `POST /api/service-records`
- `GET /api/manufacturer-protocols`
- `POST /api/manufacturer-protocols`
- `GET /api/market-references`
- `POST /api/market-references`
- `GET /api/vehicle-valuations`
- `POST /api/vehicle-valuations`
