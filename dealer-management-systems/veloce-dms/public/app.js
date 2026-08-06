const app = document.querySelector("#app");
const DEALER_STOCK_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

const views = [
  ["dashboard", "My work"],
  ["vehicles", "Vehicles"],
  ["customers", "Customers"],
  ["sales", "Sales"],
  ["workshop", "Workshop"],
  ["invoices", "Finance"]
];

const state = {
  user: null,
  data: null,
  view: "dashboard",
  query: "",
  dialog: null,
  dialogData: null,
  busy: false,
  notice: "",
  error: "",
  navOpen: false
};

const money = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 0
});

const dateTime = new Intl.DateTimeFormat("en-CH", {
  dateStyle: "medium",
  timeStyle: "short"
});

function text(value) {
  return String(value ?? "");
}

function escapeHtml(value) {
  return text(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatMoney(cents) {
  return money.format(Number(cents || 0) / 100);
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? escapeHtml(value) : dateTime.format(parsed);
}

function chip(value) {
  const status = text(value).toUpperCase();
  const tone = ["WON", "PAID", "DONE"].includes(status)
    ? "blue"
    : ["LOST", "OVERDUE"].includes(status)
      ? "red"
      : ["NEGOTIATION", "POSTED", "IN_PROGRESS"].includes(status)
        ? "amber"
        : "";
  return `<span class="chip ${tone}">${escapeHtml(status.replaceAll("_", " "))}</span>`;
}

function customerName(client) {
  return client?.displayName || [client?.firstName, client?.lastName].filter(Boolean).join(" ") || "Unassigned customer";
}

function carName(car) {
  return [car?.modelYear, car?.make, car?.model].filter(Boolean).join(" ") || "Unassigned vehicle";
}

function matchesQuery(...values) {
  const query = state.query.trim().toLowerCase();
  if (!query) return true;
  return values.flat(Infinity).map(text).join(" ").toLowerCase().includes(query);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get("content-type") || "";
  const responseText = await response.text();
  let payload = responseText;
  if (contentType.includes("application/json") && responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = responseText;
    }
  }
  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadCockpit() {
  state.data = await api("/api/cockpit");
}

async function refresh(message = "") {
  state.busy = true;
  state.error = "";
  render();
  try {
    await loadCockpit();
    state.notice = message;
  } catch (error) {
    state.error = error.message;
    if (error.status === 401) state.user = null;
  } finally {
    state.busy = false;
    render();
  }
}

function metric(label, value, hint) {
  return `
    <article class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </article>
  `;
}

function empty(message) {
  return `<div class="empty">${escapeHtml(message)}</div>`;
}

function actionButton(label, action, data = {}, secondary = false) {
  const attributes = Object.entries(data)
    .map(([key, value]) => `data-${key}="${escapeHtml(value)}"`)
    .join(" ");
  return `<button class="button ${secondary ? "secondary" : ""}" type="button" data-action="${action}" ${attributes}>${escapeHtml(label)}</button>`;
}

function panelHeader(title, subtitle, action = "") {
  return `
    <div class="panel-header">
      <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div>
      ${action}
    </div>
  `;
}

function renderDashboard() {
  const { summary, jobs, leads, invoices } = state.data;
  const workshop = jobs.filter((job) => job.status !== "DONE").slice(0, 5);
  const sales = leads.filter((lead) => !["WON", "LOST"].includes(lead.status)).slice(0, 5);
  const finance = invoices.filter((invoice) => invoice.status !== "PAID").slice(0, 4);

  return `
    <section class="metric-grid">
      ${metric("Retail stock", summary.inventoryVehicles, formatMoney(summary.inventoryValueCents))}
      ${metric("Active opportunities", summary.activeLeads, "Won and lost excluded")}
      ${metric("Workshop WIP", summary.workshopWip, "Open and in progress")}
      ${metric("Unpaid invoices", summary.unpaidInvoices, formatMoney(summary.unpaidInvoiceValueCents))}
    </section>
    <section class="grid-two">
      <article class="panel">
        ${panelHeader("Workshop attention", `${workshop.length} current jobs`, actionButton("Open workshop", "view", { view: "workshop" }, true))}
        <div class="list">
          ${workshop.length ? workshop.map((job) => `
            <div class="list-row">
              <div><strong>${escapeHtml(job.title)}</strong><span>${escapeHtml(customerName(job.client))} · ${escapeHtml(carName(job.car))}</span></div>
              ${chip(job.status)}
            </div>
          `).join("") : empty("No workshop jobs need attention.")}
        </div>
      </article>
      <article class="panel">
        ${panelHeader("Sales follow-up", `${sales.length} active leads`, actionButton("Open sales", "view", { view: "sales" }, true))}
        <div class="list">
          ${sales.length ? sales.map((lead) => `
            <div class="list-row">
              <div><strong>${escapeHtml(customerName(lead.client))}</strong><span>${escapeHtml(lead.interestModel || carName(lead.car))}</span></div>
              ${chip(lead.status)}
            </div>
          `).join("") : empty("No active sales follow-ups.")}
        </div>
      </article>
    </section>
    <article class="panel">
      ${panelHeader("Finance exceptions", "Invoices still requiring action")}
      <div class="list compact-list">
        ${finance.length ? finance.map((invoice) => `
          <div class="list-row">
            <div><strong>${escapeHtml(invoice.invoiceNumber)}</strong><span>${escapeHtml(customerName(invoice.client))} · ${escapeHtml(invoice.referenceType)}</span></div>
            <div class="row-end"><strong>${formatMoney(invoice.amountCents)}</strong>${chip(invoice.status)}</div>
          </div>
        `).join("") : empty("No finance exceptions.")}
      </div>
    </article>
  `;
}

function renderVehicles() {
  const clients = new Map(state.data.clients.map((client) => [client.id, client]));
  const cars = state.data.cars.filter((car) => matchesQuery(
    carName(car), car.vin, car.plate, car.vehicleRole, car.color, customerName(clients.get(car.clientId))
  ));
  return `
    <section class="panel">
      ${panelHeader("Vehicle workspace", `${cars.length} matching vehicles`)}
      <div class="table-wrap"><table>
        <thead><tr><th>Vehicle</th><th>Owner</th><th>Role</th><th>Mileage</th><th>Selling price</th></tr></thead>
        <tbody>${cars.map((car) => `
          <tr>
            <td><strong>${escapeHtml(carName(car))}</strong><small>${escapeHtml(car.vin || "VIN missing")} · ${escapeHtml(car.plate || "No plate")}</small></td>
            <td>${escapeHtml(customerName(clients.get(car.clientId)))}</td>
            <td>${chip(car.vehicleRole === "FOR_SALE_INVENTORY" ? "Retail stock" : "Customer vehicle")}</td>
            <td>${escapeHtml(car.mileageKm ?? "—")} km</td>
            <td>${car.sellingPriceCents ? formatMoney(car.sellingPriceCents) : "—"}</td>
          </tr>
        `).join("")}</tbody>
      </table></div>
      ${cars.length ? "" : empty("No vehicles match this filter.")}
    </section>
  `;
}

function renderCustomers() {
  const clients = state.data.clients
    .filter((client) => client.id !== DEALER_STOCK_CLIENT_ID)
    .filter((client) => matchesQuery(customerName(client), client.phone, client.email, client.city, client.zipCode));
  return `
    <section class="panel">
      ${panelHeader("Customer directory", `${clients.length} matching customers`, actionButton("New customer", "open-dialog", { dialog: "customer" }))}
      <div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Location</th></tr></thead>
        <tbody>${clients.map((client) => `
          <tr>
            <td><strong>${escapeHtml(customerName(client))}</strong><small>${escapeHtml(client.id)}</small></td>
            <td>${escapeHtml(client.phone || "—")}</td>
            <td>${escapeHtml(client.email || "—")}</td>
            <td>${escapeHtml([client.zipCode, client.city].filter(Boolean).join(" ") || "—")}</td>
          </tr>
        `).join("")}</tbody>
      </table></div>
      ${clients.length ? "" : empty("No customers match this filter.")}
    </section>
  `;
}

const leadNextStatus = {
  NEW: "CONTACTED",
  CONTACTED: "NEGOTIATION",
  NEGOTIATION: "WON"
};

function renderSales() {
  const leads = state.data.leads.filter((lead) => matchesQuery(
    customerName(lead.client), carName(lead.car), lead.interestModel, lead.leadSource, lead.notes, lead.status
  ));
  const contractLeadIds = new Set(state.data.contracts.map((contract) => contract.leadId).filter(Boolean));
  return `
    <section class="panel">
      ${panelHeader("Sales pipeline", `${leads.length} matching opportunities`, actionButton("New lead", "open-dialog", { dialog: "lead" }))}
      <div class="table-wrap"><table>
        <thead><tr><th>Customer</th><th>Vehicle / interest</th><th>Source</th><th>Status</th><th>Next action</th></tr></thead>
        <tbody>${leads.map((lead) => {
          const next = leadNextStatus[lead.status];
          const hasContract = contractLeadIds.has(lead.id);
          let actions = "";
          if (next) {
            actions += actionButton(`Move to ${next.toLowerCase()}`, "lead-status", { id: lead.id, status: next });
            actions += actionButton("Mark lost", "lead-status", { id: lead.id, status: "LOST" }, true);
          } else if (lead.status === "WON" && !hasContract) {
            actions = actionButton("Create contract", "open-contract", { id: lead.id });
          } else if (hasContract) {
            actions = `<span class="success-text">Contract created</span>`;
          }
          return `
            <tr>
              <td><strong>${escapeHtml(customerName(lead.client))}</strong><small>${escapeHtml(lead.id)}</small></td>
              <td>${escapeHtml(lead.interestModel || carName(lead.car))}<small>${escapeHtml(carName(lead.car))}</small></td>
              <td>${escapeHtml(lead.leadSource || "—")}</td>
              <td>${chip(lead.status)}</td>
              <td><div class="actions">${actions || "—"}</div></td>
            </tr>
          `;
        }).join("")}</tbody>
      </table></div>
      ${leads.length ? "" : empty("No sales opportunities match this filter.")}
    </section>
  `;
}

const jobNextStatus = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "DONE"
};

function renderWorkshop() {
  const jobs = state.data.jobs.filter((job) => matchesQuery(
    job.title, job.description, customerName(job.client), carName(job.car), job.status,
    job.items?.map((item) => [item.name, item.artNr])
  ));
  const invoicedReferences = new Set(state.data.invoices.map((invoice) => invoice.referenceId));
  return `
    <section class="panel">
      ${panelHeader("Workshop job board", `${jobs.length} matching repair orders`, actionButton("New workshop job", "open-dialog", { dialog: "job" }))}
      <div class="table-wrap"><table>
        <thead><tr><th>Repair order</th><th>Customer / vehicle</th><th>Items</th><th>Total</th><th>Status</th><th>Next action</th></tr></thead>
        <tbody>${jobs.map((job) => {
          const next = jobNextStatus[job.status];
          const invoiced = invoicedReferences.has(job.id);
          let action = next
            ? actionButton(next === "IN_PROGRESS" ? "Start work" : "Complete job", "job-status", { id: job.id, status: next })
            : invoiced
              ? `<span class="success-text">Invoice created</span>`
              : Number(job.totalCents || 0) > 0
                ? actionButton("Create invoice", "job-invoice", { id: job.id, amount: job.totalCents })
                : `<span class="success-text">Add a billable item in DealerOps</span>`;
          return `
            <tr>
              <td><strong>${escapeHtml(job.title)}</strong><small>${escapeHtml(job.description || job.id)}</small></td>
              <td>${escapeHtml(customerName(job.client))}<small>${escapeHtml(carName(job.car))}</small></td>
              <td>${escapeHtml(job.items?.length || 0)}</td>
              <td>${formatMoney(job.totalCents)}</td>
              <td>${chip(job.status)}</td>
              <td>${action}</td>
            </tr>
          `;
        }).join("")}</tbody>
      </table></div>
      ${jobs.length ? "" : empty("No workshop jobs match this filter.")}
    </section>
  `;
}

const invoiceNextStatus = {
  DRAFT: "POSTED",
  POSTED: "PAID"
};

function renderInvoices() {
  const invoices = state.data.invoices.filter((invoice) => matchesQuery(
    invoice.invoiceNumber, customerName(invoice.client), invoice.referenceType,
    invoice.referenceId, invoice.status, invoice.amountCents
  ));
  return `
    <section class="panel">
      ${panelHeader("Finance control", `${invoices.length} matching invoices`)}
      <div class="table-wrap"><table>
        <thead><tr><th>Invoice</th><th>Customer</th><th>Reference</th><th>Amount</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
        <tbody>${invoices.map((invoice) => {
          const next = invoiceNextStatus[invoice.status];
          return `
            <tr>
              <td><strong>${escapeHtml(invoice.invoiceNumber)}</strong><small>${escapeHtml(invoice.id)}</small></td>
              <td>${escapeHtml(customerName(invoice.client))}</td>
              <td>${escapeHtml(invoice.referenceType)}<small>${escapeHtml(invoice.referenceId)}</small></td>
              <td>${formatMoney(invoice.amountCents)}</td>
              <td>${chip(invoice.status)}</td>
              <td>${formatDate(invoice.createdAt)}</td>
              <td><div class="actions">
                ${next ? actionButton(next === "POSTED" ? "Post" : "Mark paid", "invoice-status", { id: invoice.id, status: next }) : ""}
                <a class="button secondary" href="/api/core/v1/finance/invoices/${encodeURIComponent(invoice.id)}/pdf" target="_blank" rel="noopener">PDF</a>
              </div></td>
            </tr>
          `;
        }).join("")}</tbody>
      </table></div>
      ${invoices.length ? "" : empty("No invoices match this filter.")}
    </section>
  `;
}

function option(value, label, selected = false) {
  return `<option value="${escapeHtml(value)}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function dialogShell(title, copy, fields, submitLabel, formName) {
  return `
    <div class="modal-backdrop" data-action="close-dialog">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div class="modal-header">
          <div><h2 id="dialog-title">${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div>
          <button class="icon-button" type="button" data-action="close-dialog" aria-label="Close dialog">×</button>
        </div>
        <form class="form-grid" data-form="${formName}">
          ${fields}
          <div class="form-actions">
            <button class="button secondary" type="button" data-action="close-dialog">Cancel</button>
            <button class="button" type="submit" ${state.busy ? "disabled" : ""}>${escapeHtml(submitLabel)}</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function field(label, name, type = "text", options = {}) {
  const attributes = [
    options.required ? "required" : "",
    options.placeholder ? `placeholder="${escapeHtml(options.placeholder)}"` : "",
    options.value !== undefined ? `value="${escapeHtml(options.value)}"` : "",
    options.min !== undefined ? `min="${escapeHtml(options.min)}"` : "",
    options.step !== undefined ? `step="${escapeHtml(options.step)}"` : ""
  ].filter(Boolean).join(" ");
  return `<label class="field ${options.wide ? "wide" : ""}"><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${escapeHtml(type)}" ${attributes}></label>`;
}

function selectField(label, name, optionsHtml, required = false, wide = false) {
  return `<label class="field ${wide ? "wide" : ""}"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}" ${required ? "required" : ""}>${optionsHtml}</select></label>`;
}

function textareaField(label, name, placeholder = "") {
  return `<label class="field wide"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}" placeholder="${escapeHtml(placeholder)}"></textarea></label>`;
}

function renderDialog() {
  if (!state.dialog || !state.data) return "";
  const customers = state.data.clients.filter((client) => client.id !== DEALER_STOCK_CLIENT_ID);
  const customerOptions = `<option value="">Choose a customer</option>${customers.map((client) => option(client.id, customerName(client))).join("")}`;
  const carOptions = `<option value="">Choose a vehicle</option>${state.data.cars.map((car) => {
    const owner = customers.find((client) => client.id === car.clientId);
    return option(car.id, `${carName(car)} — ${customerName(owner)}`);
  }).join("")}`;

  if (state.dialog === "job") {
    return dialogShell(
      "New workshop job",
      "Create the repair order in DealerOps. The selected vehicle must belong to the customer.",
      selectField("Customer", "clientId", customerOptions, true) +
      selectField("Vehicle", "carId", carOptions, true) +
      field("Job title", "title", "text", { required: true, wide: true, placeholder: "e.g. Annual service and brake inspection" }) +
      textareaField("Customer concern / instructions", "description", "Describe the requested work and promised outcome") +
      field("First billable item", "itemName", "text", { required: true, placeholder: "Labor operation or part" }) +
      field("Item price (CHF)", "itemPrice", "number", { required: true, min: 0.01, step: "0.01", value: 150 }),
      "Create repair order",
      "job"
    );
  }

  if (state.dialog === "lead") {
    const inventoryOptions = `<option value="">No vehicle selected</option>${state.data.cars
      .filter((car) => car.vehicleRole === "FOR_SALE_INVENTORY")
      .map((car) => option(car.id, `${carName(car)} — ${formatMoney(car.sellingPriceCents)}`)).join("")}`;
    return dialogShell(
      "New sales lead",
      "Capture the opportunity once. Veloce will use the same DealerOps customer and inventory records.",
      selectField("Customer", "clientId", customerOptions, true) +
      selectField("Inventory vehicle", "carId", inventoryOptions) +
      field("Interest model", "interestModel", "text", { placeholder: "Alternative model or requirement" }) +
      field("Lead source", "leadSource", "text", { value: "Showroom" }) +
      textareaField("Notes", "notes", "Next step, trade-in, financing, or customer preference"),
      "Create lead",
      "lead"
    );
  }

  if (state.dialog === "customer") {
    return dialogShell(
      "New customer",
      "Create one customer record for sales and workshop use.",
      field("First name", "firstName", "text", { required: true }) +
      field("Last name", "lastName", "text", { required: true }) +
      field("Phone", "phone", "tel") +
      field("Email", "email", "email") +
      field("Address", "addressLine", "text", { wide: true }) +
      field("Postcode", "zipCode", "text") +
      field("City", "city", "text"),
      "Create customer",
      "customer"
    );
  }

  if (state.dialog === "contract") {
    const lead = state.dialogData;
    const suggestedPrice = Number(lead?.car?.sellingPriceCents || 0) / 100;
    return dialogShell(
      "Create sales contract",
      `Create a contract for ${customerName(lead?.client)} and ${carName(lead?.car)}.`,
      `<input type="hidden" name="leadId" value="${escapeHtml(lead?.id)}">` +
      `<input type="hidden" name="clientId" value="${escapeHtml(lead?.client?.id)}">` +
      `<input type="hidden" name="carId" value="${escapeHtml(lead?.car?.id)}">` +
      field("Selling price (CHF)", "sellingPrice", "number", { required: true, min: 1, step: "0.01", value: suggestedPrice }) +
      field("Preparation fee (CHF)", "prepFee", "number", { min: 0, step: "0.01", value: 0 }) +
      field("Insurance company", "insuranceCompany", "text") +
      field("Registration plate", "registrationPlate", "text") +
      textareaField("Contract notes", "notes", "Delivery, accessories, conditions, or financing notes"),
      "Create contract",
      "contract"
    );
  }
  return "";
}

function renderLogin() {
  app.innerHTML = `
    <main class="login-layout">
      <section class="login-brand">
        <span class="eyebrow">Veloce Cockpit</span>
        <h1>The focused front door to your dealership.</h1>
        <p>Sales, workshop, inventory, and finance workflows connected to the DealerOps system of record.</p>
        <div class="core-badge"><span></span> DealerOps PostgreSQL core</div>
      </section>
      <section class="login-card">
        <div><h2>Sign in</h2><p>Use your DealerOps account. Demo credentials are prefilled for this workspace.</p></div>
        ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
        <form class="login-form" data-form="login">
          ${field("Username", "username", "text", { required: true, value: "demo", wide: true })}
          ${field("Password", "password", "password", { required: true, value: "demo", wide: true })}
          <button class="button" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Signing in…" : "Sign in to cockpit"}</button>
        </form>
      </section>
    </main>
  `;
}

function renderShell(innerHtml) {
  const label = views.find(([id]) => id === state.view)?.[1] || "My work";
  app.innerHTML = `
    <div class="app-shell ${state.navOpen ? "nav-open" : ""}">
      <aside class="sidebar">
        <div class="brand"><strong>Veloce Cockpit</strong><span>Zurich Showroom</span></div>
        <div class="nav-label">Workspace</div>
        <nav class="nav">
          ${views.map(([id, viewLabel]) => `<button class="${state.view === id ? "active" : ""}" type="button" data-action="view" data-view="${id}">${escapeHtml(viewLabel)}</button>`).join("")}
        </nav>
        <div class="user-card">
          <strong>${escapeHtml(state.user?.username || "DealerOps user")}</strong>
          <span>Authenticated via DealerOps</span>
          <button type="button" data-action="logout">Sign out</button>
        </div>
      </aside>
      <section class="content">
        <header class="mobile-header">
          <button class="icon-button" type="button" data-action="toggle-nav" aria-label="Open navigation">☰</button>
          <strong>Veloce Cockpit</strong>
        </header>
        <header class="topbar">
          <div>
            <div class="heading-row"><h1>${escapeHtml(label)}</h1><span class="source-badge">DealerOps live</span></div>
            <p>Synced ${formatDate(state.data.syncedAt)} · PostgreSQL system of record</p>
          </div>
          <div class="topbar-actions">
            <input class="search" type="search" aria-label="Filter current workspace" placeholder="Filter ${escapeHtml(label.toLowerCase())}" value="${escapeHtml(state.query)}">
            <button class="icon-button" type="button" data-action="refresh" aria-label="Refresh data">↻</button>
          </div>
        </header>
        ${state.notice ? `<div class="alert success">${escapeHtml(state.notice)}</div>` : ""}
        ${state.error ? `<div class="alert error">${escapeHtml(state.error)}</div>` : ""}
        ${state.busy ? `<div class="loading-bar" aria-label="Loading"></div>` : ""}
        ${innerHtml}
      </section>
      ${renderDialog()}
    </div>
  `;
}

function render() {
  if (!state.user) {
    renderLogin();
    return;
  }
  if (!state.data) {
    app.innerHTML = `<main class="boot"><p>Connecting Veloce Cockpit to DealerOps…</p></main>`;
    return;
  }
  const renderer = {
    dashboard: renderDashboard,
    vehicles: renderVehicles,
    customers: renderCustomers,
    sales: renderSales,
    workshop: renderWorkshop,
    invoices: renderInvoices
  }[state.view] || renderDashboard;
  renderShell(renderer());
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function cents(value) {
  return Math.round(Number(value || 0) * 100);
}

async function mutate(path, body, successMessage) {
  state.busy = true;
  state.error = "";
  render();
  try {
    await api(path, { method: "POST", body: JSON.stringify(body) });
    state.dialog = null;
    state.dialogData = null;
    await loadCockpit();
    state.notice = successMessage;
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "view") {
    state.view = target.dataset.view;
    state.query = "";
    state.notice = "";
    state.error = "";
    state.navOpen = false;
    render();
  } else if (action === "toggle-nav") {
    state.navOpen = !state.navOpen;
    render();
  } else if (action === "refresh") {
    await refresh("Live DealerOps data refreshed.");
  } else if (action === "open-dialog") {
    state.dialog = target.dataset.dialog;
    state.dialogData = null;
    render();
  } else if (action === "close-dialog") {
    if (event.target !== target && target.classList.contains("modal-backdrop")) return;
    state.dialog = null;
    state.dialogData = null;
    render();
  } else if (action === "open-contract") {
    state.dialogData = state.data.leads.find((lead) => lead.id === target.dataset.id);
    state.dialog = "contract";
    render();
  } else if (action === "lead-status") {
    await mutate(`/api/core/v1/sales/leads/${encodeURIComponent(target.dataset.id)}/status`, { status: target.dataset.status }, `Lead moved to ${target.dataset.status}.`);
  } else if (action === "job-status") {
    await mutate(`/api/core/v1/workshop/jobs/${encodeURIComponent(target.dataset.id)}/status`, { status: target.dataset.status }, `Workshop job moved to ${target.dataset.status.replaceAll("_", " ")}.`);
  } else if (action === "job-invoice") {
    const amountCents = Math.max(1, Number(target.dataset.amount || 0));
    await mutate("/api/core/v1/finance/invoices", {
      referenceType: "WORKSHOP_JOB",
      referenceId: target.dataset.id,
      amountCents,
      currency: "CHF"
    }, "Workshop invoice created as a draft.");
  } else if (action === "invoice-status") {
    await mutate(`/api/core/v1/finance/invoices/${encodeURIComponent(target.dataset.id)}/status`, { status: target.dataset.status }, `Invoice moved to ${target.dataset.status}.`);
  } else if (action === "logout") {
    try { await api("/api/core/auth/logout", { method: "POST" }); } catch { /* local state still clears */ }
    state.user = null;
    state.data = null;
    state.notice = "";
    state.error = "";
    render();
  }
});

app.addEventListener("input", (event) => {
  if (!event.target.matches(".search")) return;
  const cursor = event.target.selectionStart;
  state.query = event.target.value;
  render();
  const next = document.querySelector(".search");
  next?.focus();
  next?.setSelectionRange(cursor, cursor);
});

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-form]");
  if (!form) return;
  event.preventDefault();
  const values = formObject(form);

  if (form.dataset.form === "login") {
    state.busy = true;
    state.error = "";
    render();
    try {
      state.user = await api("/api/core/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: values.username, password: values.password })
      });
      await loadCockpit();
    } catch (error) {
      state.user = null;
      state.error = error.status === 401 ? "The DealerOps username or password is incorrect." : error.message;
    } finally {
      state.busy = false;
      render();
    }
  } else if (form.dataset.form === "job") {
    const items = values.itemName ? [{
      itemType: "SERVICE",
      name: values.itemName,
      quantity: 1,
      unit: "Stk",
      unitPriceCents: cents(values.itemPrice),
      discountPct: 0
    }] : [];
    await mutate("/api/core/v1/workshop/jobs", {
      clientId: values.clientId,
      carId: values.carId,
      title: values.title,
      description: values.description,
      items
    }, "Workshop repair order created.");
  } else if (form.dataset.form === "lead") {
    await mutate("/api/core/v1/sales/leads", {
      clientId: values.clientId,
      carId: values.carId || null,
      interestModel: values.interestModel,
      leadSource: values.leadSource,
      notes: values.notes
    }, "Sales lead created.");
  } else if (form.dataset.form === "customer") {
    await mutate("/api/core/v1/clients", values, "Customer created in DealerOps.");
  } else if (form.dataset.form === "contract") {
    await mutate("/api/core/v1/sales/contracts", {
      leadId: values.leadId,
      clientId: values.clientId,
      carId: values.carId || null,
      sellingPriceCents: cents(values.sellingPrice),
      prepFeeCents: cents(values.prepFee),
      insuranceCompany: values.insuranceCompany,
      registrationPlate: values.registrationPlate,
      contractDate: new Date().toISOString().slice(0, 10),
      notes: values.notes
    }, "Sales contract created.");
  }
});

async function init() {
  try {
    state.user = await api("/api/core/auth/me");
    await loadCockpit();
  } catch (error) {
    if (error.status !== 401) state.error = error.message;
    state.user = null;
  }
  render();
}

init();
