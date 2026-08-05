# Veloce Dealer OS

Veloce Dealer OS is a lightweight DMS dashboard built from the exported Veloce data file in `data/seed.json`.

It exposes:

- Web app: `http://localhost:15175`
- Health check: `http://localhost:15175/health`
- Data API: `http://localhost:15175/api/data`

Run it from the parent workspace:

```bash
docker compose up -d veloce-web
```
