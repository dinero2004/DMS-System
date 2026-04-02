#!/usr/bin/env bash
# Starts Postgres for the DMS backend if Docker Desktop is running.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running."
  echo "  • macOS: open Docker Desktop and wait until it says it is running, then run this script again."
  echo "  • Or install PostgreSQL without Docker and create database \"dms\" with user/password \"dms\" on port 5432."
  exit 1
fi
docker compose -f "$ROOT/docker-compose.yml" up -d
echo "Postgres should be on localhost:5432 (db dms, user dms). Check: docker ps"
echo "Then run: cd \"$ROOT/backend\" && mvn spring-boot:run"
