# Systemdokumentation 2: DealerOps Command DMS

Stand: 05.08.2026  
Systempfad: `/Users/lazarminkov/Documents/DMS_System_DEMO/dealer-management-systems/dealerops-command-dms`  
Docker-Web: `http://localhost:15174`  
Docker-API: `http://localhost:18081`

## 1. Kurzbeschreibung

DealerOps Command DMS ist die umfangreichste der drei DMS-Anwendungen. Während ValuPilot auf Bewertung fokussiert ist und Veloce Daten schnell sichtbar macht, bildet DealerOps mehrere operative Autohausprozesse ab.

Das System enthält Module für Kunden, Fahrzeuge, Werkstatt, Verkauf, Finanzierung, Verträge, Rechnungen, PDF-Ausgabe, Login, Dashboard und Mehrsprachigkeit. Es ist damit die realistischste Annäherung an ein vollständigeres Dealer-Management-System.

## 2. Fachlicher Zweck

DealerOps beantwortet im Kern die Frage:

Wie kann ein webbasiertes DMS die täglichen Arbeitsprozesse eines Autohauses in einer gemeinsamen Oberfläche zusammenführen?

Abgebildete Bereiche:

- Kundenverwaltung
- Fahrzeugverwaltung
- Lagerfahrzeuge
- Fahrzeugbilder
- Werkstattaufträge
- Verkaufsleads
- Kaufverträge
- Finanzierungsangebote
- Rechnungen
- PDF-Dokumente
- Authentifizierung
- Dashboard und Kennzahlen
- Mehrsprachigkeit

## 3. Technologiestack

| Bereich | Technologie | Version / Hinweis |
| --- | --- | --- |
| Backend | Spring Boot | `4.0.4` |
| Backend-Sprache | Java | `21` |
| Persistenz | Spring Data JPA | Repositories und Entities |
| Migrationen | Flyway | SQL-Migrationen in `db/migration` |
| Sicherheit | Spring Security | Session-Login für Demo |
| Datenbank | PostgreSQL | Docker-Service `dealerops-db` |
| Demo-Datenbank | H2 | Profil `demo` |
| PDF | OpenPDF | `1.3.30` |
| Frontend | React | `19.2.4` |
| Frontend-Sprache | TypeScript | `5.9.3` |
| Build Tool | Vite | `8.0.1` |
| Charts | Recharts | `3.8.1` |
| Internationalisierung | i18next, react-i18next | DE/EN/FR/IT |
| Container | Docker, nginx, Node 22, Maven, Temurin 21 | Multi-Stage-Build |

## 4. Warum diese Technologien hier passen

DealerOps ist größer als ein reines MVP. Deshalb braucht das System eine robustere Struktur als Veloce. Spring Boot passt, weil Module wie Werkstatt, Verkauf und Finanzen unterschiedliche Geschäftsregeln und Datenobjekte haben.

Flyway ist hier besonders wichtig. Je mehr Tabellen und Felder ein System besitzt, desto riskanter wird manuelles Ändern der Datenbank. Die Migrationen dokumentieren die Entwicklung des Schemas.

React und TypeScript passen, weil die Oberfläche viele Zustände und Formulare enthält. TypeScript hilft, Fahrzeug-, Kunden-, Vertrags- und Rechnungsdaten sauberer im Frontend abzubilden.

Recharts wurde gewählt, weil ein operatives DMS Kennzahlen sichtbar machen soll. Ein Dashboard ohne Diagramme wäre fachlich weniger aussagekräftig.

i18next passt, weil DealerOps bereits mehrsprachige Texte enthält. Für Schweizer Autohäuser ist Mehrsprachigkeit fachlich plausibel.

## 5. Technische Backend-Struktur

Backend-Struktur:

```text
backend/src/main/java/com/dms/backend/
  auth/
  config/
  shared/
  modules/
    customervehicle/
    workshop/
    sales/
    finance/
    system/
    service/
```

Die Module sind fachlich geschnitten. Das ist wichtig: Ein DMS sollte nicht nur technische Ordner wie `controllers` und `models` besitzen, sondern nach Geschäftsbereichen organisiert werden.

Beispiel:

```text
modules/sales/
  api/
  persistence/
  service/
```

Diese Struktur zeigt:

- `api` nimmt HTTP-Anfragen entgegen.
- `persistence` enthält Entities und Repositories.
- `service` enthält fachliche oder technische Dienste.

## 6. Technische Frontend-Struktur

Frontend-Struktur:

```text
frontend/src/
  App.tsx
  Dashboard.tsx
  SalesCalendar.tsx
  CarEditMask.tsx
  LoginScreen.tsx
  SettingsMenu.tsx
  LanguageSwitcher.tsx
  ThemeSwitcher.tsx
  auth/
  locales/
  App.css
  index.css
```

Das Frontend ist als Single Page Application aufgebaut. Die Sidebar führt durch die Module, während die Hauptfläche je nach Modul Tabellen, Formulare, Kalender, Diagramme oder Detailmasken zeigt.

## 7. Datenmodell und Migrationen

DealerOps nutzt Flyway-Migrationen unter:

`backend/src/main/resources/db/migration`

Beispiele:

| Migration | Bedeutung |
| --- | --- |
| `V3__clients_and_cars_tables.sql` | Kunden- und Fahrzeugtabellen |
| `V4__operational_tables.sql` | operative Tabellen |
| `V9__vehicle_pricing_fields.sql` | Preisfelder für Fahrzeuge |
| `V10__job_items_and_financing.sql` | Werkstattpositionen und Finanzierung |
| `V12__contract_prep_fee_additional_costs.sql` | zusätzliche Vertragskosten |
| `V15__align_customer_vehicle_schema.sql` | Angleichung Kundendaten/Fahrzeugschema |

Die Migrationen machen sichtbar, wie das System gewachsen ist. Das ist für eine technische Dokumentation wertvoll, weil es zeigt, dass Datenbankentwicklung ein Prozess ist und nicht einmalig am Anfang abgeschlossen wird.

## 8. API-Oberfläche

DealerOps nutzt REST-Endpunkte unter `/api` und `/api/v1`.

Wichtige Endpunkte:

| Modul | Pfad | Beispiele |
| --- | --- | --- |
| Auth | `/api/auth` | `POST /login`, `POST /logout`, `GET /me` |
| Kunden | `/api/v1/clients` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| Fahrzeuge | `/api/v1/cars` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| Fahrzeugbilder | `/api/v1/cars/{carId}/images` | Upload, Liste, Abruf, Löschen |
| Werkstatt | `/api/v1/workshop/jobs` | Jobs, Status, Positionen |
| Verkaufsleads | `/api/v1/sales/leads` | Liste, Anlegen, Status |
| Verträge | `/api/v1/sales/contracts` | Liste, Anlegen, PDF |
| Finanzierung | `/api/v1/sales/financing` | Angebote, PDF |
| Rechnungen | `/api/v1/finance/invoices` | Liste, Anlegen, Status, PDF |

Die Pfadstruktur zeigt eine klare Versionierung mit `/api/v1`. Für wachsende Systeme ist das sinnvoll, weil spätere API-Änderungen besser kontrolliert werden können.

## 9. Sicherheitsmodell

DealerOps besitzt ein Demo-Login mit Spring Security. Die Konfiguration enthält:

```text
dms.auth.username=demo
dms.auth.password=demo
```

Das ist für lokale Demonstrationen ausreichend, aber nicht produktionsreif.

Für einen produktiven Einsatz wären erforderlich:

- Benutzer in Datenbank oder Identity Provider
- Rollen und Berechtigungen
- sichere Passwortrichtlinien
- HTTPS
- sichere Secret-Verwaltung
- CSRF/CORS-Konzept
- Audit-Log für kritische Aktionen

Für ein Diplomprojekt ist es legitim, Demo-Sicherheit klar zu begrenzen, solange diese Grenze dokumentiert wird.

## 10. PDF-Ausgabe

DealerOps nutzt OpenPDF, um Vertrags-, Finanzierungs- und Rechnungsdokumente zu erzeugen. PDF-Ausgabe ist für ein DMS fachlich relevant, weil Autohäuser häufig druckbare Dokumente benötigen.

Vorteile:

- Dokumente entstehen direkt aus Systemdaten.
- Es ist keine externe PDF-SaaS nötig.
- Das Backend kontrolliert Layout und Inhalt.

Nachteile:

- PDF-Layout in Code kann unübersichtlich werden.
- Designänderungen sind aufwendiger als in HTML/CSS.
- Für komplexe Templates wäre später ein Template-System sinnvoll.

## 11. Docker-Verwaltung

DealerOps besteht aus drei Docker-Services:

| Service | Container | Zweck |
| --- | --- | --- |
| `dealerops-db` | `dealerops-command-dms-db` | PostgreSQL 16 |
| `dealerops-api` | `dealerops-command-dms-api` | Spring Boot API |
| `dealerops-web` | `dealerops-command-dms-web` | React-Frontend über nginx |

Ports:

| Dienst | Host-Port | Container-Port |
| --- | ---: | ---: |
| Web | 15174 | 80 |
| API | 18081 | 8080 |
| PostgreSQL | 55433 | 5432 |

Start:

```bash
cd /Users/lazarminkov/Documents/DMS_System_DEMO/dealer-management-systems
docker compose up -d dealerops-web
```

Die Datenbank wird über das Volume `dealerops-db-data` persistent gehalten. Dadurch bleiben Daten nach einem Container-Neustart erhalten.

## 12. Designrichtung

DealerOps ist als operative Arbeitsoberfläche gestaltet. Die UI nutzt:

- Sidebar-Navigation
- Panels und Dashboardflächen
- Tabellen
- Statuschips
- Modale Dialoge
- Theme-Systeme
- Sprachumschaltung
- dichte Informationsflächen

Die visuelle Richtung ist technischer und dichter als ValuPilot. Das ist sinnvoll, weil DealerOps nicht nur eine einzelne Entscheidung unterstützt, sondern mehrere Arbeitsprozesse verwaltet.

Die Designlogik lautet:

Ein Benutzer im Autohaus soll wiederholt Aufgaben ausführen können: Kunden suchen, Fahrzeuge bearbeiten, Aufträge prüfen, Verträge erzeugen oder Rechnungen abrufen. Dafür braucht die Oberfläche keine Marketing-Wirkung, sondern klare Bedienbarkeit, stabile Navigation und scanbare Informationen.

## 13. Vorteile und Nachteile des Systems

Vorteile:

- umfassendster DMS-Prototyp
- fachliche Modularisierung
- Datenbankmigrationen mit Flyway
- PDF-Ausgabe
- Mehrsprachigkeit
- Login-Grundlage
- gute Basis für ein realistisches Major-Project-System

Nachteile:

- höhere Komplexität als ValuPilot und Veloce
- Frontend kann bei weiterem Wachstum stärker modularisiert werden
- Demo-Security nicht produktionsreif
- PDF-Code kann bei vielen Dokumenttypen schwer wartbar werden
- Spring Boot 4 ist modern, aber für manche Lernressourcen weniger verbreitet als Spring Boot 3

## 14. Aufbauanleitung für Studierende

Ein ähnliches DMS sollte nicht mit allen Modulen gleichzeitig begonnen werden. Sinnvoll ist dieser Aufbau:

1. Kunden- und Fahrzeugdatenmodell erstellen.
2. REST-Endpunkte für Kunden und Fahrzeuge bauen.
3. Frontend mit Sidebar und Tabellen anlegen.
4. Datenbank mit Flyway versionieren.
5. Werkstattmodul ergänzen.
6. Verkaufsleads ergänzen.
7. Verträge und Finanzierung ergänzen.
8. Rechnungsmodul ergänzen.
9. PDF-Ausgabe für ein Dokument umsetzen.
10. Login und Demo-Daten ergänzen.
11. Docker Compose mit Web, API und DB stabilisieren.
12. Erst danach Design, Themes und Mehrsprachigkeit ausbauen.

## 15. Geeignete Weiterentwicklung

- Services stärker aus Controllern herausziehen
- OpenAPI-Dokumentation ergänzen
- Rollenmodell für Admin, Verkauf, Werkstatt und Finanzen
- echte Rechteprüfung pro Endpunkt
- PDF-Templates vereinheitlichen
- stärkere Tests für API und Datenbankmigrationen
- bessere Fehler- und Ladezustände im Frontend
- Nutzerstudie mit realistischen Autohausaufgaben

## 16. Quellen

Spring. 2026. *Spring Boot Documentation*. https://docs.spring.io/spring-boot/index.html  
Spring Data. 2026. *Spring Data JPA Reference*. https://docs.spring.io/spring-data/jpa/reference/  
Redgate. 2026. *Flyway Migrations*. https://documentation.red-gate.com/fd/migrations-271585107.html  
PostgreSQL Global Development Group. 2026. *PostgreSQL Documentation*. https://www.postgresql.org/docs/current/tutorial.html  
React Documentation. 2026. *Quick Start / Learn React*. https://react.dev/learn  
Vite Documentation. 2026. *Getting Started*. https://vite.dev/guide/  
Docker. 2026. *Docker Compose Documentation*. https://docs.docker.com/compose/  
Docker. 2026. *Volumes*. https://docs.docker.com/engine/storage/volumes/  
Nielsen, J. 1994/2024. *10 Usability Heuristics for User Interface Design*. https://www.nngroup.com/articles/ten-usability-heuristics/
