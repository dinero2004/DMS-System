import { useCallback, useEffect, useMemo, useState } from 'react'
import Dashboard from './Dashboard'
import { CAR_COLORS, TRIM_COLORS, CAR_MAKE_LIST, getModelList, getVersionList, SWISS_VAT_RATE, DEFAULT_PREP_FEE_CHF, WORKSHOP_CATALOG, DURATION_OPTIONS, FUEL_TYPES } from './vehicleData'
import type { ColorOption, CatalogItem } from './vehicleData'
import './App.css'

const DEALER_STOCK_CLIENT_ID = '00000000-0000-0000-0000-000000000001'
const JOB_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'] as const
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'NEGOTIATION', 'WON', 'LOST'] as const
const INVOICE_STATUSES = ['DRAFT', 'POSTED', 'PAID'] as const

type ApiResponse = { id: string; status: string; message: string }
type ClientProfile = { id: string; displayName: string; firstName: string; lastName: string; phone?: string; email?: string; addressLine?: string; zipCode?: string; city?: string; birthday?: string }
type VehicleRole = 'CUSTOMER_OWNED' | 'FOR_SALE_INVENTORY'
type CarProfile = { id: string; clientId: string; branchId?: string; make?: string; model: string; plate?: string; vin?: string; stammnummer?: string; vehicleRole: VehicleRole; modelYear?: number; color?: string; trimColor?: string; mileageKm?: number; notes?: string; purchasePriceCents?: number; catalogPriceCents?: number; usedValueCents?: number; sellingPriceCents?: number; prepFeeCents?: number; arrivalDate?: string; fuelType?: string; firstRegistrationDate?: string }
type JobItemView = { id: string; itemType: string; artNr?: string; name: string; quantity: number; unit: string; unitPriceCents: number; discountPct: number; totalCents: number }
type WorkshopJobView = { id: string; client: ClientProfile; car: CarProfile; title: string; description?: string; status: string; items: JobItemView[]; totalCents: number; createdAt: string }
type SalesLeadView = { id: string; client: ClientProfile; car: CarProfile | null; status: string; interestModel?: string; notes?: string; leadSource?: string; createdAt: string }
type InvoiceView = { id: string; invoiceNumber: string; client: ClientProfile; referenceType: string; referenceId: string; amountCents: number; currency: string; status: string; issuedAt?: string; createdAt: string }
type ContractView = { id: string; leadId: string; client: ClientProfile | null; car: CarProfile | null; sellingPriceCents: number; insuranceCompany?: string; registrationPlate?: string; contractDate: string; notes?: string; createdAt: string }
type FinancingView = { id: string; car: CarProfile | null; client: ClientProfile | null; offerType: string; vehicleValueCents: number; downPaymentCents: number; residualValueCents?: number; residualPct?: number; durationMonths: number; interestRatePct: number; monthlyPaymentCents: number; createdAt: string }
type Page = 'home' | 'service' | 'sales' | 'clients' | 'finance' | 'admin'
type SalesAction = 'inventory' | 'lead' | 'contract' | 'financing'
type JobItem = { key: number; itemType: string; artNr: string; name: string; quantity: string; unit: string; unitPriceCents: string; discountPct: string }

const API = import.meta.env.VITE_API_BASE_URL ?? ''
function fmtChf(cents: number) { return (cents / 100).toFixed(2) }
function fmtVat(cents: number) { const incl = cents / 100; const excl = incl / (1 + SWISS_VAT_RATE); return { incl: incl.toFixed(2), excl: excl.toFixed(2), vat: (incl - excl).toFixed(2) } }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function StatusBadge({ status }: { status: string }) { return <span className={`status-badge status-${status}`}>{status.replace('_', ' ')}</span> }

let itemKeyCounter = 0
function emptyItem(): JobItem { return { key: ++itemKeyCounter, itemType: 'SERVICE', artNr: '', name: '', quantity: '1', unit: 'pc', unitPriceCents: '0', discountPct: '0' } }
function catalogToItem(c: CatalogItem): JobItem { return { key: ++itemKeyCounter, itemType: c.category, artNr: c.artNr, name: c.name, quantity: '1', unit: c.unit, unitPriceCents: String(c.unitPriceCents / 100), discountPct: '0' } }
function itemTotal(it: JobItem) { const q = parseFloat(it.quantity) || 0; const p = parseFloat(it.unitPriceCents) || 0; const d = parseFloat(it.discountPct) || 0; return q * p * (1 - d / 100) }

function formatRate(raw: string): string {
  const n = parseFloat(raw); if (isNaN(n)) return raw
  if (n > 20) return (n / 100).toFixed(2)
  return n.toFixed(2)
}

