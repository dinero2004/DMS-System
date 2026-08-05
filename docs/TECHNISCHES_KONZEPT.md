# Technisches Konzept — DMS System (Demo)

| Feld | Inhalt |
|------|--------|
| **Projekt** | Apex Motorsport — Dealer Management System (Demo), Monorepo `DMS_System_DEMO` |
| **Dokumenttyp** | Technisches Konzept (Architektur- und Technologie-Leitbild) |
| **Zielgruppe** | Entwicklung, Architektur, technische Revision, Betriebsübernahme |
| **Stand** | April 2026 |
| **Verknüpfung** | Detail: `TECHNISCHE_DOKUMENTATION_REVISION.md`, Patterns: `DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.md`, Volltext: `DOKUMENTATION_PROJEKT_VOLLSTAENDIG.txt` |

---

## 1. Zweck und Abgrenzung

Dieses Dokument beschreibt das **technische Konzept** der Anwendung: **Ziele**, **architektonische Leitplanken**, **Technologieentscheidungen** und **Abgrenzungen** zum produktiven Einsatz. Es ersetzt keine API-Spezifikation, kein Lastenheft und keine Betriebshandbücher; es ordnet die Implementierung in ein nachvollziehbares Rahmenwerk ein.

**Abgrenzung:** Die Codebasis ist eine **Demonstrations- und Entwicklungsumgebung**. Sicherheit, Skalierung und Vollständigkeit der Fachprozesse sind **nicht** als produktionsreif ausgewiesen, sofern nicht ausdrücklich anders gekennzeichnet.

---

## 2. Management Summary

Das System realisiert Kernfunktionen eines **Händler-Management-Systems** (Kunden und Fahrzeuge, Werkstattaufträge, Vertrieb mit Leads/Verträgen/Finanzierung, Rechnungswesen mit PDF-Ausgabe, Dashboard) als **Web-Anwendung**.

**Technische Kernthese:** Ein **Spring-Boot-Monolith** stellt eine **REST-API** und serverseitige **PDF-Erzeugung** bereit; ein **React-SPA-Frontend** konsumiert die API über HTTP. Die **Hauptdatenbank** ist **PostgreSQL** mit **Flyway-Migrationen**; ein **Profil „demo“** erlaubt lokalen Betrieb mit **H2** und vereinfachtem Schema-Management für schnelle Demos.

---

## 3. Zielsetzung

### 3.1 Fachliche Ziele

- Abbildung typischer DMS-Artefakte: Stammdaten (Kunden, Fahrzeuge), Werkstatt, Vertrieb, Finanzen.
- **Durchgängige Nutzung** über eine einheitliche Browser-Oberfläche (SPA).
- **Dokumentenausgabe** (Vertrags-, Finanzierungs- und Rechnungs-PDFs) aus den gespeicherten Daten.

### 3.2 Technische Ziele

- **Klare Schichtung:** Präsentation (SPA) — API — Domäne/Persistenz.
- **Wartbare Backend-Struktur** entlang fachlicher Module (`customervehicle`, `workshop`, `sales`, `finance`).
- **Reproduzierbares Schema** in produktionsnaher Umgebung (PostgreSQL + Flyway).
- **Einfacher lokaler Einstieg** (Demo-Profil, optional Docker nur für Postgres).

---

## 4. Systemkontext

| Element | Rolle |
|---------|--------|
| **Benutzer** | Nutzt die SPA im Browser; authentifiziert sich gegen die API (Session-Cookie). |
| **Frontend** | React/Vite; in der Entwicklung Proxy zu `/api` auf das Backend. |
| **Backend** | Spring Boot: REST, Sicherheit, Geschäftslogik, JPA, PDF. |
| **Datenbank** | PostgreSQL (Standard) oder H2 (Profil `demo`). |
| **Externe SaaS** | Keine fest verdrahteten Drittanbieter-APIs im dokumentierten Umfang. |

---

## 5. Architekturprinzipien

