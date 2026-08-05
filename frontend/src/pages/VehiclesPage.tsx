import { Edit3, Plus, RefreshCw, Save, Search, Wrench } from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { ServiceRecord, ServiceRecordPayload, Vehicle, VehiclePayload } from "../types/domain";
import { formatCurrency, formatDate, formatNumber, todayIsoDate } from "../utils";
import { Status } from "../components/Status";

type VehiclesPageProps = {
  vehicles: Vehicle[];
  serviceRecords: ServiceRecord[];
  selectedVehicleId: number | null;
  loading: boolean;
  error: string | null;
  onSelectVehicle: (id: number) => void;
  onRefresh: () => Promise<void>;
  onSaveVehicle: (vehicle: VehiclePayload, id?: number) => Promise<void>;
  onCreateServiceRecord: (record: ServiceRecordPayload) => Promise<void>;
};

const emptyVehicle: VehiclePayload = {
  vin: "",
  manufacturer: "",
  model: "",
  modelYear: new Date().getFullYear(),
  mileageKm: 0,
  fuelType: "Petrol",
  transmission: "Automatic",
  firstRegistrationDate: todayIsoDate(),
  askingPrice: null,
  ownerId: null
};

export function VehiclesPage({
  vehicles,
  serviceRecords,
  selectedVehicleId,
  loading,
  error,
  onSelectVehicle,
  onRefresh,
  onSaveVehicle,
  onCreateServiceRecord
}: VehiclesPageProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"create" | "edit">("create");
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0] ?? null;
  const filteredVehicles = useMemo(() => {
    const lowerQuery = query.trim().toLowerCase();
    if (!lowerQuery) {
      return vehicles;
    }
    return vehicles.filter((vehicle) =>
      [vehicle.vin, vehicle.manufacturer, vehicle.model, String(vehicle.modelYear)]
        .join(" ")
        .toLowerCase()
        .includes(lowerQuery)
    );
  }, [query, vehicles]);

  return (
    <section className="page-stack">
      <div className="toolbar">
        <label className="search-field">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search vehicles" />
        </label>
        <button className="button secondary" onClick={() => void onRefresh()} type="button">
          <RefreshCw size={16} />
          Refresh
        </button>
        <button className="button primary" onClick={() => setMode("create")} type="button">
          <Plus size={16} />
          Add vehicle
        </button>
      </div>

      <Status loading={loading} error={error} empty={!loading && filteredVehicles.length === 0} />

      <div className="vehicle-layout">
        <section className="panel vehicle-list-panel">
          <div className="panel-header">
            <div>
              <h2>Vehicle list</h2>
              <p>{filteredVehicles.length} shown</p>
            </div>
          </div>
          <div className="vehicle-list">
            {filteredVehicles.map((vehicle) => (
              <button
                className={`vehicle-row ${selectedVehicle?.id === vehicle.id ? "active" : ""}`}
                key={vehicle.id}
                onClick={() => {
                  onSelectVehicle(vehicle.id);
                  setMode("edit");
                }}
                type="button"
              >
                <span>
                  <strong>{vehicle.manufacturer} {vehicle.model}</strong>
                  <small>{vehicle.vin}</small>
                </span>
                <span className="right-stack">
                  <strong>{formatCurrency(vehicle.askingPrice)}</strong>
                  <small>{formatNumber(vehicle.mileageKm)} km</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="detail-column">
          {selectedVehicle && (
            <VehicleDetail
              vehicle={selectedVehicle}
              serviceRecords={serviceRecords.filter((record) => record.vehicleId === selectedVehicle.id)}
              onEdit={() => setMode("edit")}
              onCreateServiceRecord={onCreateServiceRecord}
            />
          )}

          <VehicleForm
            key={`${mode}-${selectedVehicle?.id ?? "new"}`}
            mode={mode}
            vehicle={mode === "edit" ? selectedVehicle : null}
            onSubmit={onSaveVehicle}
          />
        </section>
      </div>
    </section>
  );
}

function VehicleDetail({
  vehicle,
  serviceRecords,
  onEdit,
  onCreateServiceRecord
}: {
  vehicle: Vehicle;
  serviceRecords: ServiceRecord[];
  onEdit: () => void;
  onCreateServiceRecord: (record: ServiceRecordPayload) => Promise<void>;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{vehicle.manufacturer} {vehicle.model}</h2>
          <p>{vehicle.vin}</p>
        </div>
        <button className="button secondary" onClick={onEdit} type="button">
          <Edit3 size={16} />
          Edit
        </button>
      </div>
      <div className="detail-grid">
        <Info label="Year" value={String(vehicle.modelYear)} />
        <Info label="Mileage" value={`${formatNumber(vehicle.mileageKm)} km`} />
        <Info label="Fuel" value={vehicle.fuelType} />
        <Info label="Transmission" value={vehicle.transmission} />
        <Info label="Registered" value={formatDate(vehicle.firstRegistrationDate)} />
        <Info label="Asking price" value={formatCurrency(vehicle.askingPrice)} />
      </div>
      <ServiceHistory key={vehicle.id} vehicle={vehicle} records={serviceRecords} onCreate={onCreateServiceRecord} />
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-cell">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VehicleForm({
  mode,
  vehicle,
  onSubmit
}: {
  mode: "create" | "edit";
  vehicle: Vehicle | null;
  onSubmit: (vehicle: VehiclePayload, id?: number) => Promise<void>;
}) {
  const [form, setForm] = useState<VehiclePayload>(
    vehicle
      ? {
          vin: vehicle.vin,
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          modelYear: vehicle.modelYear,
          mileageKm: vehicle.mileageKm,
          fuelType: vehicle.fuelType,
          transmission: vehicle.transmission,
          firstRegistrationDate: vehicle.firstRegistrationDate,
          askingPrice: vehicle.askingPrice,
          ownerId: vehicle.owner?.id ?? null
        }
      : emptyVehicle
  );
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form, mode === "edit" ? vehicle?.id : undefined);
      if (mode === "create") {
        setForm(emptyVehicle);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{mode === "edit" ? "Edit vehicle" : "Add vehicle"}</h2>
          <p>{mode === "edit" ? vehicle?.vin : "New inventory record"}</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <TextField label="VIN" value={form.vin} onChange={(vin) => setForm({ ...form, vin })} maxLength={17} />
        <TextField label="Manufacturer" value={form.manufacturer} onChange={(manufacturer) => setForm({ ...form, manufacturer })} />
        <TextField label="Model" value={form.model} onChange={(model) => setForm({ ...form, model })} />
        <NumberField label="Model year" value={form.modelYear} onChange={(modelYear) => setForm({ ...form, modelYear })} />
        <NumberField label="Mileage km" value={form.mileageKm} onChange={(mileageKm) => setForm({ ...form, mileageKm })} />
        <TextField label="Fuel type" value={form.fuelType} onChange={(fuelType) => setForm({ ...form, fuelType })} />
        <TextField label="Transmission" value={form.transmission} onChange={(transmission) => setForm({ ...form, transmission })} />
        <DateField label="First registration" value={form.firstRegistrationDate ?? ""} onChange={(firstRegistrationDate) => setForm({ ...form, firstRegistrationDate })} />
        <NumberField label="Asking price" value={form.askingPrice ?? 0} onChange={(askingPrice) => setForm({ ...form, askingPrice })} />
        <div className="form-actions">
          <button className="button primary" disabled={saving} type="submit">
            <Save size={16} />
            {saving ? "Saving" : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ServiceHistory({
  vehicle,
  records,
  onCreate
}: {
  vehicle: Vehicle;
  records: ServiceRecord[];
  onCreate: (record: ServiceRecordPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<ServiceRecordPayload>({
    vehicleId: vehicle.id,
    serviceDate: todayIsoDate(),
    mileageKm: vehicle.mileageKm,
    description: "",
    performedBy: "",
    cost: null
  });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreate({ ...form, vehicleId: vehicle.id });
      setForm({
        vehicleId: vehicle.id,
        serviceDate: todayIsoDate(),
        mileageKm: vehicle.mileageKm,
        description: "",
        performedBy: "",
        cost: null
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="service-section">
      <div className="section-title">
        <Wrench size={16} />
        <h3>Service history</h3>
      </div>
      <div className="service-list">
        {records.map((record) => (
          <div className="service-row" key={record.id}>
            <span>
              <strong>{formatDate(record.serviceDate)}</strong>
              <small>{record.description}</small>
            </span>
            <span className="right-stack">
              <strong>{formatNumber(record.mileageKm)} km</strong>
              <small>{formatCurrency(record.cost)}</small>
            </span>
          </div>
        ))}
        {records.length === 0 && <div className="state-line">No service records</div>}
      </div>

      <form className="service-form" onSubmit={(event) => void submit(event)}>
        <DateField label="Date" value={form.serviceDate} onChange={(serviceDate) => setForm({ ...form, serviceDate })} />
        <NumberField label="Mileage" value={form.mileageKm} onChange={(mileageKm) => setForm({ ...form, mileageKm })} />
        <TextField label="Description" value={form.description} onChange={(description) => setForm({ ...form, description })} />
        <TextField label="Workshop" value={form.performedBy ?? ""} onChange={(performedBy) => setForm({ ...form, performedBy })} />
        <NumberField label="Cost" value={form.cost ?? 0} onChange={(cost) => setForm({ ...form, cost })} />
        <button className="button secondary" disabled={saving} type="submit">
          <Plus size={16} />
          Add
        </button>
      </form>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input maxLength={maxLength} required value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input required type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