function ConfirmModal({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3><p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [page, setPage] = useState<Page>('home')
  const [salesAction, setSalesAction] = useState<SalesAction | null>(null)
  const [salesView, setSalesView] = useState<'actions' | 'dashboard'>('actions')
  const [serviceView, setServiceView] = useState<'dashboard' | 'board'>('dashboard')
  const [showJobForm, setShowJobForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('Ready')

  const [clients, setClients] = useState<ClientProfile[]>([])
  const [cars, setCars] = useState<CarProfile[]>([])
  const [jobs, setJobs] = useState<WorkshopJobView[]>([])
  const [leads, setLeads] = useState<SalesLeadView[]>([])
  const [invoices, setInvoices] = useState<InvoiceView[]>([])
  const [contracts, setContracts] = useState<ContractView[]>([])
  const [financingOffers, setFinancingOffers] = useState<FinancingView[]>([])

  // Client form
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState(''); const [email, setEmail] = useState('')
  const [addrLine, setAddrLine] = useState(''); const [zipCode, setZipCode] = useState(''); const [city, setCity] = useState('')
  const [birthday, setBirthday] = useState('')

  // Customer vehicle form
  const [carClientId, setCarClientId] = useState('')
  const [carMake, setCarMake] = useState(''); const [carModel, setCarModel] = useState(''); const [carVersion, setCarVersion] = useState('')
  const [carPlate, setCarPlate] = useState(''); const [carVin, setCarVin] = useState(''); const [carStamm, setCarStamm] = useState(''); const [carBranch, setCarBranch] = useState('')
  const [carYear, setCarYear] = useState(''); const [carColor, setCarColor] = useState(''); const [carColorCustom, setCarColorCustom] = useState('')
  const [carTrimColor, setCarTrimColor] = useState(''); const [carTrimCustom, setCarTrimCustom] = useState('')
  const [carMileage, setCarMileage] = useState(''); const [carNotes, setCarNotes] = useState('')
  const [carFuelType, setCarFuelType] = useState(''); const [carFirstReg, setCarFirstReg] = useState('')

  // Inventory vehicle form
  const [invMake, setInvMake] = useState(''); const [invModel, setInvModel] = useState(''); const [invVersion, setInvVersion] = useState('')
  const [invPlate, setInvPlate] = useState(''); const [invVin, setInvVin] = useState(''); const [invStamm, setInvStamm] = useState('')
  const [invYear, setInvYear] = useState(''); const [invColor, setInvColor] = useState(''); const [invColorCustom, setInvColorCustom] = useState('')
  const [invTrimColor, setInvTrimColor] = useState(''); const [invTrimCustom, setInvTrimCustom] = useState('')
  const [invMileage, setInvMileage] = useState(''); const [invNotes, setInvNotes] = useState('')
  const [invPurchasePrice, setInvPurchasePrice] = useState(''); const [invCatalogPrice, setInvCatalogPrice] = useState('')
  const [invUsedValue, setInvUsedValue] = useState(''); const [invSellingPrice, setInvSellingPrice] = useState('')
  const [invPrepFee, setInvPrepFee] = useState(String(DEFAULT_PREP_FEE_CHF))
  const [invArrivalDate, setInvArrivalDate] = useState('')
  const [invFuelType, setInvFuelType] = useState(''); const [invFirstReg, setInvFirstReg] = useState('')

  // Job form
  const [jobClientId, setJobClientId] = useState(''); const [jobCarId, setJobCarId] = useState('')
  const [jobTitle, setJobTitle] = useState(''); const [jobDesc, setJobDesc] = useState('')
  const [jobItems, setJobItems] = useState<JobItem[]>([])
  const [lastCreatedJobId, setLastCreatedJobId] = useState<string | null>(null)

  // Lead form
  const [leadSearch, setLeadSearch] = useState(''); const [leadSearchResults, setLeadSearchResults] = useState<ClientProfile[]>([])
  const [leadClientId, setLeadClientId] = useState(''); const [leadNewClient, setLeadNewClient] = useState(false)
  const [leadFirstName, setLeadFirstName] = useState(''); const [leadLastName, setLeadLastName] = useState('')
  const [leadPhone, setLeadPhone] = useState(''); const [leadEmail, setLeadEmail] = useState('')
  const [leadCarId, setLeadCarId] = useState(''); const [leadInterest, setLeadInterest] = useState('')
  const [leadNotes, setLeadNotes] = useState(''); const [leadSource, setLeadSource] = useState('')

  // Contract form
  const [ctLeadId, setCtLeadId] = useState(''); const [ctCarId, setCtCarId] = useState('')
  const [ctPrice, setCtPrice] = useState(''); const [ctInsurance, setCtInsurance] = useState('')
  const [ctPlate, setCtPlate] = useState(''); const [ctNotes, setCtNotes] = useState('')
  const [lastCreatedContractId, setLastCreatedContractId] = useState<string | null>(null)

  // Financing form
  const [finType, setFinType] = useState<'LEASING' | 'FINANCING'>('LEASING')
  const [finCarId, setFinCarId] = useState(''); const [finClientId, setFinClientId] = useState('')
  const [finValue, setFinValue] = useState(''); const [finDown, setFinDown] = useState('0')
  const [finResidual, setFinResidual] = useState(''); const [finResidualPct, setFinResidualPct] = useState('')
  const [finDuration, setFinDuration] = useState('36'); const [finCustomDuration, setFinCustomDuration] = useState('')
  const [finRate, setFinRate] = useState('3.49')
  const [finViewMode, setFinViewMode] = useState<'new' | 'existing'>('new')

  // Invoice form
  const [invRefType, setInvRefType] = useState<'WORKSHOP_JOB' | 'SALES_LEAD'>('WORKSHOP_JOB')
  const [invRefId, setInvRefId] = useState(''); const [invAmount, setInvAmount] = useState('')

  // CMS state
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editClient, setEditClient] = useState({ firstName: '', lastName: '', phone: '', email: '', addressLine: '', zipCode: '', city: '', birthday: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'client' | 'car'; id: string; label: string } | null>(null)

  // Clients & Cars view
  const [clientsView, setClientsView] = useState<'choose' | 'database' | 'register'>('choose')
  const [dbSearch, setDbSearch] = useState('')
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null)

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.displayName])), [clients])
  const nonDealerClients = useMemo(() => clients.filter(c => c.id !== DEALER_STOCK_CLIENT_ID), [clients])
  const carsForJob = useMemo(() => cars.filter(c => c.clientId === jobClientId), [cars, jobClientId])
  const inventoryCars = useMemo(() => cars.filter(c => c.vehicleRole === 'FOR_SALE_INVENTORY'), [cars])
  const invRefOptions = useMemo(() => {
    if (invRefType === 'WORKSHOP_JOB') return jobs.map(j => ({ id: j.id, label: `${j.title} — ${j.client.displayName} (${j.status})`, totalCents: j.totalCents }))
    return leads.map(l => ({ id: l.id, label: `${l.client.displayName} — ${l.status}${l.interestModel ? ` — ${l.interestModel}` : ''}`, totalCents: 0 }))
  }, [invRefType, jobs, leads])

  const filteredDbClients = useMemo(() => {
    const q = dbSearch.toLowerCase().trim()
    if (!q) return nonDealerClients
    return nonDealerClients.filter(c => {
      if (c.displayName.toLowerCase().includes(q)) return true
      if (c.email?.toLowerCase().includes(q)) return true
      if (c.phone?.includes(q)) return true
      const clientCars = cars.filter(car => car.clientId === c.id)
      return clientCars.some(car => {
        const label = `${car.make ?? ''} ${car.model} ${car.plate ?? ''} ${car.vin ?? ''}`.toLowerCase()
        return label.includes(q)
      })
    })
  }, [nonDealerClients, dbSearch, cars])

  const finMonthly = useMemo(() => {
    const vv = parseFloat(finValue) || 0; const dp = parseFloat(finDown) || 0
    const dur = finDuration === 'custom' ? (parseInt(finCustomDuration) || 0) : parseInt(finDuration)
    const rate = parseFloat(finRate) || 0
    if (vv <= 0 || dur <= 0) return 0
    const principal = (vv - dp) * 100; const mr = rate / 100 / 12
    if (finType === 'LEASING') {
      const rv = parseFloat(finResidual) || 0; const residualCents = rv * 100
      return Math.round(((principal - residualCents) / dur) + ((principal + residualCents) / 2 * mr))
    } else {
      if (mr <= 0) return Math.round(principal / dur)
      return Math.round(principal * mr / (1 - Math.pow(1 + mr, -dur)))
    }
  }, [finType, finValue, finDown, finResidual, finDuration, finCustomDuration, finRate])

  async function get<T>(p: string): Promise<T> { const r = await fetch(`${API}${p}`); if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`); return r.json() as Promise<T> }
  async function post<T>(p: string, body: unknown): Promise<T> { const r = await fetch(`${API}${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`); return r.json() as Promise<T> }
  async function put<T>(p: string, body: unknown): Promise<T> { const r = await fetch(`${API}${p}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`); return r.json() as Promise<T> }
  async function del<T>(p: string): Promise<T> { const r = await fetch(`${API}${p}`, { method: 'DELETE' }); if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`); return r.json() as Promise<T> }

  const refresh = useCallback(async () => {
    const [cl, ca, jo, le, inv, ct, fin] = await Promise.all([
      get<ClientProfile[]>('/api/v1/clients'), get<CarProfile[]>('/api/v1/cars'),
      get<WorkshopJobView[]>('/api/v1/workshop/jobs'), get<SalesLeadView[]>('/api/v1/sales/leads'),
      get<InvoiceView[]>('/api/v1/finance/invoices'), get<ContractView[]>('/api/v1/sales/contracts'),
      get<FinancingView[]>('/api/v1/sales/financing'),
    ])
    setClients(cl); setCars(ca); setJobs(jo); setLeads(le); setInvoices(inv); setContracts(ct); setFinancingOffers(fin)
  }, [])

  useEffect(() => { refresh().catch(e => setMsg(e instanceof Error ? e.message : 'Backend not reachable')) }, [refresh])
  useEffect(() => { if (!jobClientId) return; const m = carsForJob[0]; if (m && !carsForJob.some(c => c.id === jobCarId)) setJobCarId(m.id); if (!m) setJobCarId('') }, [jobClientId, carsForJob, jobCarId])

  useEffect(() => {
    if (invRefType === 'WORKSHOP_JOB' && invRefId) {
      const job = jobs.find(j => j.id === invRefId)
      if (job && job.totalCents > 0) setInvAmount((job.totalCents * (1 + SWISS_VAT_RATE) / 100).toFixed(2))
    }
  }, [invRefId, invRefType, jobs])

  function resolveColor(main: string, custom: string) { return main === '__other' ? custom.trim() : main }
  function buildModel(model: string, version: string) { const m = model === '__other' ? '' : model; return version ? `${m} ${version}`.trim() : m }

  async function addClient() {
    if (!firstName.trim()) return setMsg('First name is required')
    if (firstName.trim().length < 2) return setMsg('First name must be at least 2 characters')
    if (email.trim() && !email.includes('@')) return setMsg('Invalid email address')
    setLoading(true)
    try { await post<ApiResponse>('/api/v1/clients', { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim(), addressLine: addrLine.trim(), zipCode: zipCode.trim(), city: city.trim(), birthday: birthday || undefined }); setFirstName(''); setLastName(''); setPhone(''); setEmail(''); setAddrLine(''); setZipCode(''); setCity(''); setBirthday(''); await refresh(); setMsg('Client created') } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function updateClientSubmit() {
    if (!editingClientId) return
    setLoading(true)
    try { await put<ApiResponse>(`/api/v1/clients/${editingClientId}`, editClient); setEditingClientId(null); await refresh(); setMsg('Client updated') } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }
  async function deleteClientConfirmed(id: string) { setLoading(true); setConfirmDelete(null); try { await del<ApiResponse>(`/api/v1/clients/${id}`); await refresh(); setMsg('Client deleted') } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) } }
  async function deleteCarConfirmed(id: string) { setLoading(true); setConfirmDelete(null); try { await del<ApiResponse>(`/api/v1/cars/${id}`); await refresh(); setMsg('Car deleted') } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) } }
  function startEditClient(c: ClientProfile) { setEditingClientId(c.id); setEditClient({ firstName: c.firstName || '', lastName: c.lastName || '', phone: c.phone || '', email: c.email || '', addressLine: c.addressLine || '', zipCode: c.zipCode || '', city: c.city || '', birthday: c.birthday || '' }) }

  async function addCustomerCar() {
    if (!carClientId) return setMsg('Select an owner')
    const m = buildModel(carModel, carVersion); if (!m) return setMsg('Model is required')
    if (carVin.trim() && carVin.trim().length !== 17) return setMsg('VIN must be exactly 17 characters')
    setLoading(true)
    try {
      const y = carYear.trim() ? parseInt(carYear) : undefined; const mi = carMileage.trim() ? parseInt(carMileage) : undefined
      await post<ApiResponse>('/api/v1/cars', { clientId: carClientId, vehicleRole: 'CUSTOMER_OWNED', make: carMake.trim(), model: m, plate: carPlate.trim() || undefined, vin: carVin.trim(), stammnummer: carStamm.trim(), branchId: carBranch.trim(), modelYear: Number.isFinite(y) ? y : undefined, color: resolveColor(carColor, carColorCustom), trimColor: resolveColor(carTrimColor, carTrimCustom), mileageKm: Number.isFinite(mi) ? mi : undefined, notes: carNotes.trim(), fuelType: carFuelType || undefined, firstRegistrationDate: carFirstReg || undefined })
      setCarMake(''); setCarModel(''); setCarVersion(''); setCarPlate(''); setCarVin(''); setCarStamm(''); setCarBranch(''); setCarYear(''); setCarColor(''); setCarColorCustom(''); setCarTrimColor(''); setCarTrimCustom(''); setCarMileage(''); setCarNotes(''); setCarFuelType(''); setCarFirstReg(''); await refresh(); setMsg('Vehicle registered')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function addInventoryCar() {
    const m = buildModel(invModel, invVersion); if (!m) return setMsg('Model is required')
    if (invVin.trim() && invVin.trim().length !== 17) return setMsg('VIN must be exactly 17 characters')
    setLoading(true)
    try {
      const y = invYear.trim() ? parseInt(invYear) : undefined; const mi = invMileage.trim() ? parseInt(invMileage) : undefined
      const pp = invPurchasePrice.trim() ? Math.round(parseFloat(invPurchasePrice) * 100) : undefined
      const cp = invCatalogPrice.trim() ? Math.round(parseFloat(invCatalogPrice) * 100) : undefined
      const uv = invUsedValue.trim() ? Math.round(parseFloat(invUsedValue) * 100) : undefined
      const sp = invSellingPrice.trim() ? Math.round(parseFloat(invSellingPrice) * 100) : undefined
      const pf = invPrepFee.trim() ? Math.round(parseFloat(invPrepFee) * 100) : undefined
      await post<ApiResponse>('/api/v1/cars', { vehicleRole: 'FOR_SALE_INVENTORY', make: invMake.trim(), model: m, plate: invPlate.trim() || undefined, vin: invVin.trim(), stammnummer: invStamm.trim(), modelYear: Number.isFinite(y) ? y : undefined, color: resolveColor(invColor, invColorCustom), trimColor: resolveColor(invTrimColor, invTrimCustom), mileageKm: Number.isFinite(mi) ? mi : undefined, notes: invNotes.trim(), purchasePriceCents: pp, catalogPriceCents: cp, usedValueCents: uv, sellingPriceCents: sp, prepFeeCents: pf, arrivalDate: invArrivalDate || undefined, fuelType: invFuelType || undefined, firstRegistrationDate: invFirstReg || undefined })
      setInvMake(''); setInvModel(''); setInvVersion(''); setInvPlate(''); setInvVin(''); setInvStamm(''); setInvYear(''); setInvColor(''); setInvColorCustom(''); setInvTrimColor(''); setInvTrimCustom(''); setInvMileage(''); setInvNotes(''); setInvPurchasePrice(''); setInvCatalogPrice(''); setInvUsedValue(''); setInvSellingPrice(''); setInvPrepFee(String(DEFAULT_PREP_FEE_CHF)); setInvArrivalDate(''); setInvFuelType(''); setInvFirstReg(''); await refresh(); setMsg('Inventory vehicle added')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function createJob() {
    if (!jobClientId || !jobCarId || !jobTitle.trim()) return setMsg('Client, car and title required')
    setLoading(true)
    try {
      const items = jobItems.filter(i => i.name.trim()).map(i => ({ itemType: i.itemType, artNr: i.artNr.trim() || undefined, name: i.name.trim(), quantity: parseFloat(i.quantity) || 1, unit: i.unit || 'pc', unitPriceCents: Math.round((parseFloat(i.unitPriceCents) || 0) * 100), discountPct: parseFloat(i.discountPct) || 0 }))
      const res = await post<ApiResponse>('/api/v1/workshop/jobs', { clientId: jobClientId, carId: jobCarId, title: jobTitle.trim(), description: jobDesc.trim() || undefined, items: items.length > 0 ? items : undefined })
      setJobTitle(''); setJobDesc(''); setJobItems([]); setShowJobForm(false); setLastCreatedJobId(res.id); await refresh(); setMsg('Job created')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function createInvoiceFromJob(jobId: string) {
    const job = jobs.find(j => j.id === jobId); if (!job) return
    setLoading(true)
    try { await post<ApiResponse>('/api/v1/finance/invoices', { referenceType: 'WORKSHOP_JOB', referenceId: jobId, amountCents: Math.round(job.totalCents * (1 + SWISS_VAT_RATE)), currency: 'CHF' }); setLastCreatedJobId(null); await refresh(); setMsg('Invoice created from job') } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function createInvoiceFromContract(contractId: string) {
    const ct = contracts.find(c => c.id === contractId); if (!ct) return
    const lead = leads.find(l => l.id === ct.leadId); if (!lead) return setMsg('Lead not found for this contract')
    setLoading(true)
    try { await post<ApiResponse>('/api/v1/finance/invoices', { referenceType: 'SALES_LEAD', referenceId: lead.id, amountCents: ct.sellingPriceCents, currency: 'CHF' }); setLastCreatedContractId(null); await refresh(); setMsg('Invoice created from contract') } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function setJobStatus(id: string, status: string) { setLoading(true); try { await post<ApiResponse>(`/api/v1/workshop/jobs/${id}/status`, { status }); await refresh() } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) } }
  async function setLeadStatus(id: string, status: string) { setLoading(true); try { await post<ApiResponse>(`/api/v1/sales/leads/${id}/status`, { status }); await refresh() } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) } }
  async function searchClients(q: string) { setLeadSearch(q); if (q.trim().length < 2) { setLeadSearchResults([]); return }; try { const r = await get<ClientProfile[]>(`/api/v1/clients?q=${encodeURIComponent(q.trim())}`); setLeadSearchResults(r.filter(c => c.id !== DEALER_STOCK_CLIENT_ID)) } catch { setLeadSearchResults([]) } }
  function selectLeadClient(c: ClientProfile) { setLeadClientId(c.id); setLeadSearch(c.displayName); setLeadSearchResults([]); setLeadNewClient(false) }

  async function createLead() {
    setLoading(true)
    try {
      let clientId = leadClientId
      if (leadNewClient) {
        if (!leadFirstName.trim()) { setMsg('First name required'); setLoading(false); return }
        const r = await post<ApiResponse>('/api/v1/clients', { firstName: leadFirstName.trim(), lastName: leadLastName.trim(), phone: leadPhone.trim(), email: leadEmail.trim() }); clientId = r.id; setLeadNewClient(false); setLeadFirstName(''); setLeadLastName(''); setLeadPhone(''); setLeadEmail('')
      }
      if (!clientId) { setMsg('Select or create a client'); setLoading(false); return }
      await post<ApiResponse>('/api/v1/sales/leads', { clientId, carId: leadCarId || undefined, interestModel: leadInterest.trim(), notes: leadNotes.trim(), leadSource: leadSource.trim() })
      setLeadSearch(''); setLeadClientId(''); setLeadCarId(''); setLeadInterest(''); setLeadNotes(''); setLeadSource(''); await refresh(); setMsg('Lead created')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function createContract() {
    if (!ctLeadId) return setMsg('Select a lead'); if (!ctPrice.trim()) return setMsg('Selling price required')
    const cents = Math.round(parseFloat(ctPrice) * 100); if (isNaN(cents) || cents <= 0) return setMsg('Valid price required')
    setLoading(true)
    try {
      const res = await post<ApiResponse>('/api/v1/sales/contracts', { leadId: ctLeadId, carId: ctCarId || undefined, sellingPriceCents: cents, insuranceCompany: ctInsurance.trim(), registrationPlate: ctPlate.trim(), contractDate: todayStr(), notes: ctNotes.trim() })
      setLastCreatedContractId(res.id); setCtLeadId(''); setCtCarId(''); setCtPrice(''); setCtInsurance(''); setCtPlate(''); setCtNotes(''); await refresh(); setMsg('Contract created')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function createFinancingOffer() {
    const dur = finDuration === 'custom' ? parseInt(finCustomDuration) : parseInt(finDuration)
    const vv = parseFloat(finValue); if (!vv || vv <= 0) return setMsg('Vehicle value required')
    if (!dur || dur <= 0) return setMsg('Duration required')
    setLoading(true)
    try {
      await post<ApiResponse>('/api/v1/sales/financing', { offerType: finType, carId: finCarId || undefined, clientId: finClientId || undefined, vehicleValueCents: Math.round(vv * 100), downPaymentCents: Math.round((parseFloat(finDown) || 0) * 100), residualValueCents: finType === 'LEASING' && finResidual ? Math.round(parseFloat(finResidual) * 100) : undefined, residualPct: finType === 'LEASING' && finResidualPct ? parseFloat(finResidualPct) : undefined, durationMonths: dur, interestRatePct: parseFloat(finRate) || 0 })
      await refresh(); setMsg('Offer created')
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function createInvoice() {
    if (!invRefId.trim()) return setMsg('Select a job or lead'); const amt = Number(invAmount); if (isNaN(amt) || amt <= 0) return setMsg('Amount must be positive')
    setLoading(true)
    try { await post<ApiResponse>('/api/v1/finance/invoices', { referenceType: invRefType, referenceId: invRefId, amountCents: Math.round(amt * 100), currency: 'CHF' }); setInvRefId(''); setInvAmount(''); await refresh(); setMsg('Invoice created') } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) }
  }

  async function setInvoiceStatus(id: string, status: string) { setLoading(true); try { await post<ApiResponse>(`/api/v1/finance/invoices/${id}/status`, { status }); await refresh() } catch (e) { setMsg(e instanceof Error ? e.message : 'Error') } finally { setLoading(false) } }
  function previewPdf(url: string) { window.open(`${API}${url}`, '_blank') }
  function updateJobItem(key: number, field: keyof JobItem, value: string) { setJobItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i)) }
  function removeJobItem(key: number) { setJobItems(prev => prev.filter(i => i.key !== key)) }

  function ColorPicker({ colors, value, custom, onChange, onCustom, label }: { colors: ColorOption[]; value: string; custom: string; onChange: (v: string) => void; onCustom: (v: string) => void; label: string }) {
    return <>
      <div className="color-picker-wrapper">
        <select value={value} onChange={e => { onChange(e.target.value); if (e.target.value !== '__other') onCustom('') }}>
          <option value="">{label}</option>{colors.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}<option value="__other">Other...</option>
        </select>
        {value && value !== '__other' && <span className="color-swatch" style={{ background: colors.find(c => c.name === value)?.hex ?? '#ccc' }} />}
      </div>
      {value === '__other' && <input value={custom} onChange={e => onCustom(e.target.value)} placeholder="Custom color" />}
    </>
  }

  function MakeModelVersionPicker({ make, model, version, onMake, onModel, onVersion }: { make: string; model: string; version: string; onMake: (v: string) => void; onModel: (v: string) => void; onVersion: (v: string) => void }) {
    const models = make && make !== '__other' ? getModelList(make) : []
    const versions = (make && make !== '__other' && model && model !== '__other') ? getVersionList(make, model) : []
    return <>
      <select value={make} onChange={e => { onMake(e.target.value); onModel(''); onVersion('') }}>
        <option value="">Make</option>{CAR_MAKE_LIST.map(m => <option key={m} value={m}>{m}</option>)}<option value="__other">Other...</option>
      </select>
      {make === '__other' && <input value={model} onChange={e => { onModel(e.target.value); onVersion('') }} placeholder="Type make and model" />}
      {make !== '__other' && (models.length > 0 ? (
        <select value={model} onChange={e => { onModel(e.target.value); onVersion('') }}>
          <option value="">Model</option>{models.map(m => <option key={m} value={m}>{m}</option>)}<option value="__other">Other model...</option>
        </select>
      ) : make ? <input value={model} onChange={e => { onModel(e.target.value); onVersion('') }} placeholder="Model" /> : null)}
      {make !== '__other' && model === '__other' && <input onChange={e => onModel(e.target.value)} placeholder="Type model name" />}
      {versions.length > 0 && (
        <select value={version} onChange={e => onVersion(e.target.value)}>
          <option value="">Version / Trim</option>{versions.map(v => <option key={v} value={v}>{v}</option>)}<option value="__other">Other...</option>
        </select>
      )}
      {version === '__other' && <input onChange={e => onVersion(e.target.value)} placeholder="Type version / trim" />}
    </>
  }

  function VatLine({ cents }: { cents: number }) { const v = fmtVat(cents); return <span className="vat-info">CHF {v.excl} excl. VAT + CHF {v.vat} VAT = CHF {v.incl} incl.</span> }

  const SBtn = ({ id, label, disabled }: { id: Page; label: string; disabled?: boolean }) => (
    <button type="button" disabled={disabled} className={page === id ? 'side-btn active' : `side-btn${disabled ? ' disabled' : ''}`} onClick={() => { if (!disabled) { setPage(id); if (id === 'clients') setClientsView('choose') } }}>{label}</button>
  )

  function FuelTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return <select value={value} onChange={e => onChange(e.target.value)}><option value="">Fuel type</option>{FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}</select>
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2 className="sidebar-title" onClick={() => setPage('home')}>DMS</h2>
        <SBtn id="home" label="Home" />
        <SBtn id="service" label="Service" />
        <SBtn id="sales" label="Sales" />
        <SBtn id="admin" label="Administration" disabled />
        <hr className="sidebar-divider" />
        <SBtn id="clients" label="Clients & Cars" />
        <SBtn id="finance" label="Finance" />
      </aside>
      <main className="content">
        <header className="topbar"><h1>Apex Motorsport — DMS</h1><span className="badge">{loading ? 'Working...' : 'Ready'}</span></header>
        <div className="info">{msg}</div>

        {page === 'home' && <Dashboard clients={clients} cars={cars} jobs={jobs} leads={leads} invoices={invoices} />}

        {/* SERVICE */}
        {page === 'service' && (
          <section>
            <div className="section-toggle">
              <button type="button" className={serviceView === 'dashboard' ? 'active' : ''} onClick={() => setServiceView('dashboard')}>Dashboard</button>
              <button type="button" className={serviceView === 'board' ? 'active' : ''} onClick={() => setServiceView('board')}>Job Board</button>
            </div>
            {serviceView === 'dashboard' && <Dashboard clients={clients} cars={cars} jobs={jobs} leads={leads} invoices={invoices} />}
            {serviceView === 'board' && <>
              <div className="action-chooser"><button type="button" className={showJobForm ? 'active' : ''} onClick={() => setShowJobForm(!showJobForm)}>Create Job</button></div>
              {showJobForm && (
                <article className="card" style={{ marginBottom: '1rem' }}>
                  <h3>Create Workshop Job</h3>
                  <div className="form">
                    <select value={jobClientId} onChange={e => setJobClientId(e.target.value)}><option value="">Client</option>{nonDealerClients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select>
                    <select value={jobCarId} onChange={e => setJobCarId(e.target.value)}><option value="">{carsForJob.length ? 'Car' : 'No cars for this client'}</option>{carsForJob.map(c => <option key={c.id} value={c.id}>{c.make ? `${c.make} ` : ''}{c.model}{c.plate ? ` (${c.plate})` : ''}</option>)}</select>
                    <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Job title (e.g. Oil Change, Brake Service)" />
                    <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder="Description" rows={2} />
                    <div className="items-section"><h4>Services</h4>
                      {jobItems.filter(i => i.itemType === 'SERVICE').map(it => (<div className="item-row" key={it.key}><input className="item-name" value={it.name} onChange={e => updateJobItem(it.key, 'name', e.target.value)} placeholder="Name" /><input className="item-qty" value={it.quantity} onChange={e => updateJobItem(it.key, 'quantity', e.target.value)} type="number" min="0" step="0.5" /><input className="item-unit" value={it.unit} onChange={e => updateJobItem(it.key, 'unit', e.target.value)} /><input className="item-price" value={it.unitPriceCents} onChange={e => updateJobItem(it.key, 'unitPriceCents', e.target.value)} type="number" min="0" step="0.01" placeholder="CHF" /><span className="item-total">{itemTotal(it).toFixed(2)}</span><button type="button" className="mini" onClick={() => removeJobItem(it.key)}>−</button></div>))}
                      <div className="add-item-row"><select onChange={e => { const c = WORKSHOP_CATALOG.filter(x => x.category === 'SERVICE').find(x => x.artNr === e.target.value); if (c) setJobItems(p => [...p, catalogToItem(c)]); e.target.value = '' }}><option value="">+ Add service...</option>{WORKSHOP_CATALOG.filter(c => c.category === 'SERVICE').map(c => <option key={c.artNr} value={c.artNr}>{c.name} — CHF {(c.unitPriceCents / 100).toFixed(2)}</option>)}</select><button type="button" className="mini" onClick={() => setJobItems(p => [...p, { ...emptyItem(), itemType: 'SERVICE' }])}>+ Custom</button></div>
                    </div>
                    <div className="items-section"><h4>Parts</h4>
                      {jobItems.filter(i => i.itemType === 'PART').map(it => (<div className="item-row" key={it.key}><input className="item-name" value={it.name} onChange={e => updateJobItem(it.key, 'name', e.target.value)} placeholder="Name" /><input className="item-qty" value={it.quantity} onChange={e => updateJobItem(it.key, 'quantity', e.target.value)} type="number" min="0" step="0.5" /><input className="item-unit" value={it.unit} onChange={e => updateJobItem(it.key, 'unit', e.target.value)} /><input className="item-price" value={it.unitPriceCents} onChange={e => updateJobItem(it.key, 'unitPriceCents', e.target.value)} type="number" min="0" step="0.01" placeholder="CHF" /><span className="item-total">{itemTotal(it).toFixed(2)}</span><button type="button" className="mini" onClick={() => removeJobItem(it.key)}>−</button></div>))}
                      <div className="add-item-row"><select onChange={e => { const c = WORKSHOP_CATALOG.filter(x => x.category === 'PART').find(x => x.artNr === e.target.value); if (c) setJobItems(p => [...p, catalogToItem(c)]); e.target.value = '' }}><option value="">+ Add part...</option>{WORKSHOP_CATALOG.filter(c => c.category === 'PART').map(c => <option key={c.artNr} value={c.artNr}>{c.name} — CHF {(c.unitPriceCents / 100).toFixed(2)}</option>)}</select><button type="button" className="mini" onClick={() => setJobItems(p => [...p, { ...emptyItem(), itemType: 'PART' }])}>+ Custom</button></div>
                    </div>
                    {jobItems.length > 0 && <div style={{ textAlign: 'right', fontWeight: 600, marginTop: '.3rem' }}>Total: CHF {jobItems.reduce((s, i) => s + itemTotal(i), 0).toFixed(2)}<span className="vat-info" style={{ display: 'block' }}>+ VAT {(SWISS_VAT_RATE * 100).toFixed(1)}% = CHF {(jobItems.reduce((s, i) => s + itemTotal(i), 0) * (1 + SWISS_VAT_RATE)).toFixed(2)} incl.</span></div>}
                    <button type="button" onClick={createJob} disabled={loading}>Create Job</button>
                  </div>
                </article>
              )}
              {lastCreatedJobId && <div className="quick-action"><span>Job created successfully.</span><button type="button" onClick={() => createInvoiceFromJob(lastCreatedJobId)}>Create Invoice</button><button type="button" className="mini" onClick={() => setLastCreatedJobId(null)}>Dismiss</button></div>}
              <article className="card"><h3>Job Board ({jobs.length})</h3>
                <ul className="list">{jobs.map(j => (<li key={j.id}><strong>{j.title}</strong> <StatusBadge status={j.status} /><select className="inline-select" value={j.status} onChange={e => setJobStatus(j.id, e.target.value)}>{JOB_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>{j.description && <><br /><span className="muted">{j.description}</span></>}<br /><span className="muted">Customer: {j.client.displayName}{j.client.phone ? ` · ${j.client.phone}` : ''}</span><br /><span className="muted">Vehicle: {j.car.make ? `${j.car.make} ` : ''}{j.car.model}{j.car.plate ? ` (${j.car.plate})` : ''}{j.car.vin ? ` · VIN ${j.car.vin}` : ''}</span>{j.items.length > 0 && <><br /><span className="muted">Items: {j.items.length} · Total: CHF {fmtChf(j.totalCents)}</span></>}<br /><button type="button" className="mini" onClick={() => createInvoiceFromJob(j.id)}>Create Invoice</button></li>))}{jobs.length === 0 && <li className="muted">No jobs yet</li>}</ul>
              </article>
            </>}
          </section>
        )}

        {/* SALES */}
        {page === 'sales' && (
          <section>
            <div className="section-toggle">
              <button type="button" className={salesView === 'actions' ? 'active' : ''} onClick={() => setSalesView('actions')}>Actions</button>
              <button type="button" className={salesView === 'dashboard' ? 'active' : ''} onClick={() => setSalesView('dashboard')}>Dashboard</button>
            </div>
            {salesView === 'dashboard' && (<>
              {(() => { const tv = inventoryCars.reduce((s, c) => s + (c.sellingPriceCents ?? 0), 0); const tc = inventoryCars.reduce((s, c) => s + (c.purchasePriceCents ?? 0), 0); const tp = inventoryCars.reduce((s, c) => s + (c.prepFeeCents ?? 0), 0); const ep = tv - tc - tp; const am = tv > 0 ? (ep / tv * 100) : 0; return (
                <div className="stat-row" style={{ marginBottom: '1rem' }}>
                  <div className="stat-card"><span className="stat-value">{inventoryCars.length}</span><span className="stat-label">Cars in Stock</span></div>
                  <div className="stat-card"><span className="stat-value">CHF {(tv / 100).toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">Inventory Value</span></div>
                  <div className="stat-card"><span className="stat-value">CHF {(tc / 100).toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">Total Invested</span></div>
                  <div className="stat-card"><span className="stat-value" style={{ color: ep >= 0 ? '#16a34a' : '#dc2626' }}>CHF {(ep / 100).toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">Est. Profit</span></div>
                  <div className="stat-card"><span className="stat-value">{am.toFixed(1)}%</span><span className="stat-label">Avg Margin</span></div>
                  <div className="stat-card"><span className="stat-value">{leads.length}</span><span className="stat-label">Active Leads</span></div>
                </div>)
              })()}
              <article className="card" style={{ marginBottom: '1rem' }}><h3>Sales Pipeline</h3><ul className="list">{leads.map(s => (<li key={s.id}><strong>{s.client.displayName}</strong> <StatusBadge status={s.status} /><select className="inline-select" value={s.status} onChange={e => setLeadStatus(s.id, e.target.value)}>{LEAD_STATUSES.map(st => <option key={st} value={st}>{st}</option>)}</select><br /><span className="muted">{s.client.phone || '—'} · {s.client.email || '—'}</span><br /><span className="muted">Vehicle: {s.car ? `${s.car.make ? `${s.car.make} ` : ''}${s.car.model}${s.car.plate ? ` (${s.car.plate})` : ''}` : s.interestModel || 'Not specified'}</span></li>))}{leads.length === 0 && <li className="muted">No leads yet</li>}</ul></article>
              <article className="card"><h3>Contracts ({contracts.length})</h3><ul className="list">{contracts.map(c => (<li key={c.id}><strong>{c.client?.displayName ?? '—'}</strong> — {c.car ? `${c.car.make ?? ''} ${c.car.model}` : '—'} — CHF {fmtChf(c.sellingPriceCents)}{c.sellingPriceCents > 0 && <VatLine cents={c.sellingPriceCents} />}<br /><span className="muted">{c.contractDate}{c.insuranceCompany ? ` · ${c.insuranceCompany}` : ''}{c.registrationPlate ? ` · ${c.registrationPlate}` : ''}</span><button type="button" className="mini" onClick={() => previewPdf(`/api/v1/sales/contracts/${c.id}/pdf`)}>Preview PDF</button></li>))}{contracts.length === 0 && <li className="muted">No contracts yet</li>}</ul></article>
            </>)}
            {salesView === 'actions' && (<>
              <div className="action-chooser">
                <button type="button" className={salesAction === 'inventory' ? 'active' : ''} onClick={() => setSalesAction(salesAction === 'inventory' ? null : 'inventory')}>Add Inventory Vehicle</button>
                <button type="button" className={salesAction === 'lead' ? 'active' : ''} onClick={() => setSalesAction(salesAction === 'lead' ? null : 'lead')}>Create Lead</button>
                <button type="button" className={salesAction === 'contract' ? 'active' : ''} onClick={() => setSalesAction(salesAction === 'contract' ? null : 'contract')}>Create Contract</button>
                <button type="button" className={salesAction === 'financing' ? 'active' : ''} onClick={() => setSalesAction(salesAction === 'financing' ? null : 'financing')}>Financing</button>
              </div>

              {lastCreatedContractId && <div className="quick-action"><span>Contract created. Vehicle ownership transferred.</span><button type="button" onClick={() => createInvoiceFromContract(lastCreatedContractId)}>Create Invoice</button><button type="button" className="mini" onClick={() => setLastCreatedContractId(null)}>Dismiss</button></div>}

              {salesAction === 'inventory' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>Add Inventory Vehicle</h3><p className="hint">No license plate needed — the car sits on the lot until sold.</p>
                  <div className="form">
                    <MakeModelVersionPicker make={invMake} model={invModel} version={invVersion} onMake={setInvMake} onModel={setInvModel} onVersion={setInvVersion} />
                    <FuelTypePicker value={invFuelType} onChange={setInvFuelType} />
                    <input value={invPlate} onChange={e => setInvPlate(e.target.value)} placeholder="Plate (optional)" />
                    <input value={invStamm} onChange={e => setInvStamm(e.target.value)} placeholder="Stammnummer (CH)" />
                    <input value={invVin} onChange={e => setInvVin(e.target.value)} placeholder="VIN (17 characters)" maxLength={17} />
                    <input value={invYear} onChange={e => setInvYear(e.target.value)} placeholder="Year" />
                    <label className="field-label">First registration date</label>
                    <input type="date" value={invFirstReg} onChange={e => setInvFirstReg(e.target.value)} />
                    <ColorPicker colors={CAR_COLORS} value={invColor} custom={invColorCustom} onChange={setInvColor} onCustom={setInvColorCustom} label="Exterior color (optional)" />
                    <ColorPicker colors={TRIM_COLORS} value={invTrimColor} custom={invTrimCustom} onChange={setInvTrimColor} onCustom={setInvTrimCustom} label="Trim / interior color (optional)" />
                    <input value={invMileage} onChange={e => setInvMileage(e.target.value)} placeholder="Mileage (km)" />
                    <label className="field-label">Purchase price (CHF)</label><input value={invPurchasePrice} onChange={e => setInvPurchasePrice(e.target.value)} placeholder="Purchase price" type="number" min="0" step="0.01" />
                    <label className="field-label">Catalog price (CHF)</label><input value={invCatalogPrice} onChange={e => setInvCatalogPrice(e.target.value)} placeholder="Catalog price" type="number" min="0" step="0.01" />
                    <label className="field-label">Used value (CHF)</label><input value={invUsedValue} onChange={e => setInvUsedValue(e.target.value)} placeholder="Used value" type="number" min="0" step="0.01" />
                    <label className="field-label">Selling price (CHF, incl. VAT)</label><input value={invSellingPrice} onChange={e => setInvSellingPrice(e.target.value)} placeholder="Selling price" type="number" min="0" step="0.01" />
                    {invSellingPrice && parseFloat(invSellingPrice) > 0 && <VatLine cents={Math.round(parseFloat(invSellingPrice) * 100)} />}
                    <label className="field-label">Preparation fee (CHF)</label><input value={invPrepFee} onChange={e => setInvPrepFee(e.target.value)} placeholder="Prep fee" type="number" min="0" step="0.01" />
                    <label className="field-label">Arrival date (optional)</label><input type="date" value={invArrivalDate} onChange={e => setInvArrivalDate(e.target.value)} />
                    <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder="Notes" rows={2} />
                    <button type="button" onClick={addInventoryCar} disabled={loading}>Add to Inventory</button>
                  </div>
                </article>
              )}

              {salesAction === 'lead' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>Create Sales Lead</h3><p className="hint">Search an existing client or create a new one.</p>
                  <div className="form">
                    <label className="field-label">Client</label>
                    <div style={{ position: 'relative' }}><input value={leadSearch} onChange={e => searchClients(e.target.value)} placeholder="Search client..." />{leadSearchResults.length > 0 && <ul className="autocomplete-list">{leadSearchResults.map(c => <li key={c.id} onClick={() => selectLeadClient(c)}>{c.displayName}{c.email ? ` · ${c.email}` : ''}</li>)}</ul>}</div>
                    {leadClientId && !leadNewClient && <span className="muted">Selected: {clientMap.get(leadClientId)}</span>}
                    {!leadNewClient && <button type="button" className="mini" onClick={() => { setLeadNewClient(true); setLeadClientId(''); setLeadSearchResults([]) }}>+ New client</button>}
                    {leadNewClient && (<div className="form nested-form"><input value={leadFirstName} onChange={e => setLeadFirstName(e.target.value)} placeholder="First name" /><input value={leadLastName} onChange={e => setLeadLastName(e.target.value)} placeholder="Last name" /><input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder="Phone" /><input value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder="Email" /><button type="button" className="mini" onClick={() => setLeadNewClient(false)}>Cancel</button></div>)}
                    <label className="field-label">Vehicle interest</label>
                    <select value={leadCarId} onChange={e => setLeadCarId(e.target.value)}><option value="">Select inventory vehicle (optional)</option>{inventoryCars.map(c => <option key={c.id} value={c.id}>{c.make ? `${c.make} ` : ''}{c.model}{c.plate ? ` (${c.plate})` : ''}{c.sellingPriceCents ? ` — CHF ${fmtChf(c.sellingPriceCents)}` : ''}</option>)}</select>
                    <input value={leadInterest} onChange={e => setLeadInterest(e.target.value)} placeholder="Interest (model / trim)" />
                    <input value={leadSource} onChange={e => setLeadSource(e.target.value)} placeholder="Lead source" />
                    <textarea value={leadNotes} onChange={e => setLeadNotes(e.target.value)} placeholder="Notes" rows={2} />
                    <button type="button" onClick={createLead} disabled={loading}>Create Lead</button>
                  </div>
                </article>
              )}

              {salesAction === 'contract' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>Create Sales Contract</h3><p className="hint">The buyer must be a fully registered client with name, address, and birthday.</p>
                  <div className="form">
                    <label className="field-label">Sales lead</label>
                    <select value={ctLeadId} onChange={e => { setCtLeadId(e.target.value); const l = leads.find(x => x.id === e.target.value); if (l?.car) setCtCarId(l.car.id) }}><option value="">Select lead...</option>{leads.map(l => <option key={l.id} value={l.id}>{l.client.displayName} — {l.status}{l.car ? ` — ${l.car.make ?? ''} ${l.car.model}` : ''}</option>)}</select>
                    <label className="field-label">Vehicle</label>
                    <select value={ctCarId} onChange={e => setCtCarId(e.target.value)}><option value="">Select vehicle...</option>{cars.map(c => <option key={c.id} value={c.id}>{c.make ? `${c.make} ` : ''}{c.model}{c.plate ? ` (${c.plate})` : ''}</option>)}</select>
                    <label className="field-label">Selling price (CHF, incl. {(SWISS_VAT_RATE * 100).toFixed(1)}% VAT)</label>
                    <input value={ctPrice} onChange={e => setCtPrice(e.target.value)} placeholder="Selling price" type="number" min="0" step="0.01" />
                    {ctPrice && parseFloat(ctPrice) > 0 && <VatLine cents={Math.round(parseFloat(ctPrice) * 100)} />}
                    <input value={ctInsurance} onChange={e => setCtInsurance(e.target.value)} placeholder="Insurance company" />
                    <input value={ctPlate} onChange={e => setCtPlate(e.target.value)} placeholder="Registration plate (e.g. BE 123456)" />
                    <textarea value={ctNotes} onChange={e => setCtNotes(e.target.value)} placeholder="Notes" rows={2} />
                    <button type="button" onClick={createContract} disabled={loading}>Create Contract</button>
                  </div>
                </article>
              )}

              {salesAction === 'financing' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>Financing / Leasing Calculator</h3>
                  <div className="offer-toggle"><button type="button" className={finViewMode === 'new' ? 'active' : ''} onClick={() => setFinViewMode('new')}>New Offer</button><button type="button" className={finViewMode === 'existing' ? 'active' : ''} onClick={() => setFinViewMode('existing')}>Existing Offers ({financingOffers.length})</button></div>
                  {finViewMode === 'new' && (
                    <div className="form">
                      <label className="field-label">Offer type</label>
                      <select value={finType} onChange={e => setFinType(e.target.value as 'LEASING' | 'FINANCING')}><option value="LEASING">Leasing</option><option value="FINANCING">Financing</option></select>
                      <label className="field-label">Client (optional)</label><select value={finClientId} onChange={e => setFinClientId(e.target.value)}><option value="">Select client...</option>{nonDealerClients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select>
                      <label className="field-label">Vehicle value (incl. VAT)</label><input value={finValue} onChange={e => setFinValue(e.target.value)} placeholder="Vehicle value (CHF)" type="number" min="0" step="0.01" />
                      {finValue && parseFloat(finValue) > 0 && <VatLine cents={Math.round(parseFloat(finValue) * 100)} />}
                      <label className="field-label">Down payment</label><input value={finDown} onChange={e => setFinDown(e.target.value)} placeholder="Down payment (CHF)" type="number" min="0" step="0.01" />
                      {finType === 'LEASING' && <><label className="field-label">Residual value (incl. VAT)</label><div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}><input style={{ flex: 1 }} value={finResidual} onChange={e => { setFinResidual(e.target.value); if (finValue && e.target.value) setFinResidualPct(((parseFloat(e.target.value) / parseFloat(finValue)) * 100).toFixed(1)) }} placeholder="Residual value (CHF)" type="number" min="0" step="0.01" /><input style={{ width: '80px' }} value={finResidualPct} onChange={e => { setFinResidualPct(e.target.value); if (finValue && e.target.value) setFinResidual(((parseFloat(e.target.value) / 100) * parseFloat(finValue)).toFixed(2)) }} placeholder="%" type="number" min="0" max="100" step="0.1" /><span className="muted">%</span></div></>}
                      <label className="field-label">Duration</label><select value={finDuration} onChange={e => setFinDuration(e.target.value)}>{DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} months</option>)}<option value="custom">Custom...</option></select>
                      {finDuration === 'custom' && <input value={finCustomDuration} onChange={e => setFinCustomDuration(e.target.value)} placeholder="Months" type="number" min="1" />}
                      <label className="field-label">Annual interest rate (%)</label><input value={finRate} onChange={e => setFinRate(e.target.value)} onBlur={() => setFinRate(formatRate(finRate))} placeholder="e.g. 5.99" type="text" inputMode="decimal" />
                      {finMonthly > 0 && <div className="finance-preview"><div className="monthly">CHF {fmtChf(finMonthly)} / month</div><VatLine cents={finMonthly} /></div>}
                      <button type="button" onClick={createFinancingOffer} disabled={loading}>Save Offer & Generate PDF</button>
                    </div>
                  )}
                  {finViewMode === 'existing' && (<ul className="list">{financingOffers.map(f => (<li key={f.id}><strong>{f.offerType}</strong> — {f.car ? `${f.car.make ?? ''} ${f.car.model}` : 'No vehicle'} — CHF {fmtChf(f.monthlyPaymentCents)}/mo<br /><span className="muted">{f.client?.displayName ?? '—'} · {f.durationMonths} months · {f.interestRatePct}% p.a.</span><br /><span className="muted">Vehicle value: CHF {fmtChf(f.vehicleValueCents)} · Down: CHF {fmtChf(f.downPaymentCents)}{f.residualValueCents ? ` · Residual: CHF ${fmtChf(f.residualValueCents)}` : ''}</span><button type="button" className="mini" onClick={() => previewPdf(`/api/v1/sales/financing/${f.id}/pdf`)}>Preview PDF</button></li>))}{financingOffers.length === 0 && <li className="muted">No offers yet</li>}</ul>)}
                </article>
              )}

              <article className="card" style={{ marginBottom: '1rem' }}><h3>Inventory ({inventoryCars.length})</h3>
                {inventoryCars.length > 0 ? (<div style={{ overflowX: 'auto' }}>
                  <table className="inv-table"><thead><tr><th>Vehicle</th><th>Fuel</th><th>Year</th><th>1st Reg.</th><th>Color</th><th>Mileage</th><th>Purchase</th><th>Selling</th><th>Margin</th></tr></thead>
                    <tbody>{inventoryCars.map(c => { const margin = (c.sellingPriceCents ?? 0) - (c.purchasePriceCents ?? 0) - (c.prepFeeCents ?? 0); return (<tr key={c.id}><td><strong>{c.make ? `${c.make} ` : ''}{c.model}</strong>{c.vin ? <><br /><span className="muted">VIN {c.vin}</span></> : null}</td><td>{c.fuelType || '—'}</td><td>{c.modelYear || '—'}</td><td>{c.firstRegistrationDate || '—'}</td><td>{c.color || '—'}</td><td>{c.mileageKm != null ? `${c.mileageKm.toLocaleString()} km` : '—'}</td><td className="num">{c.purchasePriceCents != null ? fmtChf(c.purchasePriceCents) : '—'}</td><td className="num"><strong>{c.sellingPriceCents != null ? fmtChf(c.sellingPriceCents) : '—'}</strong></td><td className="num" style={{ color: margin >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{c.sellingPriceCents != null ? fmtChf(margin) : '—'}</td></tr>) })}</tbody>
                  </table></div>) : <p className="muted">No inventory vehicles yet</p>}
              </article>
            </>)}
          </section>
        )}

        {/* CLIENTS & CARS */}
        {page === 'clients' && (
          <section>
            {clientsView === 'choose' && (
              <div className="action-chooser" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                <button type="button" onClick={() => setClientsView('database')} style={{ padding: '1.5rem 2.5rem', fontSize: '1rem' }}>Database</button>
                <button type="button" onClick={() => setClientsView('register')} style={{ padding: '1.5rem 2.5rem', fontSize: '1rem' }}>Register New</button>
              </div>
            )}

            {clientsView === 'database' && (<>
              <button type="button" className="back-btn" onClick={() => setClientsView('choose')}>← Back</button>
              <article className="card">
                <h3>Client & Vehicle Database</h3>
                <div className="db-search"><input value={dbSearch} onChange={e => setDbSearch(e.target.value)} placeholder="Search by client name, email, phone, vehicle, plate, or VIN..." /></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="db-table">
                    <thead><tr><th></th><th>Client</th><th>Phone</th><th>Email</th><th>Address</th><th>Birthday</th><th>Vehicles</th><th>Actions</th></tr></thead>
                    <tbody>{filteredDbClients.map(c => {
                      const clientCars = cars.filter(car => car.clientId === c.id)
                      const clientContracts = contracts.filter(ct => ct.client?.id === c.id)
                      const clientInvoices = invoices.filter(inv => inv.client.id === c.id)
                      const isExpanded = expandedClientId === c.id
                      return (<>
                        <tr key={c.id}>
                          <td><button type="button" className="expand-btn" onClick={() => setExpandedClientId(isExpanded ? null : c.id)}>{isExpanded ? '▼' : '▶'}</button></td>
                          <td><strong>{c.displayName}</strong></td>
                          <td>{c.phone || '—'}</td>
                          <td>{c.email || '—'}</td>
                          <td>{[c.addressLine, [c.zipCode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}</td>
                          <td>{c.birthday || '—'}</td>
                          <td>{clientCars.length}</td>
                          <td>
                            <button type="button" className="mini" onClick={() => startEditClient(c)}>Edit</button>
                            <button type="button" className="mini" style={{ background: '#fee2e2', color: '#dc2626', marginLeft: '.25rem' }} onClick={() => setConfirmDelete({ type: 'client', id: c.id, label: c.displayName })}>Delete</button>
                          </td>
                        </tr>
                        {isExpanded && (<tr key={c.id + '-detail'}><td colSpan={8}>
                          <div className="db-detail">
                            {editingClientId === c.id && (<div className="edit-form" style={{ marginBottom: '.5rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                                <input value={editClient.firstName} onChange={e => setEditClient(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
                                <input value={editClient.lastName} onChange={e => setEditClient(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
                                <input value={editClient.phone} onChange={e => setEditClient(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
                                <input value={editClient.email} onChange={e => setEditClient(p => ({ ...p, email: e.target.value }))} placeholder="Email" />
                                <input value={editClient.addressLine} onChange={e => setEditClient(p => ({ ...p, addressLine: e.target.value }))} placeholder="Street / address" />
                                <input value={editClient.zipCode} onChange={e => setEditClient(p => ({ ...p, zipCode: e.target.value }))} placeholder="ZIP" />
                                <input value={editClient.city} onChange={e => setEditClient(p => ({ ...p, city: e.target.value }))} placeholder="City" />
                                <input type="date" value={editClient.birthday} onChange={e => setEditClient(p => ({ ...p, birthday: e.target.value }))} />
                              </div>
                              <div className="edit-actions"><button type="button" className="btn-save" onClick={updateClientSubmit} disabled={loading}>Save</button><button type="button" className="btn-cancel" onClick={() => setEditingClientId(null)}>Cancel</button></div>
                            </div>)}
                            {clientCars.length > 0 && <><h5>Vehicles ({clientCars.length})</h5><ul className="db-sub-list">{clientCars.map(car => (<li key={car.id}><strong>{car.make ? `${car.make} ` : ''}{car.model}</strong>{car.plate ? ` (${car.plate})` : ''}{car.fuelType ? ` · ${car.fuelType}` : ''}{car.vin ? ` · VIN ${car.vin}` : ''}{car.modelYear ? ` · ${car.modelYear}` : ''}{car.firstRegistrationDate ? ` · 1st reg: ${car.firstRegistrationDate}` : ''} <button type="button" className="mini" style={{ background: '#fee2e2', color: '#dc2626' }} onClick={() => setConfirmDelete({ type: 'car', id: car.id, label: `${car.make ?? ''} ${car.model}` })}>Delete</button></li>))}</ul></>}
                            {clientContracts.length > 0 && <><h5>Contracts ({clientContracts.length})</h5><ul className="db-sub-list">{clientContracts.map(ct => (<li key={ct.id}>{ct.car ? `${ct.car.make ?? ''} ${ct.car.model}` : '—'} — CHF {fmtChf(ct.sellingPriceCents)} — {ct.contractDate} <button type="button" className="mini" onClick={() => previewPdf(`/api/v1/sales/contracts/${ct.id}/pdf`)}>PDF</button></li>))}</ul></>}
                            {clientInvoices.length > 0 && <><h5>Invoices ({clientInvoices.length})</h5><ul className="db-sub-list">{clientInvoices.map(inv => (<li key={inv.id}>{inv.invoiceNumber} — <StatusBadge status={inv.status} /> — CHF {fmtChf(inv.amountCents)} <button type="button" className="mini" onClick={() => previewPdf(`/api/v1/finance/invoices/${inv.id}/pdf`)}>PDF</button></li>))}</ul></>}
                            {clientCars.length === 0 && clientContracts.length === 0 && clientInvoices.length === 0 && <p className="muted">No linked data</p>}
                          </div>
                        </td></tr>)}
                      </>)
                    })}{filteredDbClients.length === 0 && <tr><td colSpan={8} className="muted" style={{ padding: '1rem', textAlign: 'center' }}>No results found</td></tr>}</tbody>
                  </table>
                </div>
              </article>
            </>)}

            {clientsView === 'register' && (<>
              <button type="button" className="back-btn" onClick={() => setClientsView('choose')}>← Back</button>
              <div className="grid two">
                <article className="card"><h3>New Client</h3>
                  <div className="form">
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name *" />
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone" />
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" />
                    <input value={addrLine} onChange={e => setAddrLine(e.target.value)} placeholder="Street / address" />
                    <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="ZIP" />
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
                    <label className="field-label">Date of birth</label>
                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                    <button type="button" onClick={addClient} disabled={loading}>Save Client</button>
                  </div>
                </article>
                <article className="card"><h3>Register Customer Vehicle</h3><p className="hint">For dealership stock, use the Sales section.</p>
                  <div className="form">
                    <select value={carClientId} onChange={e => setCarClientId(e.target.value)}><option value="">Select client</option>{nonDealerClients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select>
                    <MakeModelVersionPicker make={carMake} model={carModel} version={carVersion} onMake={setCarMake} onModel={setCarModel} onVersion={setCarVersion} />
                    <FuelTypePicker value={carFuelType} onChange={setCarFuelType} />
                    <input value={carPlate} onChange={e => setCarPlate(e.target.value)} placeholder="Plate" />
                    <input value={carStamm} onChange={e => setCarStamm(e.target.value)} placeholder="Stammnummer (CH)" />
                    <input value={carVin} onChange={e => setCarVin(e.target.value)} placeholder="VIN (17 characters)" maxLength={17} />
                    <input value={carYear} onChange={e => setCarYear(e.target.value)} placeholder="Year" />
                    <label className="field-label">First registration date</label>
                    <input type="date" value={carFirstReg} onChange={e => setCarFirstReg(e.target.value)} />
                    <ColorPicker colors={CAR_COLORS} value={carColor} custom={carColorCustom} onChange={setCarColor} onCustom={setCarColorCustom} label="Exterior color (optional)" />
                    <ColorPicker colors={TRIM_COLORS} value={carTrimColor} custom={carTrimCustom} onChange={setCarTrimColor} onCustom={setCarTrimCustom} label="Trim / interior color (optional)" />
                    <input value={carMileage} onChange={e => setCarMileage(e.target.value)} placeholder="Mileage (km)" />
                    <input value={carBranch} onChange={e => setCarBranch(e.target.value)} placeholder="Branch (optional)" />
                    <textarea value={carNotes} onChange={e => setCarNotes(e.target.value)} placeholder="Notes" rows={2} />
                    <button type="button" onClick={addCustomerCar} disabled={loading}>Save Vehicle</button>
                  </div>
                </article>
              </div>
            </>)}
          </section>
        )}

        {/* FINANCE */}
        {page === 'finance' && (
          <section className="grid two">
            <article className="card"><h3>Create Invoice</h3>
              <div className="form">
                <select value={invRefType} onChange={e => { setInvRefType(e.target.value as 'WORKSHOP_JOB' | 'SALES_LEAD'); setInvRefId(''); setInvAmount('') }}><option value="WORKSHOP_JOB">Workshop job</option><option value="SALES_LEAD">Sales lead</option></select>
                <select value={invRefId} onChange={e => setInvRefId(e.target.value)}><option value="">{invRefOptions.length ? 'Select...' : 'No entries'}</option>{invRefOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
                <label className="field-label">Amount (CHF, incl. VAT)</label>
                <input value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder="Amount" type="number" min="0" step="0.01" />
                {invAmount && parseFloat(invAmount) > 0 && <VatLine cents={Math.round(parseFloat(invAmount) * 100)} />}
                <button type="button" onClick={createInvoice} disabled={loading}>Create Invoice</button>
              </div>
            </article>
            <article className="card wide"><h3>Invoice Queue</h3>
              <ul className="list">{invoices.map(f => { let refLabel = f.referenceId.substring(0, 8) + '...'; if (f.referenceType === 'WORKSHOP_JOB') { const j = jobs.find(x => x.id === f.referenceId); if (j) refLabel = `Job: ${j.title}` } else { const l = leads.find(x => x.id === f.referenceId); if (l) refLabel = `Lead: ${l.client.displayName}` }; return (<li key={f.id}><strong>{f.invoiceNumber}</strong> — {refLabel} <StatusBadge status={f.status} /><br /><span className="muted">{f.client.displayName} · {f.currency} {fmtChf(f.amountCents)}</span>{f.amountCents > 0 && <><br /><VatLine cents={f.amountCents} /></>}<select className="inline-select" value={f.status} onChange={e => setInvoiceStatus(f.id, e.target.value)} disabled={f.status === 'PAID'}>{INVOICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select><button type="button" className="mini" onClick={() => previewPdf(`/api/v1/finance/invoices/${f.id}/pdf`)}>Preview</button></li>) })}{invoices.length === 0 && <li className="muted">No invoices yet</li>}</ul>
            </article>
          </section>
        )}

        {page === 'admin' && <section className="card"><p className="muted">Administration module coming soon.</p></section>}
      </main>

      {confirmDelete && <ConfirmModal title="Confirm Deletion" message={confirmDelete.type === 'client' ? `Are you sure you want to delete client "${confirmDelete.label}"? All associated vehicles, jobs, invoices, leads, and contracts will also be permanently deleted.` : `Are you sure you want to delete vehicle "${confirmDelete.label}"? All associated jobs will also be deleted.`} onConfirm={() => confirmDelete.type === 'client' ? deleteClientConfirmed(confirmDelete.id) : deleteCarConfirmed(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />}
    </div>
  )
}

export default App