1. **Monolith zuerst:** Eine deploybare Backend-Einheit reduziert Betriebskomplexität für Demo und mittlere Last; horizontale Skalierung ist nicht Primärziel dieser Konzeption.
2. **API als Vertrag:** Nach außen werden **DTOs/Records** genutzt; JPA-Entitäten bleiben **intern** (Stabilität und Kapselung).
3. **Serverseitige Wahrheit:** Geschäftsregeln und Persistenz liegen beim Backend; das Frontend orchestriert nur UI-Zustand und Aufrufe.
4. **Explizite Profile:** Trennung zwischen **integrationsnaher PostgreSQL-Konfiguration** und **Demo-Betrieb (H2)** ist konfigurationsgetrieben, nicht verstreut im Code.
5. **Migrationen vor DDL-Experimenten:** Für abnahmefähige Umgebungen ist **Flyway** die Quelle der Wahrheit für das relationale Schema.

---

## 6. Referenzarchitektur

### 6.1 Logische Schichten

- **Präsentationsschicht:** React SPA — Internationalisierung, Routing im Sinne der SPA, Visualisierung (z. B. Dashboard).
- **Anwendungsschicht (API):** REST-Controller — Validierung, Abbildung auf DTOs, Delegation an Services/Repositories.
- **Domänen- und Infrastrukturschicht:** JPA-Entitäten, Repositories, transaktionale Services (inkl. PDF-Dienste als technische Domänendienste).

### 6.2 Kommunikation

- **Synchron HTTP/JSON** zwischen Browser und Backend.
- **Kein** separates BFF-Backend; das Spring-Backend fungiert als **einzige** API für die SPA (lockeres „Backend-for-Frontend“-Muster).

---

## 7. Fachliche Module (Domänen-Schnitt)

| Modul | Inhalt (Kurz) |
|-------|----------------|
| **Kunden & Fahrzeuge** | Kundenstamm; Fahrzeuge mit Rolle Kundenbesitz oder Lager; synthetischer Dealer-Stock-Kunde für Lagerfahrzeuge. |
| **Werkstatt** | Aufträge, Positionen, Statusübergänge. |
| **Vertrieb** | Leads, Verträge, Finanzierungsangebote; PDF-Exporte. |
| **Finanzen** | Rechnungen, Status, PDF; Referenzen auf Jobs/Leads/Verträge. |
| **Auswertung** | Dashboard-Kennzahlen und Diagramme (Frontend + aggregierende API wo vorhanden). |

---

## 8. Technologie-Stack und Begründung

### 8.1 Backend

| Technologie | Begründung |
|-------------|------------|
| **Java 21** | Aktuelle LTS; Records und moderne APIs für schlanke DTOs. |
| **Spring Boot 4** | Einheitliches Ökosystem für Web, Sicherheit, Daten, Betrieb (Actuator). |
| **Spring Data JPA** | Schnelle, konvention-basierte Persistenz mit klarer Repository-Abstraktion. |
| **PostgreSQL** | Robuste relationale Datenbank für produktionsnahe Tests und Betrieb. |
| **Flyway** | Versionskontrolliertes Schema, reproduzierbare Umgebungen. |
| **Spring Security** | Etablierter Standard für Session-basierte Web-APIs. |
| **OpenPDF** | PDF-Generierung ohne externe Rendering-Pipeline in der Demo. |

### 8.2 Frontend

| Technologie | Begründung |
|-------------|------------|
| **React 19 + TypeScript** | Komponentenbasierte UI, statische Typisierung. |
| **Vite** | Schnelle Entwicklungsiteration, einfacher Produktionsbuild. |
| **i18next** | Mehrsprachigkeit (DE/EN/FR/IT) zentral pflegbar. |
| **Recharts** | Dashboard-Diagramme ohne schwere BI-Abhängigkeit. |

---

## 9. Datenhaltung und Konfigurationsprofile

### 9.1 Produktionsnaher Modus (PostgreSQL)

- JDBC-Anbindung an PostgreSQL; **Flyway aktiv**, JPA **validiert** gegen das migrierte Schema.
- Migrationen unter `backend/src/main/resources/db/migration/` (u. a. V3, V8–V13 — z. B. Stammdaten, Preisfelder, Werkstatt/Finanzierung, Vertrags-/Fahrzeugfelder).

