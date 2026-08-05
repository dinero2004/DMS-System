import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import type { PageKey } from "./pages/pageTypes";
import { ProtocolsPage } from "./pages/ProtocolsPage";
import { ValuationPage } from "./pages/ValuationPage";
import { VehiclesPage } from "./pages/VehiclesPage";
import type {
  ManufacturerProtocol,
  ManufacturerProtocolPayload,
  MarketReference,
  ServiceRecord,
  ServiceRecordPayload,
  ValuationSuggestion,
  Vehicle,
  VehiclePayload
} from "./types/domain";

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [protocols, setProtocols] = useState<ManufacturerProtocol[]>([]);
  const [marketReferences, setMarketReferences] = useState<MarketReference[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleData, serviceData, protocolData, marketData] = await Promise.all([
        api.listVehicles(),
        api.listServiceRecords(),
        api.listManufacturerProtocols(),
        api.listMarketReferences()
      ]);
      setVehicles(vehicleData);
      setServiceRecords(serviceData);
      setProtocols(protocolData);
      setMarketReferences(marketData);
      setSelectedVehicleId((current) => current ?? vehicleData[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Backend request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  async function saveVehicle(payload: VehiclePayload, id?: number) {
    setError(null);
    const saved = id ? await api.updateVehicle(id, payload) : await api.createVehicle(payload);
    await refreshData();
    setSelectedVehicleId(saved.id);
  }

  async function createServiceRecord(payload: ServiceRecordPayload) {
    setError(null);
    await api.createServiceRecord(payload);
    await refreshData();
  }

  async function createProtocol(payload: ManufacturerProtocolPayload) {
    setError(null);
    await api.createManufacturerProtocol(payload);
    await refreshData();
  }

  async function suggestValuation(vehicleId: number): Promise<ValuationSuggestion> {
    setError(null);
    return api.suggestValuation(vehicleId);
  }

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {activePage === "dashboard" && (
        <DashboardPage
          vehicles={vehicles}
          serviceRecords={serviceRecords}
          protocols={protocols}
          onOpenVehicles={() => setActivePage("vehicles")}
          onOpenValuation={() => setActivePage("valuation")}
        />
      )}

      {activePage === "vehicles" && (
        <VehiclesPage
          vehicles={vehicles}
          serviceRecords={serviceRecords}
          selectedVehicleId={selectedVehicleId}
          loading={loading}
          error={error}
          onSelectVehicle={setSelectedVehicleId}
          onRefresh={refreshData}
          onSaveVehicle={saveVehicle}
          onCreateServiceRecord={createServiceRecord}
        />
      )}

      {activePage === "valuation" && (
        <ValuationPage vehicles={vehicles} loading={loading} error={error} onSuggest={suggestValuation} />
      )}

      {activePage === "protocols" && (
        <ProtocolsPage
          protocols={protocols}
          loading={loading}
          error={error}
          onRefresh={refreshData}
          onCreateProtocol={createProtocol}
        />
      )}

      {marketReferences.length > 0 && <div className="footer-note">{marketReferences.length} market references loaded</div>}
    </AppShell>
  );
}
