const test = require("node:test");
const assert = require("node:assert/strict");

const { buildCockpitData, isAllowedCoreRoute } = require("../lib/cockpit");

test("cockpit summary uses only active leads and retail inventory", () => {
  const result = buildCockpitData({
    clients: [{ id: "00000000-0000-0000-0000-000000000001" }, { id: "c-1" }],
    cars: [
      { vehicleRole: "FOR_SALE_INVENTORY", sellingPriceCents: 2_000_000 },
      { vehicleRole: "CUSTOMER_OWNED", sellingPriceCents: 9_000_000 }
    ],
    leads: [
      { status: "NEW" },
      { status: "NEGOTIATION" },
      { status: "WON" },
      { status: "LOST" }
    ],
    jobs: [{ status: "OPEN" }, { status: "IN_PROGRESS" }, { status: "DONE" }],
    invoices: [
      { status: "DRAFT", amountCents: 120_000 },
      { status: "POSTED", amountCents: 80_000 },
      { status: "PAID", amountCents: 900_000 }
    ]
  }, "2026-08-06T10:00:00.000Z");

  assert.equal(result.summary.customers, 1);
  assert.equal(result.summary.inventoryVehicles, 1);
  assert.equal(result.summary.inventoryValueCents, 2_000_000);
  assert.equal(result.summary.activeLeads, 2);
  assert.equal(result.summary.workshopWip, 2);
  assert.equal(result.summary.unpaidInvoices, 2);
  assert.equal(result.summary.unpaidInvoiceValueCents, 200_000);
});

test("core proxy allowlist permits workflow routes and rejects broad access", () => {
  assert.equal(isAllowedCoreRoute("/auth/login", "POST"), true);
  assert.equal(isAllowedCoreRoute("/v1/workshop/jobs/job-1/status", "POST"), true);
  assert.equal(isAllowedCoreRoute("/v1/sales/leads/lead-1/status", "POST"), true);
  assert.equal(isAllowedCoreRoute("/v1/finance/invoices/inv-1/pdf", "GET"), true);
  assert.equal(isAllowedCoreRoute("/v1/clients", "DELETE"), false);
  assert.equal(isAllowedCoreRoute("/actuator/env", "GET"), false);
  assert.equal(isAllowedCoreRoute("/../internal", "GET"), false);
});
