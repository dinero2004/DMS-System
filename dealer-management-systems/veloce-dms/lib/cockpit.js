const ACTIVE_LEAD_STATUSES = new Set(["NEW", "CONTACTED", "NEGOTIATION"]);
const DEALER_STOCK_CLIENT_ID = "00000000-0000-0000-0000-000000000001";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asCents(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildCockpitData(collections, syncedAt = new Date().toISOString()) {
  const clients = asArray(collections.clients);
  const cars = asArray(collections.cars);
  const jobs = asArray(collections.jobs);
  const leads = asArray(collections.leads);
  const invoices = asArray(collections.invoices);
  const contracts = asArray(collections.contracts);
  const financing = asArray(collections.financing);

  const inventory = cars.filter((car) => car.vehicleRole === "FOR_SALE_INVENTORY");
  const activeLeads = leads.filter((lead) => ACTIVE_LEAD_STATUSES.has(lead.status));
  const workshopWip = jobs.filter((job) => job.status !== "DONE");
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "PAID");

  return {
    source: "dealerops-core",
    syncedAt,
    clients,
    cars,
    jobs,
    leads,
    invoices,
    contracts,
    financing,
    summary: {
      customers: clients.filter((client) => client.id !== DEALER_STOCK_CLIENT_ID).length,
      inventoryVehicles: inventory.length,
      inventoryValueCents: inventory.reduce(
        (sum, car) => sum + asCents(car.sellingPriceCents),
        0
      ),
      activeLeads: activeLeads.length,
      workshopWip: workshopWip.length,
      unpaidInvoices: unpaidInvoices.length,
      unpaidInvoiceValueCents: unpaidInvoices.reduce(
        (sum, invoice) => sum + asCents(invoice.amountCents),
        0
      )
    }
  };
}

const CORE_ROUTE_RULES = [
  { pattern: /^\/auth\/(login|logout)$/, methods: new Set(["POST"]) },
  { pattern: /^\/auth\/me$/, methods: new Set(["GET"]) },
  { pattern: /^\/v1\/clients$/, methods: new Set(["GET", "POST"]) },
  { pattern: /^\/v1\/cars$/, methods: new Set(["GET", "POST"]) },
  { pattern: /^\/v1\/workshop\/jobs$/, methods: new Set(["GET", "POST"]) },
  { pattern: /^\/v1\/workshop\/jobs\/[^/]+\/status$/, methods: new Set(["POST"]) },
  { pattern: /^\/v1\/workshop\/jobs\/[^/]+\/items$/, methods: new Set(["POST"]) },
  { pattern: /^\/v1\/sales\/leads$/, methods: new Set(["GET", "POST"]) },
  { pattern: /^\/v1\/sales\/leads\/[^/]+\/status$/, methods: new Set(["POST"]) },
  { pattern: /^\/v1\/sales\/contracts$/, methods: new Set(["GET", "POST"]) },
  { pattern: /^\/v1\/sales\/contracts\/[^/]+\/pdf$/, methods: new Set(["GET"]) },
  { pattern: /^\/v1\/sales\/financing$/, methods: new Set(["GET", "POST"]) },
  { pattern: /^\/v1\/sales\/financing\/[^/]+\/pdf$/, methods: new Set(["GET"]) },
  { pattern: /^\/v1\/finance\/invoices$/, methods: new Set(["GET", "POST"]) },
  { pattern: /^\/v1\/finance\/invoices\/[^/]+\/status$/, methods: new Set(["POST"]) },
  { pattern: /^\/v1\/finance\/invoices\/[^/]+\/pdf$/, methods: new Set(["GET"]) }
];

function isAllowedCoreRoute(corePath, method) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  return CORE_ROUTE_RULES.some(
    (rule) => rule.pattern.test(corePath) && rule.methods.has(normalizedMethod)
  );
}

module.exports = {
  ACTIVE_LEAD_STATUSES,
  DEALER_STOCK_CLIENT_ID,
  buildCockpitData,
  isAllowedCoreRoute
};
