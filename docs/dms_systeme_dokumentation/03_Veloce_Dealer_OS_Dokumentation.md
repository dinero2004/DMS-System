# Systemdokumentation 3: Veloce Dealer OS

Stand: 05.08.2026  
Docker-Web/API: `http://localhost:15175`

## AI-Assisted Documentation and Co-Development Statement

Diese Systemdokumentation wurde mit Unterstützung von OpenAI Codex (Codex AI) erstellt. Das dazugehörige DMS-Codeprojekt wurde in einem KI-gestützten Co-Development-Prozess konzipiert, analysiert, strukturiert und mitentwickelt. Codex unterstützte insbesondere bei technischer Dokumentationsstruktur, Codeanalyse, Docker-/GitHub-Aufbereitung und branchspezifischer Organisation. Fachliche Zielsetzung, Projektausrichtung, Auswahlentscheidungen, Prüfung und finale Verantwortung liegen beim Projektverfasser Lazar Minkov.

## 1. Kurzbeschreibung

Veloce Dealer OS ist das leichteste der drei Systeme. Es ist kein vollständiges Spring- oder React-System, sondern ein schlankes Dashboard auf Basis eines exportierten JSON-Datensatzes.

Das System zeigt, wie ein DMS-Datenbestand schnell sichtbar gemacht werden kann, ohne sofort eine relationale Datenbank, ein großes Backend oder einen Build-Prozess einzusetzen.

## 2. Fachlicher Zweck

Veloce beantwortet im Kern die Frage:

Wie kann ein vorhandener Händlerdaten-Export schnell als nutzbare DMS-Oberfläche visualisiert werden?

Das System zeigt:

- Dashboard-Kennzahlen
- Fahrzeuge
- Kunden
- Deals
- Werkstattjobs
- Rechnungen
- Aufgaben
- Audit- und Einstellungsdaten

## 3. Technologiestack

| Bereich | Technologie | Hinweis |
| --- | --- | --- |
| Server | Node.js HTTP-Modul | kein Express, kein Framework |
| Datenbasis | JSON | `data/seed.json` |
| Frontend | HTML, CSS, Vanilla JavaScript | keine Build-Toolchain |
| Container | Node 22 Alpine | ein Container für API und statische Dateien |
| Styling | CSS Custom Properties | einfache Design-Tokens |

## 4. Warum diese Technologien hier passen

Veloce ist bewusst klein gehalten. Ein System, das hauptsächlich exportierte Daten sichtbar machen soll, benötigt nicht zwingend sofort Spring Boot, PostgreSQL oder React.

Node.js mit dem eingebauten HTTP-Modul reicht hier aus, weil:

- statische Dateien ausgeliefert werden,
- JSON-Endpunkte bereitgestellt werden,
- keine komplexe Authentifizierung umgesetzt ist,
- die Daten aus einer Datei gelesen werden,
- das System vor allem als Daten- und UI-Demo dient.

Vanilla JavaScript reicht im Frontend aus, weil die Anwendung überschaubar ist. Die UI wird direkt aus Daten gerendert. Das ist für einen Lernkontext hilfreich, weil sichtbar bleibt, was im Browser passiert.

## 5. Technische Struktur

```text
veloce-dms/
  server.js
  package.json
  Dockerfile
  data/
    seed.json
  public/
    index.html
    styles.css
    app.js
```

Das System ist in zwei Teile gegliedert:

| Datei / Ordner | Aufgabe |
| --- | --- |
| `server.js` | HTTP-Server, API-Routen, statische Dateiauslieferung |
| `data/seed.json` | Datenquelle |
| `public/app.js` | Rendering der Oberfläche im Browser |
| `public/styles.css` | Layout und Design |
| `public/index.html` | Einstiegspunkt der UI |

## 6. API-Oberfläche

Veloce stellt mehrere JSON-Endpunkte bereit:

| Pfad | Inhalt |
| --- | --- |
| `/health` | einfacher Healthcheck |
| `/api/data` | kompletter Datensatz |
| `/api/summary` | berechnete Kennzahlen |
| `/api/customers` | Kunden |
| `/api/vehicles` | Fahrzeuge |
| `/api/deals` | Verkaufschancen |
| `/api/jobs` | Werkstattjobs |
| `/api/invoices` | Rechnungen |
| `/api/tasks` | Aufgaben |
| `/api/audit` | Audit-Daten |
| `/api/settings` | Anzeige- und Benutzereinstellungen |

Die API ist dateibasiert. Bei jeder Anfrage wird `seed.json` geladen und ausgewertet. Für kleine Demos ist das ausreichend; für produktive Nutzung wäre eine Datenbank sinnvoller.

## 7. Datenlogik

Die Datei `server.js` berechnet aus dem JSON-Datensatz eine Summary:

- Anzahl Kunden
- Anzahl Fahrzeuge
- offene Deals
- Werkstattjobs
- offene Aufgaben
- Inventarwert
- gewichtete Verkaufspipeline
- Rechnungssumme