### 9.2 Demo-Profil (`demo`)

- **H2** Dateidatenbank (persistiert typischerweise unter `~/.dms-h2/`).
- **Flyway deaktiviert**; Schema über Hibernate `update` — Abweichungen zum reinen Flyway-Pfad möglich.
- Optional **Seed-Daten** für Vorführungen.

**Konsequenz für Abnahme:** Schema- und Integrationstests gegen **PostgreSQL + Flyway** sind maßgeblich.

---

## 10. Sicherheitskonzept (Zielbild vs. Ist Demo)

### 10.1 Zielbild (produktionsorientiert)

- Transportverschlüsselung (**HTTPS**), harte **CORS**-Policies.
- **Keine** fest eingebetteten Demo-Credentials; Secrets aus sicherer Konfiguration.
- **Benutzer- und Rechteverwaltung** (Verzeichnisdienst oder persistenter Store), feingranulare Autorisierung wo nötig.
- **CSRF-Strategie** explizit zur gewählten Session-/Cookie-Architektur passend.

### 10.2 Ist-Zustand (Demo)

- Ein **In-Memory-Benutzer**, Passwort aus Konfiguration, **BCrypt**.
- **CSRF** für die API in der Demo-Konfiguration deaktiviert (SPA + Same-Origin in Dev — für Produktion neu zu bewerten).
- **CORS** auf lokale Origins beschränkt.

Dieses Konzept behandelt die Demo-Konfiguration als **Entwicklungs- und Präsentationshilfe**, nicht als Soll-Architektur für Live-Betrieb.

---

## 11. Schnittstellen

- **Extern:** REST unter `/api/**` (Auth, fachliche Ressourcen); Actuator `/actuator/health` für Betrieb.
- **Intern:** Kein Message-Bus; Aufrufe sind **in-Prozess** (Spring Beans).

Eine maschinenlesbare API-Beschreibung (OpenAPI) ist **nicht** Bestandteil des aktuellen Konzepts, stellt aber eine sinnvolle Erweiterung dar.

---

## 12. Qualitätsziele und Nicht-Ziele

**In Scope (Konzept):** Nachvollziehbare Modularität, klare Trennung SPA/API/DB, dokumentierte Profile und Sicherheitsgrenzen.

**Out of Scope (diese Konzeption):** Hochverfügbarkeit, Last- und Performance-Garantien, vollständige Admin-Prozesse, produktionsreife IAM-Integration.

---

## 13. Risiken und Maßnahmen

| Risiko | Maßnahme / Hinweis |
|--------|---------------------|
| Schema-Drift H2 vs. PostgreSQL | Abnahme und CI gegen PostgreSQL + Flyway. |
| Zu dünne Sicherheit in der Demo | Konzeptkapitel 10; produktive Härtung vor Go-Live. |
| Monolithische Frontend-Datei (`App.tsx`) | Bei Wachstum Modularisierung (Feature-Ordner, Hooks, API-Layer). |
| Controller mit viel Logik | Schrittweise Verlagerung in `@Service` (Single Responsibility). |

---

## 14. Ausblick und Erweiterbarkeit

- **OpenAPI** aus Controllern generieren.
- **Thin Controller** — Geschäftsregeln konsequent in Services.
- **Domain Events** (Spring `ApplicationEvent`) bei wachsender Kopplung zwischen Modulen.
- **Deployment:** statisches Frontend (`dist/`) hinter Reverse Proxy oder Auslieferung durch denselben Host wie die API — je nach Betriebsmodell zu entscheiden.

---

## 15. Literatur im Repository

| Dokument | Inhalt |
|----------|--------|
| `TECHNISCHE_DOKUMENTATION_REVISION.md` | Detaillierte Ist-Beschreibung, API-Tabellen, Befehle |
| `docs/DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.md` | Patterns, Datenfluss, Ordnerstruktur |
| `DOKUMENTATION_PROJEKT_VOLLSTAENDIG.txt` | Zusammenführung als Klartext |

---

*Ende des technischen Konzepts*
