# Design Patterns, Softwarestruktur und Architektur

**Projekt:** DMS System (Demo) — Apex Motorsport  
**Zielgruppe:** Technische Dokumentation für Architekturreview, Onboarding und Revision  
**Sprache:** Deutsch  

---

## Inhaltsverzeichnis

1. [Einordnung: Was sind Design Patterns?](#1-einordnung)
2. [Gesamtarchitektur des Projekts](#2-gesamtarchitektur)
3. [Backend: Muster und zugehörige Struktur](#3-backend)
4. [Frontend: Muster und zugehörige Struktur](#4-frontend)
5. [Querschnitt: Datenfluss und Schichten](#5-querschnitt)
6. [Tabellarische Zuordnung Pattern → Code-Ort](#6-zuordnung)
7. [Empfohlene Ordnerstruktur (Ist-Zustand)](#7-ordnerstruktur)
8. [Hinweise für Erweiterungen](#8-erweiterungen)
9. [PDF-Erzeugung](#9-pdf)

---

## 1. Einordnung: Was sind Design Patterns? {#1-einordnung}

**Design Patterns** (Entwurfsmuster) sind bewährte Lösungsschablonen für wiederkehrende Entwurfsprobleme. Sie beschreiben **keine** konkrete Implementierung, sondern **Rollen** (Klassen/Schnittstellen) und **Zusammenspiel**.

In diesem Projekt sind viele Muster **nicht manuell** nach Gang-of-Four-Buch implementiert, sondern durch **Frameworks** (v. a. **Spring Framework**, **Spring Data**, **React**) realisiert. Die Dokumentation benennt daher:

- das **klassische Pattern** (z. B. „Repository“),
- die **Spring/React-Entsprechung**,
- den **Ort im Repository** (Pakete/Dateien).

---

## 2. Gesamtarchitektur des Projekts {#2-gesamtarchitektur}

### 2.1 Schichtenmodell (Layered Architecture)

Das System folgt einer **klassischen Drei-Schichten-Logik**, auch wenn die Grenzen im Code teils **Controller-lastig** sind:

| Schicht | Rolle | Technologie im Projekt |
|--------|--------|-------------------------|
| **Präsentation** | UI, Eingabe, Anzeige | React SPA (`frontend/`) |
| **Anwendung / API** | HTTP, Validierung, Orchestrierung | `@RestController` in Spring |
| **Domäne & Persistenz** | Geschäftsobjekte, DB-Zugriff | JPA-Entitäten, Repositories, teils `@Service` |

**Strukturelle Konsequenz:** Änderungen an der Datenbank kapseln sich über **Repositories** und **Entitäten**; die API spricht nach außen mit **DTOs/Records** (`ClientProfile`, `CarProfile`, verschiedene `*View`- und Request-`record`s), nicht mit JPA-Entitäten als JSON-Root (gute Praxis für API-Stabilität).

### 2.2 Architekturstil: Monolith mit SPA-Frontend

- Ein **Spring-Boot-Monolith** stellt die REST-API und PDF-Erzeugung bereit.
- Das **Frontend** ist eine eigenständige SPA, die per **HTTP** (in der Entwicklung über **Vite-Proxy**) mit dem Backend kommuniziert.

Das entspricht dem Muster **„Backend for Frontend“** in lockerer Form: das Backend ist die einzige API-Quelle für die SPA.

---

## 3. Backend: Muster und zugehörige Struktur {#3-backend}

### 3.1 Dependency Injection (DI) / Inversion of Control (IoC)

**Pattern:** *Dependency Injection* — Abhängigkeiten werden dem Objekt von außen übergeben, statt dass es sie selbst erzeugt.

**Spring-Umsetzung:** Konstruktor-Injection in `@RestController`, `@Service`, `@Component`.

**Struktur:**

- `BackendApplication` startet den **Spring Application Context** (`@SpringBootApplication`).
- Beans werden **registriert** und **verdrahtet** (Controller ← Service ← Repository).

**Beispiel:** `WorkshopJobController` erhält Repositories und Mapper-Logik über den Konstruktor (implizit durch Spring).

**Warum:** Testbarkeit, lose Kopplung, zentrale Lebenszyklusverwaltung (Singleton-Scope als Default).

---

### 3.2 Repository Pattern

**Pattern:** *Repository* — Abstraktion des Datenzugriffs; die Domäne spricht in Begriffen wie „speichern“, „finden“, nicht in SQL.

**Spring Data JPA-Umsetzung:** Interfaces `extends JpaRepository<Entity, Id>`.

**Struktur:**

- `…/persistence/*Repository.java` — z. B. `ClientRepository`, `CarRepository`, `InvoiceRepository`.

**Warum:** Trennung zwischen **Persistenzmechanismus** (JPA/Hibernate) und **Anwendungslogik**.

---

### 3.3 Data Mapper (DTO / Entity-Mapping)

**Pattern:** *Mapper* / *Data Transfer Object (DTO)* — Übersetzung zwischen **Persistenzmodell** (Entity) und **API-Modell** (unveränderliche API-Objekte).

**Umsetzung:**

- **DTOs als `record`:** `ClientProfile`, `CarProfile`, diverse `*View`- und `*Request`-Records in Controllern.
- **Statische Mapper-Klasse** `CustomerVehicleMapper` mit privatem Konstruktor (`final class`, `private CustomerVehicleMapper() {}`) — verhindert Instanziierung, nur statische Methoden `toClientProfile`, `toCarProfile`.

**Struktur:**

- `modules/customervehicle/api/ClientProfile.java`, `CarProfile.java`
- `modules/customervehicle/api/CustomerVehicleMapper.java`

**Warum:** Entities bleiben **intern**; API-Formate können sich unabhängig ändern; klare Lesbarkeit der JSON-Schnittstelle.

---

### 3.4 Service Layer (Anwendungsdienste)

**Pattern:** *Service Layer* / *Application Service* — gebündelte **Fach- oder Transaktionslogik**, die nicht in jedem Controller dupliziert werden soll.

**Umsetzung:** Klassen mit `@Service`.

**Beispiele im Projekt:**

- `InvoiceService` — Erzeugung von Rechnungen inkl. Nummernkreis (`computeNextInvoiceSequenceValue`), `@Transactional` wo nötig.
- `InvoicePdfService`, `ContractPdfService`, `FinancingPdfService` — PDF-Erzeugung (technisch domänennahe „Infrastructure“-Aufgaben, aber als Spring-Services organisiert).

**Struktur:**

- `modules/finance/service/`
- `modules/sales/service/`

**Hinweis:** Manche Controller enthalten **noch viel Logik** (z. B. `CustomerVehicleController`). Das ist für eine Demo üblich; eine konsequentere **„Thin Controller“**-Strategie würde mehr Logik in `@Service`-Klassen verschieben.

---

### 3.5 MVC (Model–View–Controller) — API-Variante

**Pattern:** *MVC* — im Web-Kontext oft **Model** (Daten/DTOs), **View** (hier: JSON-Body), **Controller** (HTTP-Handler).

**Spring-Web-Umsetzung:** `@RestController` = Controller + serialisiertes JSON statt HTML-View.

**Struktur:** `modules/*/api/*Controller.java` — z. B. `FinanceController`, `SalesContractController`, `WorkshopJobController`.

---

### 3.6 Front Controller (implizit)

**Pattern:** *Front Controller* — ein zentraler Einstiegspunkt für alle HTTP-Anfragen.

**Umsetzung:** **Spring MVC `DispatcherServlet`** (in Spring Boot automatisch konfiguriert). Nicht als eigene Klasse sichtbar, aber architektonisch das **Front-Controller-Muster** der Servlet-Schicht.

---

### 3.7 Singleton (Bean-Scope)

**Pattern:** *Singleton* — eine Instanz pro Anwendungskontext.

**Spring-Umsetzung:** Standard-**Scope** für typische Beans (`@Service`, `@RestController`, `@Component`).

**Warum:** Gemeinsame Nutzung von Diensten und Controllern ohne globale statische Variablen.

---

### 3.8 Template für unveränderliche API-Antworten (`record`)

**Pattern:** oft mit **Value Object** oder **DTO** assoziiert — unveränderliche Datencontainer.

**Java-Umsetzung:** `record` (Java 16+) für Request/Response-Typen, z. B. `ApiResponse`, `LoginRequest`, `CreateInvoiceRequest`.

**Vorteil:** weniger Boilerplate, klare Gleichheit/Hash für einfache Typen.

---

### 3.9 Bootstrap / Initialisierung (ApplicationRunner)

**Pattern:** *Initialization on startup* — technisch nah an **Template Method** / **Hook** (Framework ruft zu definiertem Zeitpunkt auf).

**Umsetzung:**

- `DealerStockClientBootstrap implements ApplicationRunner` — legt den synthetischen Kunden „Dealer Stock“ an (Pflicht für Lagerfahrzeuge).
- `DemoSeedService` / Seeding-Komponenten — optionale Demodaten (`dms.seed.enabled`).

**Struktur:** `config/`

---

### 3.10 Sicherheit: Chain of Responsibility (konzeptionell)

**Pattern:** *Chain of Responsibility* — Anfrage durchläuft eine **Kette von Filtern/Handlern**.

**Spring Security-Umsetzung:** `SecurityFilterChain` — Reihenfolge von Filtern (Authentifizierung, Autorisierung, CORS, …).

**Konfiguration:** `config/SecurityConfig.java` — u. a. `authorizeHttpRequests`, CSRF, CORS.

---

### 3.11 Strategie (Password Encoding)

**Pattern:** *Strategy* — austauschbare Algorithmen über eine gemeinsame Schnittstelle.

**Umsetzung:** `PasswordEncoder` mit **BCrypt**-Implementierung (`BCryptPasswordEncoder` als Bean).

---

### 3.12 API Gateway / Reverse Proxy (Entwicklung)

**Pattern (infrastrukturell):** Proxy vor dem Backend.

**Umsetzung (nur Dev):** Vite leitet `/api` an `http://localhost:8080` weiter (`vite.config.ts`).

---

## 4. Frontend: Muster und zugehörige Struktur {#4-frontend}

### 4.1 Container / Presentational (lose)

Viele React-Projekte trennen **Container** (Daten, Effekte) und **Presentational** (darstellen). Hier ist die App **überwiegend in `App.tsx`** gebündelt — das ist für Demos üblich, skaliert aber schlechter.

**Empfohlene Struktur bei Wachstum:** `features/<modul>/components`, `hooks`, `api`.

---

### 4.2 Provider Pattern (React Context API)

**Pattern:** *Provider* — Kontextobjekt für abhängige Komponenten ohne „Prop Drilling“.

**Umsetzung:**

- `AuthProvider` + `AuthContext` — Login-Status, Session, `fetch` zu `/api/auth/*`.
- `ThemeProvider` + `ThemeContext` — Darstellungsthema.

**Struktur:** `auth/AuthContext.tsx`, `theme.tsx`

**Zugehörige Hooks:** `useAuth()`, `useTheme()` — Kapselung des Kontextzugriffs.

---

### 4.3 Hooks Pattern (React)

**Pattern:** *Hooks* — wiederverwendbare zustands- und nebenwirkungslogik.

**Beispiele:** `useState`, `useEffect`, `useCallback`, `useMemo` in `App.tsx` (z. B. abgeleitete Listen `inventoryCars`, `invRefOptions`).

**Warum:** Performance (`useMemo`) und stabile Referenzen (`useCallback`).

---

### 4.4 Internationalisierung (i18n)

**Struktur:** `locales/de.ts`, `en.ts`, … + `i18n.ts` — zentrale Übersetzungsressourcen (kein klassisches GoF-Pattern, aber etablierte **Resource-Bundle**-Struktur).

---

## 5. Querschnitt: Datenfluss und Schichten {#5-querschnitt}

Typischer Ablauf **Lesen** (z. B. Kundenliste):

1. Browser → `GET /api/v1/clients` (mit Session-Cookie nach Login)
2. `CustomerVehicleController` → `ClientRepository`
3. Entities → `CustomerVehicleMapper` → `ClientProfile` (Records)
4. JSON-Antwort an SPA

Typischer Ablauf **Schreiben** (z. B. Rechnung):

1. `FinanceController` empfängt `CreateInvoiceRequest`
2. Orchestrierung mit `InvoiceService`, Referenzauflösung (Job/Lead/Vertrag), Persistenz
3. Optional PDF über `InvoicePdfService`

---

## 6. Tabellarische Zuordnung Pattern → Code-Ort {#6-zuordnung}

| Pattern / Konzept | Rolle | Wo im Projekt (Orientierung) |
|-------------------|--------|-------------------------------|
| IoC / DI | Verdrahtung von Komponenten | Gesamtes Backend, Spring Context |
| Repository | Datenzugriff | `…/persistence/*Repository.java` |
| Service Layer | Fachlogik, Transaktionen | `…/service/*Service.java` |
| DTO / Record | API-Verträge | Controller-`record`s, `ApiResponse`, `*Profile` |
| Mapper | Entity ↔ DTO | `CustomerVehicleMapper` |
| MVC (REST) | HTTP-Schicht | `*Controller.java` |
| Front Controller | Zentraler Dispatch | Spring `DispatcherServlet` (Framework) |
| Singleton | Eine Bean-Instanz | Standard-Scope Spring Beans |
| Application Bootstrap | Start-Hooks | `DealerStockClientBootstrap`, Demo-Seeding |
| Security Filter Chain | Authentifizierung/Autorisierung | `SecurityConfig` |
| Strategy | Passwort-Hash-Algorithmus | `PasswordEncoder` / BCrypt |
| Provider (React) | Kontext für Auth/Theme | `AuthContext.tsx`, `theme.tsx` |
| Hooks | UI-Logik | `App.tsx`, Context-Dateien |
| Proxy (Dev) | API-Weiterleitung | `vite.config.ts` |

---

## 7. Empfohlene Ordnerstruktur (Ist-Zustand) {#7-ordnerstruktur}

```
DMS_System_DEMO/
├── backend/
│   ├── pom.xml
│   ├── compose.yml                 # PostgreSQL für lokale Docker-Nutzung
│   └── src/main/java/com/dms/backend/
│       ├── BackendApplication.java
│       ├── auth/                   # REST-Login, Session
│       ├── config/                 # Security, Properties, Bootstrap, Demo-Seed
│       └── modules/
│           ├── customervehicle/    # api (DTOs, Mapper), persistence (Entities, Repos)
│           ├── workshop/
│           ├── sales/
│           └── finance/
│   └── src/main/resources/
│       ├── application.properties
│       ├── application-demo.properties
│       └── db/migration/           # Flyway (PostgreSQL)
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Haupt-UI (groß)
│   │   ├── auth/                 # AuthContext, Login
│   │   ├── locales/              # i18n
│   │   └── …
│   └── vite.config.ts
├── docker-compose.yml
├── docs/                         # diese Dokumentation
└── TECHNISCHE_DOKUMENTATION_REVISION.md
```

---

## 8. Hinweise für Erweiterungen {#8-erweiterungen}

- **Mehr Service Layer:** Geschäftsregeln aus Controllern in `@Service` verschieben → klarere **Single Responsibility**.
- **Explizite API-Schicht:** OpenAPI/Swagger generieren aus Controllern/Records.
- **Frontend modularisieren:** Feature-Ordner, weniger monolithisches `App.tsx`.
- **Domain Events:** bei wachsender Komplexität *Observer* / *Event* über Spring `ApplicationEvent` erwägen.

---

## 9. PDF-Erzeugung {#9-pdf}

Diese Datei ist als **Markdown** (`docs/DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.md`) versioniert.

### Option A: HTML erzeugen und im Browser als PDF speichern (im Repo vorbereitet)

```bash
cd docs
npm install
npm run build:html
```

Anschließend `docs/DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.html` im Browser öffnen → **Drucken** → **Als PDF speichern** (Chrome, Safari, Edge).

### Option B: Pandoc (wenn installiert: `brew install pandoc` / Paketmanager)

```bash
cd docs
pandoc DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.md -o DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.pdf \
  --pdf-engine=xelatex \
  -V lang=de \
  -V geometry:margin=2.5cm \
  --toc
```

Ohne LaTeX: zuerst HTML mit Pandoc erzeugen, dann im Browser drucken:

```bash
pandoc DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.md -o out.html
```

### Option C: Markdown-Vorschau in VS Code / Cursor

Datei öffnen → **Markdown-Vorschau** → **Drucken** → **Als PDF speichern**.

---

*Ende der Dokumentation*
