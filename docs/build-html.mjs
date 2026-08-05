import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { marked } from 'marked'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const mdPath = path.join(__dirname, 'DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.md')
const outPath = path.join(__dirname, 'DOKUMENTATION_DESIGN_PATTERNS_UND_STRUKTUR.html')

const md = fs.readFileSync(mdPath, 'utf8')
const body = marked.parse(md)

const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Design Patterns &amp; Struktur — DMS</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    h1, h2, h3 { line-height: 1.25; }
    code, pre { background: rgba(128,128,128,.15); border-radius: 4px; }
    pre { padding: 1rem; overflow: auto; font-size: 0.85rem; }
    table { border-collapse: collapse; width: 100%; font-size: 0.9rem; margin: 1rem 0; }
    th, td { border: 1px solid rgba(128,128,128,.4); padding: 0.4rem 0.6rem; text-align: left; }
    @media print {
      body { margin: 12mm; max-width: none; }
      a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.75em; color: #555; }
    }
  </style>
</head>
<body>
${body}
<hr/>
<p><small>Drucken: Browser-Menü → Drucken → „Als PDF speichern“ (Chrome/Safari/Edge).</small></p>
</body>
</html>`

fs.writeFileSync(outPath, html, 'utf8')
console.log('Written:', outPath)
