const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const { buildCockpitData, isAllowedCoreRoute } = require("./lib/cockpit");

const port = Number(process.env.PORT || 8080);
const coreBaseUrl = String(process.env.DMS_BACKEND_URL || "http://dealerops-api:8080").replace(/\/$/, "");
const requestTimeoutMs = Number(process.env.DMS_BACKEND_TIMEOUT_MS || 8000);
const publicDir = path.join(__dirname, "public");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

const cockpitCollections = {
  clients: "/api/v1/clients",
  cars: "/api/v1/cars",
  jobs: "/api/v1/workshop/jobs",
  leads: "/api/v1/sales/leads",
  invoices: "/api/v1/finance/invoices",
  contracts: "/api/v1/sales/contracts",
  financing: "/api/v1/sales/financing"
};

class CoreRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function securityHeaders(contentType) {
  const headers = {
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN"
  };
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

function sendJson(response, payload, status = 200, extraHeaders = {}) {
  response.writeHead(status, {
    ...securityHeaders("application/json; charset=utf-8"),
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new CoreRequestError(413, "Request body is too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function fetchCore(corePath, options = {}) {
  try {
    return await fetch(`${coreBaseUrl}${corePath}`, {
      ...options,
      signal: AbortSignal.timeout(requestTimeoutMs)
    });
  } catch (error) {
    throw new CoreRequestError(502, `DealerOps core is unavailable: ${error.message}`);
  }
}

async function loadCoreJson(corePath, cookie) {
  const coreResponse = await fetchCore(corePath, {
    headers: cookie ? { Cookie: cookie } : {}
  });
  if (!coreResponse.ok) {
    const message = coreResponse.status === 401
      ? "Sign in to DealerOps to load live cockpit data"
      : `DealerOps returned ${coreResponse.status} for ${corePath}`;
    throw new CoreRequestError(coreResponse.status, message);
  }
  return coreResponse.json();
}

async function handleCockpit(request, response) {
  const cookie = request.headers.cookie || "";
  const entries = await Promise.all(
    Object.entries(cockpitCollections).map(async ([key, corePath]) => [
      key,
      await loadCoreJson(corePath, cookie)
    ])
  );
  sendJson(response, buildCockpitData(Object.fromEntries(entries)));
}

async function proxyCore(request, response, url) {
  const corePath = url.pathname.slice("/api/core".length);
  const method = String(request.method || "GET").toUpperCase();
  if (!isAllowedCoreRoute(corePath, method)) {
    sendJson(response, { error: "Core route is not allowed" }, 403);
    return;
  }

  const headers = { Accept: request.headers.accept || "application/json" };
  if (request.headers.cookie) headers.Cookie = request.headers.cookie;
  if (request.headers["content-type"]) headers["Content-Type"] = request.headers["content-type"];
  if (request.headers["accept-language"]) headers["Accept-Language"] = request.headers["accept-language"];

  const body = method === "GET" || method === "HEAD" ? undefined : await readBody(request);
  const targetPath = `/api${corePath}${url.search}`;
  const coreResponse = await fetchCore(targetPath, { method, headers, body });
  const responseHeaders = securityHeaders(coreResponse.headers.get("content-type") || "application/json; charset=utf-8");
  responseHeaders["Cache-Control"] = "no-store";

  const contentDisposition = coreResponse.headers.get("content-disposition");
  if (contentDisposition) responseHeaders["Content-Disposition"] = contentDisposition;
  const setCookie = coreResponse.headers.get("set-cookie");
  if (setCookie) responseHeaders["Set-Cookie"] = setCookie;

  response.writeHead(coreResponse.status, responseHeaders);
  response.end(Buffer.from(await coreResponse.arrayBuffer()));
}

async function handleHealth(response) {
  let core = "DOWN";
  try {
    const result = await fetchCore("/actuator/health");
    core = result.ok ? "UP" : "DOWN";
  } catch {
    core = "DOWN";
  }
  sendJson(response, {
    status: "UP",
    service: "veloce-cockpit",
    systemOfRecord: "dealerops-core",
    core
  });
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, body) => {
    if (error) {
      response.writeHead(404, securityHeaders("text/plain; charset=utf-8"));
      response.end("Not found");
      return;
    }
    const type = contentTypes[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, {
      ...securityHeaders(type),
      "Cache-Control": "no-cache"
    });
    response.end(body);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  try {
    if (url.pathname === "/health") {
      await handleHealth(response);
      return;
    }
    if (url.pathname === "/api/cockpit") {
      if (request.method !== "GET") {
        sendJson(response, { error: "Method not allowed" }, 405);
        return;
      }
      await handleCockpit(request, response);
      return;
    }
    if (url.pathname.startsWith("/api/core/")) {
      await proxyCore(request, response, url);
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      sendJson(response, { error: "API route not found" }, 404);
      return;
    }

    const requestedPath = url.pathname === "/" ? "index.html" : url.pathname.replace(/^[/\\]+/, "");
    const normalizedPath = path.normalize(requestedPath);
    const filePath = path.join(publicDir, normalizedPath);
    const relativePath = path.relative(publicDir, filePath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      response.writeHead(403, securityHeaders("text/plain; charset=utf-8"));
      response.end("Forbidden");
      return;
    }
    sendFile(response, filePath);
  } catch (error) {
    const status = error instanceof CoreRequestError ? error.status : 500;
    sendJson(response, { error: error.message || "Unexpected server error" }, status);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Veloce Cockpit listening on ${port}; DealerOps core: ${coreBaseUrl}`);
});
