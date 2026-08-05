import { Activity, Car, ClipboardList, Gauge, Wrench } from "lucide-react";
import type React from "react";
import type { ManufacturerProtocol, ServiceRecord, Vehicle } from "../types/domain";
import { formatCurrency, formatDate, formatNumber } from "../utils";

type DashboardPageProps = {
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  protocols: ManufacturerProtocol[];
  onOpenVehicles: () => void;
  onOpenValuation: () => void;
};

export function DashboardPage({
  vehicles,
  serviceRecords,
  protocols,
  onOpenVehicles,
  onOpenValuation
}: DashboardPageProps) {
  const averageAskingPrice =
    vehicles.length === 0
      ? 0
      : vehicles.reduce((total, vehicle) => total + (vehicle.askingPrice ?? 0), 0) / vehicles.length;
  const latestService = [...serviceRecords].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))[0];

  return (
    <section className="page-stack">
      <div className="metric-grid">
        <Metric icon={Car} label="Vehicles" value={formatNumber(vehicles.length)} />
        <Metric icon={Wrench} label="Service records" value={formatNumber(serviceRecords.length)} />
        <Metric icon={ClipboardList} label="Protocols" value={formatNumber(protocols.length)} />
        <Metric icon={Gauge} label="Avg asking price" value={formatCurrency(averageAskingPrice)} />
      </div>

      <div className="split-layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Active inventory</h2>
              <p>{vehicles.length} vehicle records</p>
            </div>
            <button className="button secondary" onClick={onOpenVehicles} type="button">
              <Car size={16} />
              Vehicles
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Year</th>
                  <th>Mileage</th>
                  <th>Ask</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.slice(0, 6).map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <strong>{vehicle.manufacturer} {vehicle.model}</strong>
                      <span>{vehicle.vin}</span>
                    </td>
                    <td>{vehicle.modelYear}</td>
                    <td>{formatNumber(vehicle.mileageKm)} km</td>
                    <td>{formatCurrency(vehicle.askingPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Valuation readiness</h2>
              <p>{protocols.length} manufacturer protocols</p>
            </div>
            <button className="button primary" onClick={onOpenValuation} type="button">
              <Gauge size={16} />
              Valuation
            </button>
          </div>
          <div className="readiness-list">
            <ReadinessItem label="Market references" value="Loaded from backend" good />
            <ReadinessItem label="Manufacturer protocols" value={`${protocols.length} available`} good={protocols.length > 0} />
            <ReadinessItem
              label="Latest service"
              value={latestService ? `${formatDate(latestService.serviceDate)} · ${latestService.vehicleVin}` : "n/a"}
              good={Boolean(latestService)}
            />
            <ReadinessItem label="Rule engine" value="Explainable scoring" good />
          </div>
        </section>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ReadinessItem({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className="readiness-item">
      <Activity size={16} />
      <span>{label}</span>
      <strong className={good ? "ok" : "warn"}>{value}</strong>
    </div>
  );
}
