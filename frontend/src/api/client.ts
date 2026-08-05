import type {
  ManufacturerProtocol,
  ManufacturerProtocolPayload,
  MarketReference,
  ServiceRecord,
  ServiceRecordPayload,
  ValuationSuggestion,
  Vehicle,
  VehiclePayload
} from "../types/domain";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? "GET", `${API_BASE_URL}${path}`);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(xhr.responseText || `Request failed with status ${xhr.status}`));
        return;
      }
      if (xhr.status === 204 || xhr.responseText.length === 0) {
        resolve(undefined as T);
        return;
      }
      resolve(JSON.parse(xhr.responseText) as T);
    };

    xhr.onerror = () => reject(new Error("Backend request failed"));
    xhr.send(options.body as XMLHttpRequestBodyInit | null | undefined);
  });
}

export const api = {
  listVehicles: () => request<Vehicle[]>("/api/vehicles"),
  getVehicle: (id: number) => request<Vehicle>(`/api/vehicles/${id}`),
  createVehicle: (payload: VehiclePayload) =>
    request<Vehicle>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateVehicle: (id: number, payload: VehiclePayload) =>
    request<Vehicle>(`/api/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  listServiceRecords: (vehicleId?: number) =>
    request<ServiceRecord[]>(vehicleId ? `/api/service-records?vehicleId=${vehicleId}` : "/api/service-records"),
  createServiceRecord: (payload: ServiceRecordPayload) =>
    request<ServiceRecord>("/api/service-records", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  listManufacturerProtocols: () => request<ManufacturerProtocol[]>("/api/manufacturer-protocols"),
  createManufacturerProtocol: (payload: ManufacturerProtocolPayload) =>
    request<ManufacturerProtocol>("/api/manufacturer-protocols", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  listMarketReferences: () => request<MarketReference[]>("/api/market-references"),
  suggestValuation: (vehicleId: number) =>
    request<ValuationSuggestion>("/api/vehicle-valuations/suggest", {
      method: "POST",
      body: JSON.stringify({ vehicleId })
    })
};
