const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.env.PORT || 8080);
const rootDir = __dirname;
const publicDir = path.join(rootDir, "public");
const dataPath = path.join(rootDir, "data", "seed.json");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function loadData() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function summary(data) {
  const vehicles = data.vehicles || [];
  const deals = data.deals || [];
  const invoices = data.invoices || [];
  const jobs = data.jobs || [];
  const tasks = data.tasks || [];
  const inventoryValue = vehicles.reduce((sum, vehicle) => sum + Number(vehicle.askingPrice || 0), 0);
  const openPipeline = deals
    .filter((deal) => deal.stage !== "Won")
    .reduce((sum, deal) => sum + Number(deal.offeredPrice || 0) * (Number(deal.probability || 0) / 100), 0);
  const invoiceTotal = invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  return {
    customers: (data.customers || []).length,
    vehicles: vehicles.length,
    openDeals: deals.filter((deal) => deal.stage !== "Won").length,
    workshopJobs: jobs.length,
    openTasks: tasks.filter((task) => !task.done).length,
    inventoryValue,
    openPipeline,
    invoiceTotal
  };
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const type = contentTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": type });
    response.end(body);
  });
}

function routeApi(requestPath, response) {
  const data = loadData();
  const routes = {
    "/api/data": data,
    "/api/summary": summary(data),
    "/api/customers": data.customers || [],
    "/api/vehicles": data.vehicles || [],
    "/api/deals": data.deals || [],
    "/api/jobs": data.jobs || [],
    "/api/invoices": data.invoices || [],
    "/api/tasks": data.tasks || [],
    "/api/audit": data.audit || [],
    "/api/settings": data.settings || {}
  };

  if (requestPath === "/health") {
    sendJson(response, { status: "UP", service: "veloce-dealer-os" });
    return true;
  }

  if (Object.prototype.hasOwnProperty.call(routes, requestPath)) {
    sendJson(response, routes[requestPath]);
    return true;
  }

  return false;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  try {
    if (url.pathname.startsWith("/api/") || url.pathname === "/health") {
      if (!routeApi(url.pathname, response)) {
        sendJson(response, { error: "API route not found" }, 404);
      }
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(publicDir, safePath);

    if (!filePath.startsWith(publicDir)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    sendFile(response, filePath);
  } catch (error) {
    sendJson(response, { error: error.message }, 500);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Veloce Dealer OS listening on ${port}`);
});
