const app = document.querySelector("#app");

const views = [
  ["dashboard", "Dashboard"],
  ["vehicles", "Vehicles"],
  ["customers", "Customers"],
  ["deals", "Deals"],
  ["workshop", "Workshop"],
  ["invoices", "Invoices"],
  ["tasks", "Tasks"]
];

const state = {
  data: null,
  view: "dashboard",
  query: ""
};

const money = new Intl.NumberFormat("de-CH", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 0
});

function byId(items = []) {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

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

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function chip(value) {
  const lower = text(value).toLowerCase();
  const tone = lower.includes("won") || lower.includes("paid") || lower.includes("done")
    ? "blue"
    : lower.includes("high") || lower.includes("overdue")
      ? "red"
      : lower.includes("contract") || lower.includes("sent")
        ? "amber"
        : "";
  return `<span class="chip ${tone}">${escapeHtml(value)}</span>`;
}

function matches(item) {
  if (!state.query.trim()) return true;
  const query = state.query.trim().toLowerCase();
  return JSON.stringify(item).toLowerCase().includes(query);
}

function renderShell(innerHtml) {
  const settings = state.data.settings || {};
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <strong>Veloce Dealer OS</strong>
          <span>${escapeHtml(settings.branch || "Dealer workspace")}</span>
        </div>
        <div class="nav-label">Modules</div>
        <nav class="nav">
          ${views.map(([id, label]) => `
            <button class="${state.view === id ? "active" : ""}" data-view="${id}" type="button">${label}</button>
          `).join("")}
        </nav>
        <div class="user-card">
          <strong>${escapeHtml(settings.displayName || "Dealer user")}</strong>
          <span>${escapeHtml(settings.role || "DMS operator")}</span>
        </div>
      </aside>
      <section class="content">
        <header class="topbar">
          <div>
            <h1>${views.find(([id]) => id === state.view)?.[1] || "Dashboard"}</h1>
            <p>Live view from the Veloce export data set.</p>
          </div>
          <input class="search" placeholder="Search Veloce records" value="${escapeHtml(state.query)}" />
        </header>
        ${innerHtml}
      </section>
    </div>
  `;

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });
  document.querySelector(".search").addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });
}

function metric(label, value) {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function renderDashboard() {
  const { vehicles, deals, jobs, invoices, tasks } = state.data;
  const summary = state.data.summary;
  const topVehicle = [...vehicles].sort((a, b) => Number(b.askingPrice || 0) - Number(a.askingPrice || 0))[0];
  const openDeals = deals.filter((deal) => deal.stage !== "Won").slice(0, 5);
  const openTasks = tasks.filter((task) => !task.done).slice(0, 5);

  return `
    <section class="metric-grid">
      ${metric("Vehicles", summary.vehicles)}
      ${metric("Customers", summary.customers)}
      ${metric("Open deals", summary.openDeals)}
      ${metric("Inventory value", formatMoney(summary.inventoryValue))}
    </section>
    <section class="grid-two">
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2>Pipeline</h2>
            <p>Weighted open pipeline ${formatMoney(summary.openPipeline)}</p>
          </div>
          ${chip(`${summary.openTasks} open tasks`)}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Deal</th><th>Stage</th><th>Probability</th><th>Offer</th></tr></thead>
            <tbody>
              ${openDeals.map((deal) => `
                <tr>
                  <td><strong>${escapeHtml(customer(deal.customerId).name)}</strong><small>${escapeHtml(vehicleName(deal.vehicleId))}</small></td>
                  <td>${chip(deal.stage)}</td>
                  <td>${escapeHtml(deal.probability)}%</td>
                  <td>${formatMoney(deal.offeredPrice)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </article>
      <article class="panel">
        <div class="panel-header">
          <div>
            <h2>Featured inventory</h2>
            <p>Highest listed vehicle</p>
          </div>
        </div>
        ${topVehicle ? `
          <div class="feature">
            <img src="${escapeHtml(topVehicle.image)}" alt="${escapeHtml(vehicleName(topVehicle.id))}" />
            <div>
              <h3>${escapeHtml(vehicleName(topVehicle.id))}</h3>
              <p>${escapeHtml(topVehicle.stockNumber)} · ${escapeHtml(topVehicle.color)} · ${escapeHtml(topVehicle.conditionScore)} condition score</p>
            </div>
            <strong>${formatMoney(topVehicle.askingPrice)}</strong>
          </div>
        ` : `<div class="empty">No vehicles loaded.</div>`}
      </article>
    </section>
    <section class="grid-two">
      ${listPanel("Workshop jobs", jobs.slice(0, 5).map((job) => [job.title, `${job.status} · ${job.advisor} · due ${job.dueDate}`]))}
      ${listPanel("Tasks", openTasks.map((task) => [task.title, `${task.owner} · ${task.related} · due ${task.dueDate}`]))}
    </section>
  `;
}

function listPanel(title, rows) {
  return `
    <article class="panel">
      <div class="panel-header"><div><h2>${escapeHtml(title)}</h2><p>${rows.length} visible records</p></div></div>
      <div class="list">
        ${rows.length ? rows.map(([name, value]) => `
          <div class="list-row"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(value)}</span></div>
        `).join("") : `<div class="empty">No records.</div>`}
      </div>
    </article>
  `;
}

function customer(id) {
  return state.customerById[id] || { name: "Unassigned customer" };
}

function vehicle(id) {
  return state.vehicleById[id] || {};
}

function vehicleName(id) {
  const record = vehicle(id);
  return [record.year, record.make, record.model].filter(Boolean).join(" ") || "Unassigned vehicle";
}

function tablePanel(title, subtitle, headers, rows) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${rows.join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderVehicles() {
  const rows = state.data.vehicles.filter(matches).map((vehicle) => `
    <tr>
      <td>
        <div class="vehicle-cell">
          <img class="thumb" src="${escapeHtml(vehicle.image)}" alt="${escapeHtml(vehicleName(vehicle.id))}" />
          <div><strong>${escapeHtml(vehicleName(vehicle.id))}</strong><small>${escapeHtml(vehicle.stockNumber)} · ${escapeHtml(vehicle.vin)}</small></div>
        </div>
      </td>
      <td>${escapeHtml(vehicle.mileage)} km</td>
      <td>${formatMoney(vehicle.askingPrice)}</td>
      <td>${chip(vehicle.status)}</td>
      <td>${escapeHtml(vehicle.conditionScore)}</td>
    </tr>
  `);
  return tablePanel("Vehicle inventory", `${rows.length} vehicles`, ["Vehicle", "Mileage", "Ask", "Status", "Condition"], rows);
}

function renderCustomers() {
  const rows = state.data.customers.filter(matches).map((customer) => `
    <tr>
      <td><strong>${escapeHtml(customer.name)}</strong><small>${escapeHtml(customer.type)} · ${escapeHtml(customer.city)}</small></td>
      <td>${escapeHtml(customer.phone)}</td>
      <td>${escapeHtml(customer.email)}</td>
      <td>${escapeHtml(customer.preference)}</td>
      <td>${formatMoney(customer.lifetimeValue)}</td>
    </tr>
  `);
  return tablePanel("Customers", `${rows.length} customers`, ["Customer", "Phone", "Email", "Preference", "Lifetime value"], rows);
}

function renderDeals() {
  const rows = state.data.deals.filter(matches).map((deal) => `
    <tr>
      <td><strong>${escapeHtml(customer(deal.customerId).name)}</strong><small>${escapeHtml(vehicleName(deal.vehicleId))}</small></td>
      <td>${chip(deal.stage)}</td>
      <td>${escapeHtml(deal.source)}</td>
      <td>${escapeHtml(deal.probability)}%</td>
      <td>${formatMoney(deal.offeredPrice)}</td>
      <td>${escapeHtml(deal.expectedClose)}</td>
    </tr>
  `);
  return tablePanel("Deals", `${rows.length} deals`, ["Customer", "Stage", "Source", "Probability", "Offer", "Close"], rows);
}

function renderWorkshop() {
  const rows = state.data.jobs.filter(matches).map((job) => `
    <tr>
      <td><strong>${escapeHtml(job.title)}</strong><small>${escapeHtml(customer(job.customerId).name)} · ${escapeHtml(vehicleName(job.vehicleId))}</small></td>
      <td>${chip(job.status)}</td>
      <td>${chip(job.priority)}</td>
      <td>${escapeHtml(job.advisor)}</td>
      <td>${escapeHtml(job.laborHours)}h</td>
      <td>${formatMoney(Number(job.laborHours || 0) * Number(job.laborRate || 0) + Number(job.parts || 0))}</td>
    </tr>
  `);
  return tablePanel("Workshop jobs", `${rows.length} jobs`, ["Job", "Status", "Priority", "Advisor", "Labor", "Estimate"], rows);
}

function renderInvoices() {
  const rows = state.data.invoices.filter(matches).map((invoice) => `
    <tr>
      <td><strong>${escapeHtml(invoice.id.toUpperCase())}</strong><small>${escapeHtml(invoice.reference)}</small></td>
      <td>${escapeHtml(customer(invoice.customerId).name)}</td>
      <td>${escapeHtml(invoice.category)}</td>
      <td>${formatMoney(invoice.amount)}</td>
      <td>${chip(invoice.status)}</td>
      <td>${escapeHtml(invoice.dueDate)}</td>
    </tr>
  `);
  return tablePanel("Invoices", `${rows.length} invoices`, ["Invoice", "Customer", "Category", "Amount", "Status", "Due"], rows);
}

function renderTasks() {
  const rows = state.data.tasks.filter(matches).map((task) => `
    <tr>
      <td><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.related)}</small></td>
      <td>${escapeHtml(task.owner)}</td>
      <td>${escapeHtml(task.dueDate)}</td>
      <td>${chip(task.done ? "Done" : "Open")}</td>
    </tr>
  `);
  const auditRows = state.data.audit.slice(0, 8).map((entry) => [entry.message, entry.createdAt]);
  return `${tablePanel("Tasks", `${rows.length} tasks`, ["Task", "Owner", "Due", "Status"], rows)}${listPanel("Recent audit", auditRows)}`;
}

function render() {
  if (!state.data) {
    app.innerHTML = `<main class="boot"><p>Loading Veloce Dealer OS...</p></main>`;
    return;
  }

  const viewHtml = {
    dashboard: renderDashboard,
    vehicles: renderVehicles,
    customers: renderCustomers,
    deals: renderDeals,
    workshop: renderWorkshop,
    invoices: renderInvoices,
    tasks: renderTasks
  }[state.view]();

  renderShell(viewHtml);
}

async function init() {
  const [dataResponse, summaryResponse] = await Promise.all([
    fetch("/api/data"),
    fetch("/api/summary")
  ]);
  state.data = await dataResponse.json();
  state.data.summary = await summaryResponse.json();
  state.customerById = byId(state.data.customers);
  state.vehicleById = byId(state.data.vehicles);
  render();
}

init().catch((error) => {
  app.innerHTML = `<main class="boot"><p>Could not load Veloce data: ${escapeHtml(error.message)}</p></main>`;
});
