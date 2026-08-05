import { AlertTriangle, CheckCircle2, Gauge, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Status } from "../components/Status";
import type { ValuationSuggestion, Vehicle } from "../types/domain";
import { formatCurrency, formatNumber } from "../utils";

type ValuationPageProps = {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  onSuggest: (vehicleId: number) => Promise<ValuationSuggestion>;
};

export function ValuationPage({ vehicles, loading, error, onSuggest }: ValuationPageProps) {
  const [vehicleId, setVehicleId] = useState<number>(vehicles[0]?.id ?? 0);
  const [suggestion, setSuggestion] = useState<ValuationSuggestion | null>(null);
  const [running, setRunning] = useState(false);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId) ?? vehicles[0] ?? null;

  useEffect(() => {
    if (vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.id === vehicleId)) {
      setVehicleId(vehicles[0].id);
    }
  }, [vehicleId, vehicles]);

  async function runValuation() {
    if (!selectedVehicle) {
      return;
    }
    setRunning(true);
    try {
      setSuggestion(await onSuggest(selectedVehicle.id));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="page-stack">
      <Status loading={loading} error={error} empty={!loading && vehicles.length === 0} />
      <section className="panel valuation-panel">
        <div className="panel-header">
          <div>
            <h2>Vehicle valuation</h2>
            <p>{selectedVehicle ? `${selectedVehicle.manufacturer} ${selectedVehicle.model}` : "No vehicle selected"}</p>
          </div>
          <button className="button primary" disabled={!selectedVehicle || running} onClick={() => void runValuation()} type="button">
            {running ? <RefreshCw className="spin" size={16} /> : <Gauge size={16} />}
            {running ? "Calculating" : "Run valuation"}
          </button>
        </div>

        <div className="valuation-input-row">
          <label className="field">
            <span>Vehicle</span>
            <select value={selectedVehicle?.id ?? ""} onChange={(event) => setVehicleId(Number(event.target.value))}>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.manufacturer} {vehicle.model} · {vehicle.vin}
                </option>
              ))}
            </select>
          </label>
          {selectedVehicle && (
            <div className="valuation-context">
              <Info label="Mileage" value={`${formatNumber(selectedVehicle.mileageKm)} km`} />
              <Info label="Asking price" value={formatCurrency(selectedVehicle.askingPrice)} />
              <Info label="Year" value={String(selectedVehicle.modelYear)} />
            </div>
          )}
        </div>
      </section>

      {suggestion && (
        <section className="valuation-result">
          <div className="valuation-score">
            <span>Suggested price</span>
            <strong>{formatCurrency(suggestion.suggestedPrice)}</strong>
            <div className="confidence-bar" aria-label={`Confidence ${suggestion.confidenceScore}`}>
              <span style={{ width: `${suggestion.confidenceScore}%` }} />
            </div>
            <small>{suggestion.confidenceScore}/100 confidence</small>
          </div>

          <div className="factor-grid">
            <FactorList title="Positive factors" icon={TrendingUp} items={suggestion.positiveFactors} tone="positive" />
            <FactorList title="Negative factors" icon={TrendingDown} items={suggestion.negativeFactors} tone="negative" />
            <FactorList title="Missing data" icon={AlertTriangle} items={suggestion.missingDataWarnings} tone="warning" />
          </div>

          <section className="panel explanation-panel">
            <div className="section-title">
              <CheckCircle2 size={16} />
              <h3>Explanation</h3>
            </div>
            <p>{suggestion.explanation}</p>
          </section>
        </section>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="mini-info">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FactorList({
  title,
  icon: Icon,
  items,
  tone
}: {
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  items: string[];
  tone: "positive" | "negative" | "warning";
}) {
  return (
    <section className={`panel factor-list ${tone}`}>
      <div className="section-title">
        <Icon size={16} />
        <h3>{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="state-line">None</div>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