Diese Kennzahlen werden im Dashboard verwendet. Damit zeigt Veloce, dass ein DMS nicht nur Datensätze anzeigen sollte, sondern daraus operative Übersicht erzeugen kann.

## 8. Frontend-Logik

Das Frontend in `public/app.js` rendert die Anwendung direkt in das Element `#app`.

Der Ablauf ist:

1. Daten von der API laden.
2. Daten im lokalen State speichern.
3. Sidebar und Hauptbereich rendern.
4. Je nach gewählter View andere Tabellen oder Kennzahlen anzeigen.
5. Suchbegriff aus dem Suchfeld übernehmen.
6. Gefilterte Daten neu rendern.

Das ist eine sehr direkte Architektur. Sie ist gut verständlich, aber bei wachsender Anwendung weniger skalierbar als React.

## 9. Docker-Verwaltung

Veloce besteht aus einem einzigen Docker-Service:

| Service | Container | Zweck |
| --- | --- | --- |
| `veloce-web` | `veloce-dms-web` | Node.js-Server für API und UI |

Port:

| Dienst | Host-Port | Container-Port |
| --- | ---: | ---: |
| Web/API | 15175 | 8080 |

Start:

```bash
cd /Users/lazarminkov/Documents/DMS_System_DEMO/dealer-management-systems
docker compose up -d veloce-web
```

Der Container enthält die Daten aus `data/seed.json`. Es gibt kein Docker-Volume, weil die Anwendung keine Datenbank schreibt.

## 10. Designrichtung

Veloce verwendet ein helles, klares Dashboard-Design:

- helle Hintergrundfläche
- dunkle Sidebar
- Karten für Metriken
- Tabellen für Fahrzeuge, Deals und Aufgaben
- farbige Statuschips
- klare Suchfunktion

Die Designrichtung passt zum Zweck: Veloce soll Daten schnell prüfbar machen. Die Oberfläche ist weniger dekorativ und weniger komplex als DealerOps. Dadurch ist sie besonders gut als Demonstrator oder Vergleichssystem geeignet.

## 11. Vorteile und Nachteile des Systems

Vorteile:

- sehr einfacher Aufbau
- schnell startbar
- kein Datenbanksetup nötig
- gut als Visualisierung eines Exportdatensatzes
- leicht zu erklären und zu warten
- geringer Docker-Aufwand

Nachteile:

- keine persistente Datenbank
- keine echte Mehrbenutzerfähigkeit
- keine Typisierung im Frontend
- kein komponentenbasiertes UI-System
- bei wachsender Komplexität schwerer wartbar
- JSON-Datei als Datenquelle ist für echte DMS-Prozesse begrenzt

## 12. Aufbauanleitung für Studierende

Ein ähnliches System eignet sich als erster Schritt vor einem größeren DMS.

Empfohlener Ablauf:

1. Einen Beispieldatensatz als JSON definieren.
2. Einen kleinen Node.js-HTTP-Server erstellen.
3. Statische Dateien aus einem `public`-Ordner ausliefern.
4. API-Routen für wichtige Datenlisten bereitstellen.
5. Eine Summary-Funktion für Kennzahlen schreiben.
6. Frontend mit Sidebar, Dashboard und Tabellen erstellen.
7. Suche und Filter ergänzen.
8. Das System in einen Node-Docker-Container packen.
9. Später entscheiden, ob React und PostgreSQL nötig werden.

## 13. Wann Veloce die richtige Wahl ist

Veloce ist sinnvoll, wenn:

- schnell ein Datenbestand gezeigt werden soll,
- noch keine Datenbankarchitektur feststeht,
- ein Prototyp in kurzer Zeit sichtbar werden muss,
- ein Exportdatensatz analysiert werden soll,
- die DMS-Idee zunächst visuell geprüft werden soll.

Veloce ist weniger geeignet, wenn:

- mehrere Benutzer gleichzeitig Daten bearbeiten,
- echte Transaktionen nötig sind,
- Berechtigungen wichtig werden,
- langfristige Datenintegrität erforderlich ist,
- komplexe Formulare und Workflows entstehen.

## 14. Geeignete Weiterentwicklung

- Datenbank einführen, z. B. PostgreSQL
- Express oder Fastify als Serverframework ergänzen
- TypeScript verwenden
- React-Frontend einführen
- Importfunktion für neue Exportdateien bauen
- Authentifizierung ergänzen
- Audit-Log persistent speichern

## 15. Quellen

Node.js. 2026. *HTTP Module Documentation*. https://nodejs.org/api/http.html  
Docker. 2026. *Docker Compose Documentation*. https://docs.docker.com/compose/  
Docker. 2026. *Networking in Compose*. https://docs.docker.com/compose/how-tos/networking/  
nginx. 2026. *Beginner's Guide*. https://nginx.org/en/docs/beginners_guide.html  
Nielsen, J. 1994/2024. *10 Usability Heuristics for User Interface Design*. https://www.nngroup.com/articles/ten-usability-heuristics/
