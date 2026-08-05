export type OwnerSummary = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
};

export type Vehicle = {
  id: number;
  vin: string;
  manufacturer: string;
  model: string;
  modelYear: number;
  mileageKm: number;
  fuelType: string;
  transmission: string;
  firstRegistrationDate: string | null;
  askingPrice: number | null;
  owner: OwnerSummary | null;
  createdAt: string;
};

export type VehiclePayload = {
  vin: string;
  manufacturer: string;
  model: string;
  modelYear: number;
  mileageKm: number;
  fuelType: string;
  transmission: string;
  firstRegistrationDate: string | null;
  askingPrice: number | null;
  ownerId?: number | null;
};

export type ServiceRecord = {
  id: number;
  vehicleId: number;
  vehicleVin: string;
  serviceDate: string;
  mileageKm: number;
  description: string;
  performedBy: string | null;
  cost: number | null;
};

export type ServiceRecordPayload = {
  vehicleId: number;
  serviceDate: string;
  mileageKm: number;
  description: string;
  performedBy: string | null;
  cost: number | null;
};

export type ManufacturerProtocol = {
  id: number;
  manufacturer: string;
  model: string;
  generation: string | null;
  inspectionChecklist: string;
  knownIssues: string | null;
  valuationGuidance: string | null;
};

export type ManufacturerProtocolPayload = {
  manufacturer: string;
  model: string;
  generation: string | null;
  inspectionChecklist: string;
  knownIssues: string | null;
  valuationGuidance: string | null;
};

export type MarketReference = {
  id: number;
  manufacturer: string;
  model: string;
  modelYear: number;
  mileageMinKm: number | null;
  mileageMaxKm: number | null;
  referencePrice: number;
  source: string;
  observedAt: string;
  notes: string | null;
};

export type ValuationSuggestion = {
  vehicleId: number;
  vehicleVin: string;
  manufacturer: string;
  model: string;
  modelYear: number;
  mileageKm: number;
  manufacturerProtocolId: number | null;
  marketReferenceIds: number[];
  serviceRecordCount: number;
  suggestedPrice: number;
  confidenceScore: number;
  positiveFactors: string[];
  negativeFactors: string[];
  missingDataWarnings: string[];
  explanation: string;
};

export type DashboardStats = {
  vehicles: number;
  serviceRecords: number;
  protocols: number;
  averageAskingPrice: number;
};
