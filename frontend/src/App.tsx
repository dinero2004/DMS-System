import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Dashboard from './Dashboard.tsx'
import { useAuth } from './auth/AuthContext'
import { LoginScreen } from './LoginScreen.tsx'
import { SettingsMenu } from './SettingsMenu.tsx'
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
type ContractView = { id: string; leadId?: string | null; client: ClientProfile | null; car: CarProfile | null; sellingPriceCents: number; prepFeeCents?: number; additionalCostsText?: string | null; additionalCostsCents?: number; insuranceCompany?: string; registrationPlate?: string; contractDate: string; notes?: string; createdAt: string }
type FinancingView = { id: string; car: CarProfile | null; client: ClientProfile | null; offerType: string; vehicleValueCents: number; downPaymentCents: number; residualValueCents?: number; residualPct?: number; durationMonths: number; interestRatePct: number; monthlyPaymentCents: number; createdAt: string }
type Page = 'home' | 'service' | 'sales' | 'clients' | 'finance' | 'admin'
type SalesAction = 'inventory' | 'lead' | 'contract' | 'financing'
type JobItem = { key: number; itemType: string; artNr: string; name: string; quantity: string; unit: string; unitPriceCents: string; discountPct: string }

const API = import.meta.env.VITE_API_BASE_URL ?? ''
function fmtChf(cents: number) { return (cents / 100).toFixed(2) }
function fmtVat(cents: number) { const incl = cents / 100; const excl = incl / (1 + SWISS_VAT_RATE); return { incl: incl.toFixed(2), excl: excl.toFixed(2), vat: (incl - excl).toFixed(2) } }
function todayStr() { return new Date().toISOString().slice(0, 10) }
const KNOWN_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'DONE', 'NEW', 'CONTACTED', 'NEGOTIATION', 'WON', 'LOST', 'DRAFT', 'POSTED', 'PAID'])
function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const label = KNOWN_STATUSES.has(status) ? (t as (k: string) => string)(`status.${status}`) : status.replace(/_/g, ' ')
  return <span className={`status-badge status-${status}`}>{label}</span>
}

let itemKeyCounter = 0
function emptyItem(): JobItem { return { key: ++itemKeyCounter, itemType: 'SERVICE', artNr: '', name: '', quantity: '1', unit: 'pc', unitPriceCents: '0', discountPct: '0' } }
function catalogToItem(c: CatalogItem): JobItem { return { key: ++itemKeyCounter, itemType: c.category, artNr: c.artNr, name: c.name, quantity: '1', unit: c.unit, unitPriceCents: String(c.unitPriceCents / 100), discountPct: '0' } }
function itemTotal(it: JobItem) { const q = parseFloat(it.quantity) || 0; const p = parseFloat(it.unitPriceCents) || 0; const d = parseFloat(it.discountPct) || 0; return q * p * (1 - d / 100) }

function formatRate(raw: string): string {
  const n = parseFloat(raw); if (isNaN(n)) return raw
  if (n > 20) return (n / 100).toFixed(2)
  return n.toFixed(2)
}

function FieldHint({ ok, err, show }: { ok: boolean; err?: string; show: boolean }) {
  const { t } = useTranslation()
  if (!show) return null
  if (err) return <span className="field-msg field-msg-error">{err}</span>
  if (ok) return <span className="field-msg field-msg-ok">{t('common.ok')}</span>
  return null
}

function VinInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const { t } = useTranslation()
  const n = value.trim().length
  return (
    <div className="vin-wrap">
      <input id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={t('vin.placeholder')} maxLength={17} className={n > 0 && n !== 17 ? 'input-warn' : ''} />
      <span className={`vin-counter${n === 17 ? ' vin-counter-ok' : ''}`}>{t('vin.counter', { n })}</span>
    </div>
  )
}

function ConfirmModal({ title, message, onConfirm, onCancel }: { title: string; message: string; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3><p>{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>
          <button type="button" className="btn-danger" onClick={onConfirm}>{t('common.delete')}</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const { t, i18n } = useTranslation()
  const { user, checking, onSessionExpired } = useAuth()
  const [page, setPage] = useState<Page>('home')
  const [salesAction, setSalesAction] = useState<SalesAction | null>(null)
  const [salesView, setSalesView] = useState<'actions' | 'dashboard'>('actions')
  const [serviceView, setServiceView] = useState<'dashboard' | 'board'>('dashboard')
  const [showJobForm, setShowJobForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(() => t('msg.ready'))

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

  // Contract form (customer + vehicle, not lead)
  const [ctClientSearch, setCtClientSearch] = useState(''); const [ctClientResults, setCtClientResults] = useState<ClientProfile[]>([])
  const [ctClientId, setCtClientId] = useState('')
  const [ctNewCustomer, setCtNewCustomer] = useState(false)
  const [ctNewFirst, setCtNewFirst] = useState(''); const [ctNewLast, setCtNewLast] = useState(''); const [ctNewPhone, setCtNewPhone] = useState(''); const [ctNewEmail, setCtNewEmail] = useState('')
  const [ctNewAddr, setCtNewAddr] = useState(''); const [ctNewZip, setCtNewZip] = useState(''); const [ctNewCity, setCtNewCity] = useState(''); const [ctNewBirth, setCtNewBirth] = useState('')
  const [ctCarId, setCtCarId] = useState('')
  const [ctPrice, setCtPrice] = useState(''); const [ctPrepFee, setCtPrepFee] = useState(String(DEFAULT_PREP_FEE_CHF))
  const [ctAdditionalText, setCtAdditionalText] = useState(''); const [ctAdditionalChf, setCtAdditionalChf] = useState('')
  const [ctInsurance, setCtInsurance] = useState(''); const [ctPlate, setCtPlate] = useState(''); const [ctNotes, setCtNotes] = useState('')
  const [lastCreatedContractId, setLastCreatedContractId] = useState<string | null>(null)

  const [editingInvCarId, setEditingInvCarId] = useState<string | null>(null)
  const [editInv, setEditInv] = useState({ make: '', model: '', plate: '', vin: '', year: '', mileage: '', selling: '', purchase: '', prep: '', fuel: '', firstReg: '', notes: '' })

  // Financing form
  const [finType, setFinType] = useState<'LEASING' | 'FINANCING'>('LEASING')
  const [finCarId, setFinCarId] = useState(''); const [finClientId, setFinClientId] = useState('')
  const [finValue, setFinValue] = useState(''); const [finDown, setFinDown] = useState('0')
  const [finResidual, setFinResidual] = useState(''); const [finResidualPct, setFinResidualPct] = useState('')
  const [finDuration, setFinDuration] = useState('36'); const [finCustomDuration, setFinCustomDuration] = useState('')
  const [finRate, setFinRate] = useState('3.49')
  const [finViewMode, setFinViewMode] = useState<'new' | 'existing'>('new')

  // Invoice form
  const [invRefType, setInvRefType] = useState<'WORKSHOP_JOB' | 'SALES_LEAD' | 'SALES_CONTRACT'>('WORKSHOP_JOB')
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
  const nonInventoryCars = useMemo(() => cars.filter(c => c.vehicleRole !== 'FOR_SALE_INVENTORY'), [cars])
  const finClientCars = useMemo(() => (finClientId ? nonInventoryCars.filter(c => c.clientId === finClientId) : nonInventoryCars), [nonInventoryCars, finClientId])
  const invRefOptions = useMemo(() => {
    if (invRefType === 'WORKSHOP_JOB') return jobs.map(j => ({ id: j.id, label: `${j.title} — ${j.client.displayName} (${(t as (k: string) => string)(`status.${j.status}`)})`, totalCents: j.totalCents }))
    if (invRefType === 'SALES_CONTRACT') return contracts.map(c => ({ id: c.id, label: `${c.client?.displayName ?? '—'} — ${c.car ? `${c.car.make ?? ''} ${c.car.model}` : '—'} — ${c.contractDate}`, totalCents: (c.sellingPriceCents ?? 0) + (c.prepFeeCents ?? 0) + (c.additionalCostsCents ?? 0) }))
    return leads.map(l => ({ id: l.id, label: `${l.client.displayName} — ${(t as (k: string) => string)(`status.${l.status}`)}${l.interestModel ? ` — ${l.interestModel}` : ''}`, totalCents: 0 }))
  }, [invRefType, jobs, leads, contracts, t])

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

  const apiBase: RequestInit = { credentials: 'include' }
  async function get<T>(p: string): Promise<T> {
    const r = await fetch(`${API}${p}`, apiBase)
    if (r.status === 401) {
      onSessionExpired()
      throw new Error('HTTP 401')
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
    return r.json() as Promise<T>
  }
  async function post<T>(p: string, body: unknown): Promise<T> {
    const r = await fetch(`${API}${p}`, {
      ...apiBase,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.status === 401) {
      onSessionExpired()
      throw new Error('HTTP 401')
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
    return r.json() as Promise<T>
  }
  async function put<T>(p: string, body: unknown): Promise<T> {
    const r = await fetch(`${API}${p}`, {
      ...apiBase,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (r.status === 401) {
      onSessionExpired()
      throw new Error('HTTP 401')
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
    return r.json() as Promise<T>
  }
  async function del<T>(p: string): Promise<T> {
    const r = await fetch(`${API}${p}`, { ...apiBase, method: 'DELETE' })
    if (r.status === 401) {
      onSessionExpired()
      throw new Error('HTTP 401')
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`)
    return r.json() as Promise<T>
  }

  const refresh = useCallback(async () => {
    const [cl, ca, jo, le, inv, ct, fin] = await Promise.all([
      get<ClientProfile[]>('/api/v1/clients'), get<CarProfile[]>('/api/v1/cars'),
      get<WorkshopJobView[]>('/api/v1/workshop/jobs'), get<SalesLeadView[]>('/api/v1/sales/leads'),
      get<InvoiceView[]>('/api/v1/finance/invoices'), get<ContractView[]>('/api/v1/sales/contracts'),
      get<FinancingView[]>('/api/v1/sales/financing'),
    ])
    setClients(cl); setCars(ca); setJobs(jo); setLeads(le); setInvoices(inv); setContracts(ct); setFinancingOffers(fin)
  }, [])

  useEffect(() => {
    const lng = (i18n.resolvedLanguage ?? 'en').split('-')[0]
    document.documentElement.lang = lng
    document.title = t('app.title')
  }, [i18n.resolvedLanguage, t])

  useEffect(() => {
    if (!user) return
    refresh().catch(e => {
      const m = e instanceof Error ? e.message : String(e)
      if (m.includes('401')) return
      if (/502|503|504|ECONNREFUSED|Failed to fetch|NetworkError|bad gateway/i.test(m)) {
        setMsg(t('msg.apiUnreachable'))
      } else {
        setMsg(m || t('msg.backendUnreachable'))
      }
    })
  }, [user, refresh, t])
  useEffect(() => { if (!jobClientId) return; const m = carsForJob[0]; if (m && !carsForJob.some(c => c.id === jobCarId)) setJobCarId(m.id); if (!m) setJobCarId('') }, [jobClientId, carsForJob, jobCarId])

  useEffect(() => {
    if (invRefType === 'WORKSHOP_JOB' && invRefId) {
      const job = jobs.find(j => j.id === invRefId)
      if (job && job.totalCents > 0) setInvAmount((job.totalCents * (1 + SWISS_VAT_RATE) / 100).toFixed(2))
    }
    if (invRefType === 'SALES_CONTRACT' && invRefId) {
      const ct = contracts.find(c => c.id === invRefId)
      if (ct) {
        const t = (ct.sellingPriceCents ?? 0) + (ct.prepFeeCents ?? 0) + (ct.additionalCostsCents ?? 0)
        if (t > 0) setInvAmount((t / 100).toFixed(2))
      }
    }
  }, [invRefId, invRefType, jobs, contracts])

  useEffect(() => {
    if (finCarId && !finClientCars.some(c => c.id === finCarId)) setFinCarId('')
  }, [finClientId, finClientCars, finCarId])

  function resolveColor(main: string, custom: string) { return main === '__other' ? custom.trim() : main }
  function buildModel(model: string, version: string) { const m = model === '__other' ? '' : model; return version ? `${m} ${version}`.trim() : m }

  async function addClient() {
    if (!firstName.trim()) return setMsg(t('msg.firstNameRequired'))
    if (firstName.trim().length < 2) return setMsg(t('msg.firstNameMin2'))
    if (email.trim() && !email.includes('@')) return setMsg(t('msg.invalidEmail'))
    setLoading(true)
    try { await post<ApiResponse>('/api/v1/clients', { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim(), addressLine: addrLine.trim(), zipCode: zipCode.trim(), city: city.trim(), birthday: birthday || undefined }); setFirstName(''); setLastName(''); setPhone(''); setEmail(''); setAddrLine(''); setZipCode(''); setCity(''); setBirthday(''); await refresh(); setMsg(t('msg.clientCreated')) } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function updateClientSubmit() {
    if (!editingClientId) return
    setLoading(true)
    try { await put<ApiResponse>(`/api/v1/clients/${editingClientId}`, editClient); setEditingClientId(null); await refresh(); setMsg(t('msg.clientUpdated')) } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }
  async function deleteClientConfirmed(id: string) { setLoading(true); setConfirmDelete(null); try { await del<ApiResponse>(`/api/v1/clients/${id}`); await refresh(); setMsg(t('msg.clientDeleted')) } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) } }
  async function deleteCarConfirmed(id: string) { setLoading(true); setConfirmDelete(null); try { await del<ApiResponse>(`/api/v1/cars/${id}`); await refresh(); setMsg(t('msg.carDeleted')) } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) } }
  function startEditClient(c: ClientProfile) { setEditingClientId(c.id); setEditClient({ firstName: c.firstName || '', lastName: c.lastName || '', phone: c.phone || '', email: c.email || '', addressLine: c.addressLine || '', zipCode: c.zipCode || '', city: c.city || '', birthday: c.birthday || '' }) }

  async function addCustomerCar() {
    if (!carClientId) return setMsg(t('msg.selectOwner'))
    const m = buildModel(carModel, carVersion); if (!m) return setMsg(t('msg.modelRequired'))
    if (carVin.trim() && carVin.trim().length !== 17) return setMsg(t('msg.vin17'))
    setLoading(true)
    try {
      const y = carYear.trim() ? parseInt(carYear) : undefined; const mi = carMileage.trim() ? parseInt(carMileage) : undefined
      await post<ApiResponse>('/api/v1/cars', { clientId: carClientId, vehicleRole: 'CUSTOMER_OWNED', make: carMake.trim(), model: m, plate: carPlate.trim() || undefined, vin: carVin.trim(), stammnummer: carStamm.trim(), branchId: carBranch.trim(), modelYear: Number.isFinite(y) ? y : undefined, color: resolveColor(carColor, carColorCustom), trimColor: resolveColor(carTrimColor, carTrimCustom), mileageKm: Number.isFinite(mi) ? mi : undefined, notes: carNotes.trim(), fuelType: carFuelType || undefined, firstRegistrationDate: carFirstReg || undefined })
      setCarMake(''); setCarModel(''); setCarVersion(''); setCarPlate(''); setCarVin(''); setCarStamm(''); setCarBranch(''); setCarYear(''); setCarColor(''); setCarColorCustom(''); setCarTrimColor(''); setCarTrimCustom(''); setCarMileage(''); setCarNotes(''); setCarFuelType(''); setCarFirstReg(''); await refresh(); setMsg(t('msg.vehicleRegistered'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  function startEditInventory(c: CarProfile) {
    setEditingInvCarId(c.id)
    setEditInv({
      make: c.make ?? '',
      model: c.model ?? '',
      plate: c.plate ?? '',
      vin: c.vin ?? '',
      year: c.modelYear != null ? String(c.modelYear) : '',
      mileage: c.mileageKm != null ? String(c.mileageKm) : '',
      selling: c.sellingPriceCents != null ? (c.sellingPriceCents / 100).toFixed(2) : '',
      purchase: c.purchasePriceCents != null ? (c.purchasePriceCents / 100).toFixed(2) : '',
      prep: c.prepFeeCents != null ? (c.prepFeeCents / 100).toFixed(2) : '',
      fuel: c.fuelType ?? '',
      firstReg: c.firstRegistrationDate ?? '',
      notes: c.notes ?? '',
    })
  }

  function cancelEditInventory() {
    setEditingInvCarId(null)
    setEditInv({ make: '', model: '', plate: '', vin: '', year: '', mileage: '', selling: '', purchase: '', prep: '', fuel: '', firstReg: '', notes: '' })
  }

  function onFinancingVehicleChange(id: string) {
    setFinCarId(id)
    if (!id) return
    const car = finClientCars.find(c => c.id === id)
    if (!car) return
    const cents = car.sellingPriceCents ?? car.usedValueCents ?? car.catalogPriceCents
    if (cents != null && cents > 0) setFinValue((cents / 100).toFixed(2))
  }

  async function saveInventoryEdit() {
    if (!editingInvCarId) return
    if (!editInv.model.trim()) return setMsg(t('msg.modelRequired'))
    if (editInv.vin.trim() && editInv.vin.trim().length !== 17) return setMsg(t('msg.vin17'))
    setLoading(true)
    try {
      const y = editInv.year.trim() ? parseInt(editInv.year) : undefined
      const mi = editInv.mileage.trim() ? parseInt(editInv.mileage) : undefined
      await put<ApiResponse>(`/api/v1/cars/${editingInvCarId}`, {
        model: editInv.model.trim(),
        make: editInv.make.trim() || undefined,
        plate: editInv.plate.trim() || undefined,
        vin: editInv.vin.trim() || undefined,
        modelYear: Number.isFinite(y) ? y : undefined,
        mileageKm: Number.isFinite(mi) ? mi : undefined,
        sellingPriceCents: editInv.selling.trim() ? Math.round(parseFloat(editInv.selling) * 100) : undefined,
        purchasePriceCents: editInv.purchase.trim() ? Math.round(parseFloat(editInv.purchase) * 100) : undefined,
        prepFeeCents: editInv.prep.trim() ? Math.round(parseFloat(editInv.prep) * 100) : undefined,
        fuelType: editInv.fuel.trim() || undefined,
        firstRegistrationDate: editInv.firstReg.trim() || undefined,
        notes: editInv.notes.trim() || undefined,
      })
      cancelEditInventory()
      await refresh()
      setMsg(t('msg.inventoryUpdated'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function addInventoryCar() {
    const m = buildModel(invModel, invVersion); if (!m) return setMsg(t('msg.modelRequired'))
    if (invVin.trim() && invVin.trim().length !== 17) return setMsg(t('msg.vin17'))
    setLoading(true)
    try {
      const y = invYear.trim() ? parseInt(invYear) : undefined; const mi = invMileage.trim() ? parseInt(invMileage) : undefined
      const pp = invPurchasePrice.trim() ? Math.round(parseFloat(invPurchasePrice) * 100) : undefined
      const cp = invCatalogPrice.trim() ? Math.round(parseFloat(invCatalogPrice) * 100) : undefined
      const uv = invUsedValue.trim() ? Math.round(parseFloat(invUsedValue) * 100) : undefined
      const sp = invSellingPrice.trim() ? Math.round(parseFloat(invSellingPrice) * 100) : undefined
      const pf = invPrepFee.trim() ? Math.round(parseFloat(invPrepFee) * 100) : undefined
      await post<ApiResponse>('/api/v1/cars', { vehicleRole: 'FOR_SALE_INVENTORY', make: invMake.trim(), model: m, plate: invPlate.trim() || undefined, vin: invVin.trim(), stammnummer: invStamm.trim(), modelYear: Number.isFinite(y) ? y : undefined, color: resolveColor(invColor, invColorCustom), trimColor: resolveColor(invTrimColor, invTrimCustom), mileageKm: Number.isFinite(mi) ? mi : undefined, notes: invNotes.trim(), purchasePriceCents: pp, catalogPriceCents: cp, usedValueCents: uv, sellingPriceCents: sp, prepFeeCents: pf, arrivalDate: invArrivalDate || undefined, fuelType: invFuelType || undefined, firstRegistrationDate: invFirstReg || undefined })
      setInvMake(''); setInvModel(''); setInvVersion(''); setInvPlate(''); setInvVin(''); setInvStamm(''); setInvYear(''); setInvColor(''); setInvColorCustom(''); setInvTrimColor(''); setInvTrimCustom(''); setInvMileage(''); setInvNotes(''); setInvPurchasePrice(''); setInvCatalogPrice(''); setInvUsedValue(''); setInvSellingPrice(''); setInvPrepFee(String(DEFAULT_PREP_FEE_CHF)); setInvArrivalDate(''); setInvFuelType(''); setInvFirstReg(''); await refresh(); setMsg(t('msg.inventoryAdded'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function createJob() {
    if (!jobClientId || !jobCarId || !jobTitle.trim()) return setMsg(t('msg.clientCarTitleVin'))
    setLoading(true)
    try {
      const items = jobItems.filter(i => i.name.trim()).map(i => ({ itemType: i.itemType, artNr: i.artNr.trim() || undefined, name: i.name.trim(), quantity: parseFloat(i.quantity) || 1, unit: i.unit || 'pc', unitPriceCents: Math.round((parseFloat(i.unitPriceCents) || 0) * 100), discountPct: parseFloat(i.discountPct) || 0 }))
      const res = await post<ApiResponse>('/api/v1/workshop/jobs', { clientId: jobClientId, carId: jobCarId, title: jobTitle.trim(), description: jobDesc.trim() || undefined, items: items.length > 0 ? items : undefined })
      setJobTitle(''); setJobDesc(''); setJobItems([]); setShowJobForm(false); setLastCreatedJobId(res.id); await refresh(); setMsg(t('msg.jobCreated'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function createInvoiceFromJob(jobId: string) {
    const job = jobs.find(j => j.id === jobId); if (!job) return
    setLoading(true)
    try { await post<ApiResponse>('/api/v1/finance/invoices', { referenceType: 'WORKSHOP_JOB', referenceId: jobId, amountCents: Math.round(job.totalCents * (1 + SWISS_VAT_RATE)), currency: 'CHF' }); setLastCreatedJobId(null); await refresh(); setMsg(t('msg.invoiceFromJob')) } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  function contractInvoiceTotalCents(ct: ContractView) {
    return (ct.sellingPriceCents ?? 0) + (ct.prepFeeCents ?? 0) + (ct.additionalCostsCents ?? 0)
  }

  async function createInvoiceFromContract(contractId: string) {
    const ct = contracts.find(c => c.id === contractId); if (!ct) return
    const total = contractInvoiceTotalCents(ct); if (total <= 0) return setMsg(t('msg.contractTotalZero'))
    setLoading(true)
    try {
      await post<ApiResponse>('/api/v1/finance/invoices', { referenceType: 'SALES_CONTRACT', referenceId: contractId, amountCents: total, currency: 'CHF' })
      setLastCreatedContractId(null); await refresh(); setMsg(t('msg.invoiceFromContract'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function setJobStatus(id: string, status: string) { setLoading(true); try { await post<ApiResponse>(`/api/v1/workshop/jobs/${id}/status`, { status }); await refresh() } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) } }
  async function setLeadStatus(id: string, status: string) { setLoading(true); try { await post<ApiResponse>(`/api/v1/sales/leads/${id}/status`, { status }); await refresh() } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) } }
  async function searchClients(q: string) { setLeadSearch(q); if (q.trim().length < 2) { setLeadSearchResults([]); return }; try { const r = await get<ClientProfile[]>(`/api/v1/clients?q=${encodeURIComponent(q.trim())}`); setLeadSearchResults(r.filter(c => c.id !== DEALER_STOCK_CLIENT_ID)) } catch { setLeadSearchResults([]) } }
  async function searchContractClients(q: string) { setCtClientSearch(q); if (q.trim().length < 2) { setCtClientResults([]); return }; try { const r = await get<ClientProfile[]>(`/api/v1/clients?q=${encodeURIComponent(q.trim())}`); setCtClientResults(r.filter(c => c.id !== DEALER_STOCK_CLIENT_ID)) } catch { setCtClientResults([]) } }
  function selectLeadClient(c: ClientProfile) { setLeadClientId(c.id); setLeadSearch(c.displayName); setLeadSearchResults([]); setLeadNewClient(false) }
  function selectContractClient(c: ClientProfile) { setCtClientId(c.id); setCtClientSearch(c.displayName); setCtClientResults([]); setCtNewCustomer(false) }

  async function createLead() {
    setLoading(true)
    try {
      let clientId = leadClientId
      if (leadNewClient) {
        if (!leadFirstName.trim()) { setMsg(t('msg.firstNameRequiredLead')); setLoading(false); return }
        const r = await post<ApiResponse>('/api/v1/clients', { firstName: leadFirstName.trim(), lastName: leadLastName.trim(), phone: leadPhone.trim(), email: leadEmail.trim() }); clientId = r.id; setLeadNewClient(false); setLeadFirstName(''); setLeadLastName(''); setLeadPhone(''); setLeadEmail('')
      }
      if (!clientId) { setMsg(t('msg.selectClient')); setLoading(false); return }
      await post<ApiResponse>('/api/v1/sales/leads', { clientId, carId: leadCarId || undefined, interestModel: leadInterest.trim(), notes: leadNotes.trim(), leadSource: leadSource.trim() })
      setLeadSearch(''); setLeadClientId(''); setLeadCarId(''); setLeadInterest(''); setLeadNotes(''); setLeadSource(''); await refresh(); setMsg(t('msg.leadCreated'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function createContract() {
    let clientId = ctClientId
    let profileJustCreated = false
    if (ctNewCustomer) {
      if (!ctNewFirst.trim() || ctNewFirst.trim().length < 2) return setMsg(t('msg.newCustomerFn'))
      if (!ctNewAddr.trim() || !ctNewZip.trim() || !ctNewCity.trim()) return setMsg(t('msg.newCustomerAddr'))
      if (!ctNewBirth.trim()) return setMsg(t('msg.newCustomerBirth'))
      if (ctNewEmail.trim() && !ctNewEmail.includes('@')) return setMsg(t('msg.invalidEmail'))
      setLoading(true)
      try {
        const r = await post<ApiResponse>('/api/v1/clients', { firstName: ctNewFirst.trim(), lastName: ctNewLast.trim(), phone: ctNewPhone.trim(), email: ctNewEmail.trim(), addressLine: ctNewAddr.trim(), zipCode: ctNewZip.trim(), city: ctNewCity.trim(), birthday: ctNewBirth })
        clientId = r.id
        profileJustCreated = true
        setCtNewCustomer(false); setCtNewFirst(''); setCtNewLast(''); setCtNewPhone(''); setCtNewEmail(''); setCtNewAddr(''); setCtNewZip(''); setCtNewCity(''); setCtNewBirth('')
      } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')); setLoading(false); return }
    }
    if (!clientId) return setMsg(t('msg.selectCustomer'))
    if (!ctCarId) return setMsg(t('msg.selectInventoryVehicle'))
    if (!ctPrice.trim()) return setMsg(t('msg.priceRequired'))
    const cents = Math.round(parseFloat(ctPrice) * 100); if (isNaN(cents) || cents <= 0) return setMsg(t('msg.validPrice'))
    const prepC = ctPrepFee.trim() ? Math.round(parseFloat(ctPrepFee) * 100) : 0
    const addC = ctAdditionalChf.trim() ? Math.round(parseFloat(ctAdditionalChf) * 100) : 0
    if (!profileJustCreated) {
      const cl = clients.find(c => c.id === clientId)
      if (!cl?.addressLine?.trim() || !cl?.zipCode?.trim() || !cl?.city?.trim() || !cl?.birthday) return setMsg(t('msg.customerAddrBirth'))
    }
    setLoading(true)
    try {
      const res = await post<ApiResponse>('/api/v1/sales/contracts', {
        clientId, carId: ctCarId, sellingPriceCents: cents, prepFeeCents: prepC,
        additionalCostsText: ctAdditionalText.trim() || undefined, additionalCostsCents: addC > 0 ? addC : undefined,
        insuranceCompany: ctInsurance.trim(), registrationPlate: ctPlate.trim(), contractDate: todayStr(), notes: ctNotes.trim(),
      })
      setLastCreatedContractId(res.id); setCtClientId(''); setCtClientSearch(''); setCtCarId(''); setCtPrice(''); setCtPrepFee(String(DEFAULT_PREP_FEE_CHF)); setCtAdditionalText(''); setCtAdditionalChf(''); setCtInsurance(''); setCtPlate(''); setCtNotes(''); await refresh(); setMsg(t('msg.contractCreated'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function createFinancingOffer() {
    const dur = finDuration === 'custom' ? parseInt(finCustomDuration) : parseInt(finDuration)
    const vv = parseFloat(finValue); if (!vv || vv <= 0) return setMsg(t('msg.vehicleValueRequired'))
    if (!dur || dur <= 0) return setMsg(t('msg.durationRequired'))
    setLoading(true)
    try {
      await post<ApiResponse>('/api/v1/sales/financing', { offerType: finType, carId: finCarId || undefined, clientId: finClientId || undefined, vehicleValueCents: Math.round(vv * 100), downPaymentCents: Math.round((parseFloat(finDown) || 0) * 100), residualValueCents: finType === 'LEASING' && finResidual ? Math.round(parseFloat(finResidual) * 100) : undefined, residualPct: finType === 'LEASING' && finResidualPct ? parseFloat(finResidualPct) : undefined, durationMonths: dur, interestRatePct: parseFloat(finRate) || 0 })
      await refresh(); setMsg(t('msg.offerCreated'))
    } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function createInvoice() {
    if (!invRefId.trim()) return setMsg(t('msg.selectRef')); const amt = Number(invAmount); if (isNaN(amt) || amt <= 0) return setMsg(t('msg.amountPositive'))
    setLoading(true)
    try { await post<ApiResponse>('/api/v1/finance/invoices', { referenceType: invRefType, referenceId: invRefId, amountCents: Math.round(amt * 100), currency: 'CHF' }); setInvRefId(''); setInvAmount(''); await refresh(); setMsg(t('msg.invoiceCreated')) } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) }
  }

  async function setInvoiceStatus(id: string, status: string) { setLoading(true); try { await post<ApiResponse>(`/api/v1/finance/invoices/${id}/status`, { status }); await refresh() } catch (e) { setMsg(e instanceof Error ? e.message : t('msg.error')) } finally { setLoading(false) } }
  async function previewPdf(url: string) {
    try {
      const r = await fetch(`${API}${url}`, { credentials: 'include' })
      if (r.status === 401) {
        onSessionExpired()
        return
      }
      if (!r.ok) {
        setMsg(t('msg.pdfFailed'))
        return
      }
      const blob = await r.blob()
      const objectUrl = URL.createObjectURL(blob)
      const w = window.open(objectUrl, '_blank', 'noopener,noreferrer')
      if (!w) {
        URL.revokeObjectURL(objectUrl)
        setMsg(t('msg.popupBlocked'))
        return
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t('msg.pdfFailed'))
    }
  }
  function updateJobItem(key: number, field: keyof JobItem, value: string) { setJobItems(prev => prev.map(i => i.key === key ? { ...i, [field]: value } : i)) }
  function removeJobItem(key: number) { setJobItems(prev => prev.filter(i => i.key !== key)) }

  function ColorPicker({ colors, value, custom, onChange, onCustom, label }: { colors: ColorOption[]; value: string; custom: string; onChange: (v: string) => void; onCustom: (v: string) => void; label: string }) {
    return <>
      <div className="color-picker-wrapper">
        <select value={value} onChange={e => { onChange(e.target.value); if (e.target.value !== '__other') onCustom('') }}>
          <option value="">{label}</option>{colors.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}<option value="__other">{t('common.other')}</option>
        </select>
        {value && value !== '__other' && <span className="color-swatch" style={{ background: colors.find(c => c.name === value)?.hex ?? '#ccc' }} />}
      </div>
      {value === '__other' && <input value={custom} onChange={e => onCustom(e.target.value)} placeholder={t('common.customColor')} />}
    </>
  }

  function MakeModelVersionPicker({ make, model, version, onMake, onModel, onVersion }: { make: string; model: string; version: string; onMake: (v: string) => void; onModel: (v: string) => void; onVersion: (v: string) => void }) {
    const models = make && make !== '__other' ? getModelList(make) : []
    const versions = (make && make !== '__other' && model && model !== '__other') ? getVersionList(make, model) : []
    return <>
      <select value={make} onChange={e => { onMake(e.target.value); onModel(''); onVersion('') }}>
        <option value="">{t('picker.make')}</option>{CAR_MAKE_LIST.map(m => <option key={m} value={m}>{m}</option>)}<option value="__other">{t('common.other')}</option>
      </select>
      {make === '__other' && <input value={model} onChange={e => { onModel(e.target.value); onVersion('') }} placeholder={t('common.typeMakeModel')} />}
      {make !== '__other' && (models.length > 0 ? (
        <select value={model} onChange={e => { onModel(e.target.value); onVersion('') }}>
          <option value="">{t('picker.model')}</option>{models.map(m => <option key={m} value={m}>{m}</option>)}<option value="__other">{t('common.otherModel')}</option>
        </select>
      ) : make ? <input value={model} onChange={e => { onModel(e.target.value); onVersion('') }} placeholder={t('picker.modelOther')} /> : null)}
      {make !== '__other' && model === '__other' && <input onChange={e => onModel(e.target.value)} placeholder={t('picker.modelOther')} />}
      {versions.length > 0 && (
        <select value={version} onChange={e => onVersion(e.target.value)}>
          <option value="">{t('picker.version')}</option>{versions.map(v => <option key={v} value={v}>{v}</option>)}<option value="__other">{t('common.other')}</option>
        </select>
      )}
      {version === '__other' && <input onChange={e => onVersion(e.target.value)} placeholder={t('common.typeVersion')} />}
    </>
  }

  function VatLine({ cents }: { cents: number }) { const v = fmtVat(cents); return <span className="vat-info">{t('vat.line', { excl: v.excl, vat: v.vat, incl: v.incl })}</span> }

  const SBtn = ({ id, label, disabled, title: navTitle }: { id: Page; label: string; disabled?: boolean; title?: string }) => (
    <button type="button" title={navTitle ?? label} disabled={disabled} className={page === id ? 'side-btn active' : `side-btn${disabled ? ' disabled' : ''}`} onClick={() => { if (!disabled) { setPage(id); if (id === 'clients') setClientsView('choose') } }}>{label}</button>
  )

  function fuelTypeLabel(f: string) {
    const m: Record<string, string> = {
      Petrol: t('fuel.Petrol'), Diesel: t('fuel.Diesel'), Electric: t('fuel.Electric'),
      'Hybrid (Petrol)': t('fuel.Hybrid (Petrol)'), 'Hybrid (Diesel)': t('fuel.Hybrid (Diesel)'),
      'Plug-in Hybrid (PHEV)': t('fuel.Plug-in Hybrid (PHEV)'), 'Natural Gas (CNG)': t('fuel.Natural Gas (CNG)'),
      LPG: t('fuel.LPG'), Hydrogen: t('fuel.Hydrogen'), PETROL: t('fuel.PETROL'),
    }
    return m[f] ?? f
  }
  function FuelTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return <select value={value} onChange={e => onChange(e.target.value)}><option value="">{t('common.fuelType')}</option>{FUEL_TYPES.map(f => <option key={f} value={f}>{fuelTypeLabel(f)}</option>)}</select>
  }

  if (checking) {
    return (
      <div className="app-boot">
        <p>{t('auth.checking')}</p>
      </div>
    )
  }

  if (!user) {
    return <LoginScreen />
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2 className="sidebar-title" onClick={() => setPage('home')}>{t('app.sidebar')}</h2>
        <SBtn id="home" label={t('nav.home')} />
        <SBtn id="service" label={t('nav.service')} />
        <SBtn id="sales" label={t('nav.sales')} />
        <SBtn id="admin" label={t('nav.admin')} title={t('nav.adminTitle')} />
        <hr className="sidebar-divider" />
        <SBtn id="clients" label={t('nav.clients')} />
        <SBtn id="finance" label={t('nav.finance')} />
      </aside>
      <main className="content">
        <header className="topbar">
          <h1>{t('app.title')}</h1>
          <div className="topbar-right">
            <SettingsMenu />
            <span className="badge">{loading ? t('app.working') : t('app.ready')}</span>
          </div>
        </header>
        <div className="info">{msg}</div>

        {page === 'home' && <Dashboard clients={clients} cars={cars} jobs={jobs} leads={leads} invoices={invoices} />}

        {/* SERVICE */}
        {page === 'service' && (
          <section>
            <div className="section-toggle">
              <button type="button" className={serviceView === 'dashboard' ? 'active' : ''} onClick={() => setServiceView('dashboard')}>{t('service.dashboard')}</button>
              <button type="button" className={serviceView === 'board' ? 'active' : ''} onClick={() => setServiceView('board')}>{t('service.jobBoard')}</button>
            </div>
            {serviceView === 'dashboard' && <Dashboard clients={clients} cars={cars} jobs={jobs} leads={leads} invoices={invoices} />}
            {serviceView === 'board' && <>
              <div className="action-chooser"><button type="button" className={showJobForm ? 'active' : ''} onClick={() => setShowJobForm(!showJobForm)}>{t('service.createJob')}</button></div>
              {showJobForm && (
                <article className="card" style={{ marginBottom: '1rem' }}>
                  <h3>{t('service.createWorkshopJob')}</h3>
                  <div className="form">
                    <select value={jobClientId} onChange={e => setJobClientId(e.target.value)}><option value="">{t('common.client')}</option>{nonDealerClients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select>
                    <select value={jobCarId} onChange={e => setJobCarId(e.target.value)}><option value="">{carsForJob.length ? t('service.carOption') : t('service.noCarsForClient')}</option>{carsForJob.map(c => <option key={c.id} value={c.id}>{c.make ? `${c.make} ` : ''}{c.model}{c.plate ? ` (${c.plate})` : ''}</option>)}</select>
                    <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder={t('service.jobTitlePh')} />
                    <textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} placeholder={t('common.description')} rows={2} />
                    <div className="items-section"><h4>{t('service.services')}</h4>
                      {jobItems.filter(i => i.itemType === 'SERVICE').map(it => (<div className="item-row" key={it.key}><input className="item-name" value={it.name} onChange={e => updateJobItem(it.key, 'name', e.target.value)} placeholder={t('common.itemName')} /><input className="item-qty" value={it.quantity} onChange={e => updateJobItem(it.key, 'quantity', e.target.value)} type="number" min="0" step="0.5" /><input className="item-unit" value={it.unit} onChange={e => updateJobItem(it.key, 'unit', e.target.value)} /><input className="item-price" value={it.unitPriceCents} onChange={e => updateJobItem(it.key, 'unitPriceCents', e.target.value)} type="number" min="0" step="0.01" placeholder={t('common.chf')} /><span className="item-total">{itemTotal(it).toFixed(2)}</span><button type="button" className="mini" onClick={() => removeJobItem(it.key)}>{t('common.minus')}</button></div>))}
                      <div className="add-item-row"><select onChange={e => { const c = WORKSHOP_CATALOG.filter(x => x.category === 'SERVICE').find(x => x.artNr === e.target.value); if (c) setJobItems(p => [...p, catalogToItem(c)]); e.target.value = '' }}><option value="">{t('service.addService')}</option>{WORKSHOP_CATALOG.filter(c => c.category === 'SERVICE').map(c => <option key={c.artNr} value={c.artNr}>{c.name} — CHF {(c.unitPriceCents / 100).toFixed(2)}</option>)}</select><button type="button" className="mini" onClick={() => setJobItems(p => [...p, { ...emptyItem(), itemType: 'SERVICE' }])}>{t('common.plusCustom')}</button></div>
                    </div>
                    <div className="items-section"><h4>{t('service.parts')}</h4>
                      {jobItems.filter(i => i.itemType === 'PART').map(it => (<div className="item-row" key={it.key}><input className="item-name" value={it.name} onChange={e => updateJobItem(it.key, 'name', e.target.value)} placeholder={t('common.itemName')} /><input className="item-qty" value={it.quantity} onChange={e => updateJobItem(it.key, 'quantity', e.target.value)} type="number" min="0" step="0.5" /><input className="item-unit" value={it.unit} onChange={e => updateJobItem(it.key, 'unit', e.target.value)} /><input className="item-price" value={it.unitPriceCents} onChange={e => updateJobItem(it.key, 'unitPriceCents', e.target.value)} type="number" min="0" step="0.01" placeholder={t('common.chf')} /><span className="item-total">{itemTotal(it).toFixed(2)}</span><button type="button" className="mini" onClick={() => removeJobItem(it.key)}>{t('common.minus')}</button></div>))}
                      <div className="add-item-row"><select onChange={e => { const c = WORKSHOP_CATALOG.filter(x => x.category === 'PART').find(x => x.artNr === e.target.value); if (c) setJobItems(p => [...p, catalogToItem(c)]); e.target.value = '' }}><option value="">{t('service.addPart')}</option>{WORKSHOP_CATALOG.filter(c => c.category === 'PART').map(c => <option key={c.artNr} value={c.artNr}>{c.name} — CHF {(c.unitPriceCents / 100).toFixed(2)}</option>)}</select><button type="button" className="mini" onClick={() => setJobItems(p => [...p, { ...emptyItem(), itemType: 'PART' }])}>{t('common.plusCustom')}</button></div>
                    </div>
                    {jobItems.length > 0 && <div style={{ textAlign: 'right', fontWeight: 600, marginTop: '.3rem' }}>{t('common.totalPrefix')} CHF {jobItems.reduce((s, i) => s + itemTotal(i), 0).toFixed(2)}<span className="vat-info" style={{ display: 'block' }}>{t('service.vatLine', { rate: (SWISS_VAT_RATE * 100).toFixed(1), total: (jobItems.reduce((s, i) => s + itemTotal(i), 0) * (1 + SWISS_VAT_RATE)).toFixed(2) })}</span></div>}
                    <button type="button" onClick={createJob} disabled={loading}>{t('service.createJob')}</button>
                  </div>
                </article>
              )}
              {lastCreatedJobId && <div className="quick-action"><span>{t('service.jobCreatedOk')}</span><button type="button" onClick={() => createInvoiceFromJob(lastCreatedJobId)}>{t('service.createInvoice')}</button><button type="button" className="mini" onClick={() => setLastCreatedJobId(null)}>{t('common.dismiss')}</button></div>}
              <article className="card"><h3>{t('service.jobBoardTitle', { n: jobs.length })}</h3>
                <ul className="list">{jobs.map(j => (<li key={j.id}><strong>{j.title}</strong> <StatusBadge status={j.status} /><select className="inline-select" value={j.status} onChange={e => setJobStatus(j.id, e.target.value)}>{JOB_STATUSES.map(s => <option key={s} value={s}>{(t as (k: string) => string)(`status.${s}`)}</option>)}</select>{j.description && <><br /><span className="muted">{j.description}</span></>}<br /><span className="muted">{t('common.customerPrefix')} {j.client.displayName}{j.client.phone ? ` · ${j.client.phone}` : ''}</span><br /><span className="muted">{t('common.vehiclePrefix')} {j.car.make ? `${j.car.make} ` : ''}{j.car.model}{j.car.plate ? ` (${j.car.plate})` : ''}{j.car.vin ? ` · ${t('common.vin')} ${j.car.vin}` : ''}</span>{j.items.length > 0 && <><br /><span className="muted">{t('service.jobItemsTotal', { n: j.items.length, v: fmtChf(j.totalCents) })}</span></>}<br /><button type="button" className="mini" onClick={() => createInvoiceFromJob(j.id)}>{t('service.createInvoice')}</button></li>))}{jobs.length === 0 && <li className="muted">{t('service.noJobs')}</li>}</ul>
              </article>
            </>}
          </section>
        )}

        {/* SALES */}
        {page === 'sales' && (
          <section>
            <div className="section-toggle">
              <button type="button" className={salesView === 'actions' ? 'active' : ''} onClick={() => setSalesView('actions')}>{t('sales.actions')}</button>
              <button type="button" className={salesView === 'dashboard' ? 'active' : ''} onClick={() => setSalesView('dashboard')}>{t('sales.dashboard')}</button>
            </div>
            {salesView === 'dashboard' && (<>
              {(() => { const tv = inventoryCars.reduce((s, c) => s + (c.sellingPriceCents ?? 0), 0); const tc = inventoryCars.reduce((s, c) => s + (c.purchasePriceCents ?? 0), 0); const tp = inventoryCars.reduce((s, c) => s + (c.prepFeeCents ?? 0), 0); const ep = tv - tc - tp; const am = tv > 0 ? (ep / tv * 100) : 0; return (
                <div className="stat-row" style={{ marginBottom: '1rem' }}>
                  <div className="stat-card"><span className="stat-value">{inventoryCars.length}</span><span className="stat-label">{t('sales.carsInStock')}</span></div>
                  <div className="stat-card"><span className="stat-value">CHF {(tv / 100).toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">{t('sales.inventoryValue')}</span></div>
                  <div className="stat-card"><span className="stat-value">CHF {(tc / 100).toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">{t('sales.totalInvested')}</span></div>
                  <div className="stat-card"><span className="stat-value" style={{ color: ep >= 0 ? '#16a34a' : '#dc2626' }}>CHF {(ep / 100).toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">{t('sales.estProfit')}</span></div>
                  <div className="stat-card"><span className="stat-value">{am.toFixed(1)}%</span><span className="stat-label">{t('sales.avgMargin')}</span></div>
                  <div className="stat-card"><span className="stat-value">{leads.length}</span><span className="stat-label">{t('sales.activeLeads')}</span></div>
                </div>)
              })()}
              <article className="card" style={{ marginBottom: '1rem' }}><h3>{t('sales.pipelineList')}</h3><ul className="list">{leads.map(s => (<li key={s.id}><strong>{s.client.displayName}</strong> <StatusBadge status={s.status} /><select className="inline-select" value={s.status} onChange={e => setLeadStatus(s.id, e.target.value)}>{LEAD_STATUSES.map(st => <option key={st} value={st}>{(t as (k: string) => string)(`status.${st}`)}</option>)}</select><br /><span className="muted">{s.client.phone || t('common.none')} · {s.client.email || t('common.none')}</span><br /><span className="muted">{t('common.vehiclePrefix')} {s.car ? `${s.car.make ? `${s.car.make} ` : ''}${s.car.model}${s.car.plate ? ` (${s.car.plate})` : ''}` : s.interestModel || t('common.notSpecified')}</span></li>))}{leads.length === 0 && <li className="muted">{t('sales.noLeads')}</li>}</ul></article>
              <article className="card"><h3>{t('sales.contractsList', { n: contracts.length })}</h3><ul className="list">{contracts.map(c => { const tot = contractInvoiceTotalCents(c); return (<li key={c.id}><strong>{c.client?.displayName ?? t('common.none')}</strong> — {c.car ? `${c.car.make ?? ''} ${c.car.model}` : t('common.none')} — {t('sales.totalFmt', { v: fmtChf(tot) })}{tot > 0 && <VatLine cents={tot} />}{(c.prepFeeCents ?? 0) > 0 || (c.additionalCostsCents ?? 0) > 0 ? <><br /><span className="muted">{t('sales.saleFmt', { v: fmtChf(c.sellingPriceCents) })}{(c.prepFeeCents ?? 0) > 0 ? ` · ${t('sales.prepFmt', { v: fmtChf(c.prepFeeCents ?? 0) })}` : ''}{(c.additionalCostsCents ?? 0) > 0 ? ` · ${t('sales.extrasFmt', { v: fmtChf(c.additionalCostsCents ?? 0) })}` : ''}</span></> : null}<br /><span className="muted">{c.contractDate}{c.insuranceCompany ? ` · ${c.insuranceCompany}` : ''}{c.registrationPlate ? ` · ${c.registrationPlate}` : ''}</span><button type="button" className="mini" onClick={() => previewPdf(`/api/v1/sales/contracts/${c.id}/pdf`)}>{t('sales.previewPdf')}</button></li>) })}{contracts.length === 0 && <li className="muted">{t('sales.noContracts')}</li>}</ul></article>
            </>)}
            {salesView === 'actions' && (<>
              <div className="action-chooser">
                <button type="button" className={`action-dept-inventory${salesAction === 'inventory' ? ' active' : ''}`} onClick={() => setSalesAction(salesAction === 'inventory' ? null : 'inventory')}>{t('sales.addInventory')}</button>
                <button type="button" className={`action-dept-lead${salesAction === 'lead' ? ' active' : ''}`} onClick={() => setSalesAction(salesAction === 'lead' ? null : 'lead')}>{t('sales.createLead')}</button>
                <button type="button" className={`action-dept-contract${salesAction === 'contract' ? ' active' : ''}`} onClick={() => setSalesAction(salesAction === 'contract' ? null : 'contract')}>{t('sales.createContract')}</button>
                <button type="button" className={`action-dept-finance${salesAction === 'financing' ? ' active' : ''}`} onClick={() => setSalesAction(salesAction === 'financing' ? null : 'financing')}>{t('sales.financing')}</button>
              </div>

              {lastCreatedContractId && <div className="quick-action"><span>{t('sales.contractDone')}</span><button type="button" onClick={() => createInvoiceFromContract(lastCreatedContractId)}>{t('service.createInvoice')}</button><button type="button" className="mini" onClick={() => setLastCreatedContractId(null)}>{t('common.dismiss')}</button></div>}

              {salesAction === 'inventory' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>{t('sales.addInventoryTitle')}</h3><p className="hint">{t('sales.inventoryHint')}</p>
                  <div className="form">
                    <MakeModelVersionPicker make={invMake} model={invModel} version={invVersion} onMake={setInvMake} onModel={setInvModel} onVersion={setInvVersion} />
                    <FuelTypePicker value={invFuelType} onChange={setInvFuelType} />
                    <input value={invPlate} onChange={e => setInvPlate(e.target.value)} placeholder={t('sales.plateOpt')} />
                    <input value={invStamm} onChange={e => setInvStamm(e.target.value)} placeholder={t('common.stamm')} />
                    <label className="field-label">{t('common.vin')}</label>
                    <VinInput value={invVin} onChange={setInvVin} id="inv-vin" />
                    <input value={invYear} onChange={e => setInvYear(e.target.value)} placeholder={t('common.year')} />
                    <label className="field-label">{t('common.firstReg')}</label>
                    <input type="date" value={invFirstReg} onChange={e => setInvFirstReg(e.target.value)} />
                    <ColorPicker colors={CAR_COLORS} value={invColor} custom={invColorCustom} onChange={setInvColor} onCustom={setInvColorCustom} label={t('common.exteriorColor')} />
                    <ColorPicker colors={TRIM_COLORS} value={invTrimColor} custom={invTrimCustom} onChange={setInvTrimColor} onCustom={setInvTrimCustom} label={t('common.trimColor')} />
                    <input value={invMileage} onChange={e => setInvMileage(e.target.value)} placeholder={t('common.mileage')} />
                    <label className="field-label">{t('sales.purchaseChf')}</label><input value={invPurchasePrice} onChange={e => setInvPurchasePrice(e.target.value)} placeholder={t('sales.purchaseChf')} type="number" min="0" step="0.01" />
                    <label className="field-label">{t('sales.catalogChf')}</label><input value={invCatalogPrice} onChange={e => setInvCatalogPrice(e.target.value)} placeholder={t('sales.catalogChf')} type="number" min="0" step="0.01" />
                    <label className="field-label">{t('sales.usedChf')}</label><input value={invUsedValue} onChange={e => setInvUsedValue(e.target.value)} placeholder={t('sales.usedChf')} type="number" min="0" step="0.01" />
                    <label className="field-label">{t('sales.sellingChf')}</label><input value={invSellingPrice} onChange={e => setInvSellingPrice(e.target.value)} placeholder={t('sales.sellingPricePh')} type="number" min="0" step="0.01" />
                    {invSellingPrice && parseFloat(invSellingPrice) > 0 && <VatLine cents={Math.round(parseFloat(invSellingPrice) * 100)} />}
                    <label className="field-label">{t('sales.prepChf')}</label><input value={invPrepFee} onChange={e => setInvPrepFee(e.target.value)} placeholder={t('sales.prepFeePh')} type="number" min="0" step="0.01" />
                    <label className="field-label">{t('sales.arrival')}</label><input type="date" value={invArrivalDate} onChange={e => setInvArrivalDate(e.target.value)} />
                    <textarea value={invNotes} onChange={e => setInvNotes(e.target.value)} placeholder={t('common.notes')} rows={2} />
                    <button type="button" onClick={addInventoryCar} disabled={loading}>{t('sales.addToInventory')}</button>
                  </div>
                </article>
              )}

              {salesAction === 'lead' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>{t('sales.createLeadTitle')}</h3><p className="hint">{t('sales.leadHint')}</p>
                  <div className="form">
                    <label className="field-label">{t('common.client')}</label>
                    <div style={{ position: 'relative' }}><input value={leadSearch} onChange={e => searchClients(e.target.value)} placeholder={t('sales.searchClient')} />{leadSearchResults.length > 0 && <ul className="autocomplete-list">{leadSearchResults.map(c => <li key={c.id} onClick={() => selectLeadClient(c)}>{c.displayName}{c.email ? ` · ${c.email}` : ''}</li>)}</ul>}</div>
                    {leadClientId && !leadNewClient && <span className="muted">{t('common.selectedPrefix')} {clientMap.get(leadClientId)}</span>}
                    {!leadNewClient && <button type="button" className="mini" onClick={() => { setLeadNewClient(true); setLeadClientId(''); setLeadSearchResults([]) }}>{t('sales.newClient')}</button>}
                    {leadNewClient && (<div className="form nested-form"><input value={leadFirstName} onChange={e => setLeadFirstName(e.target.value)} placeholder={t('common.firstName')} /><input value={leadLastName} onChange={e => setLeadLastName(e.target.value)} placeholder={t('common.lastName')} /><input value={leadPhone} onChange={e => setLeadPhone(e.target.value)} placeholder={t('common.phone')} /><input value={leadEmail} onChange={e => setLeadEmail(e.target.value)} placeholder={t('common.email')} /><button type="button" className="mini" onClick={() => setLeadNewClient(false)}>{t('common.cancel')}</button></div>)}
                    <label className="field-label">{t('sales.vehicleInterest')}</label>
                    <select value={leadCarId} onChange={e => setLeadCarId(e.target.value)}><option value="">{t('sales.selectInvOpt')}</option>{inventoryCars.map(c => <option key={c.id} value={c.id}>{c.make ? `${c.make} ` : ''}{c.model}{c.plate ? ` (${c.plate})` : ''}{c.sellingPriceCents ? ` — CHF ${fmtChf(c.sellingPriceCents)}` : ''}</option>)}</select>
                    <input value={leadInterest} onChange={e => setLeadInterest(e.target.value)} placeholder={t('sales.interestPh')} />
                    <input value={leadSource} onChange={e => setLeadSource(e.target.value)} placeholder={t('sales.sourcePh')} />
                    <textarea value={leadNotes} onChange={e => setLeadNotes(e.target.value)} placeholder={t('common.notes')} rows={2} />
                    <button type="button" onClick={createLead} disabled={loading}>{t('sales.createLead')}</button>
                  </div>
                </article>
              )}

              {salesAction === 'contract' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>{t('sales.contractTitle')}</h3><p className="hint">{t('sales.contractHint')}</p>
                  <div className="form">
                    <label className="field-label">{t('common.customer')}</label>
                    {!ctNewCustomer && (
                      <>
                        <div style={{ position: 'relative' }}><input value={ctClientSearch} onChange={e => searchContractClients(e.target.value)} placeholder={t('sales.searchName')} />{ctClientResults.length > 0 && <ul className="autocomplete-list">{ctClientResults.map(c => <li key={c.id} onClick={() => selectContractClient(c)}>{c.displayName}{c.email ? ` · ${c.email}` : ''}</li>)}</ul>}</div>
                        {ctClientId && <span className="muted">{t('common.selectedPrefix')} {clientMap.get(ctClientId)}</span>}
                        <button type="button" className="mini" onClick={() => { setCtNewCustomer(true); setCtClientId(''); setCtClientSearch(''); setCtClientResults([]) }}>{t('sales.registerNew')}</button>
                      </>
                    )}
                    {ctNewCustomer && (
                      <div className="nested-form">
                        <input value={ctNewFirst} onChange={e => setCtNewFirst(e.target.value)} placeholder={t('sales.firstNameStar')} />
                        <FieldHint ok={ctNewFirst.trim().length >= 2} err={ctNewFirst.length > 0 && ctNewFirst.trim().length < 2 ? t('common.min2') : undefined} show={ctNewFirst.length > 0} />
                        <input value={ctNewLast} onChange={e => setCtNewLast(e.target.value)} placeholder={t('sales.lastName')} />
                        <input value={ctNewPhone} onChange={e => setCtNewPhone(e.target.value)} placeholder={t('common.phone')} />
                        <input value={ctNewEmail} onChange={e => setCtNewEmail(e.target.value)} placeholder={t('common.email')} type="email" />
                        <FieldHint ok={!ctNewEmail.trim() || ctNewEmail.includes('@')} err={ctNewEmail.trim() && !ctNewEmail.includes('@') ? t('common.invalidEmail') : undefined} show={!!ctNewEmail.trim()} />
                        <input value={ctNewAddr} onChange={e => setCtNewAddr(e.target.value)} placeholder={t('sales.streetStar')} />
                        <FieldHint ok={!!ctNewAddr.trim()} show={ctNewAddr.length > 0} />
                        <input value={ctNewZip} onChange={e => setCtNewZip(e.target.value)} placeholder={t('sales.zipStar')} />
                        <input value={ctNewCity} onChange={e => setCtNewCity(e.target.value)} placeholder={t('sales.cityStar')} />
                        <FieldHint ok={!!ctNewZip.trim() && !!ctNewCity.trim()} err={(!ctNewZip.trim() || !ctNewCity.trim()) && (ctNewZip.length + ctNewCity.length > 0) ? t('common.zipCityReq') : undefined} show={ctNewZip.length + ctNewCity.length > 0} />
                        <label className="field-label">{t('sales.dobStar')}</label>
                        <input type="date" value={ctNewBirth} onChange={e => setCtNewBirth(e.target.value)} />
                        <FieldHint ok={!!ctNewBirth.trim()} show={ctNewCustomer} />
                        <button type="button" className="mini" onClick={() => { setCtNewCustomer(false); setCtClientResults([]) }}>{t('sales.cancelExisting')}</button>
                      </div>
                    )}
                    <label className="field-label">{t('sales.inventoryVehicle')}</label>
                    <select value={ctCarId} onChange={e => setCtCarId(e.target.value)}><option value="">{t('sales.selectStock')}</option>{inventoryCars.map(c => <option key={c.id} value={c.id}>{c.make ? `${c.make} ` : ''}{c.model}{c.plate ? ` (${c.plate})` : ''}{c.sellingPriceCents ? ` — CHF ${fmtChf(c.sellingPriceCents)}` : ''}</option>)}</select>
                    <label className="field-label">{t('sales.sellingVat', { vat: (SWISS_VAT_RATE * 100).toFixed(1) })}</label>
                    <input value={ctPrice} onChange={e => setCtPrice(e.target.value)} placeholder={t('sales.sellingPricePh')} type="number" min="0" step="0.01" />
                    {ctPrice && parseFloat(ctPrice) > 0 && <VatLine cents={Math.round(parseFloat(ctPrice) * 100)} />}
                    <label className="field-label">{t('sales.prepChf')}</label>
                    <input value={ctPrepFee} onChange={e => setCtPrepFee(e.target.value)} placeholder={t('sales.prepFeePh')} type="number" min="0" step="0.01" />
                    <label className="field-label">{t('sales.additionalLabel')}</label>
                    <input value={ctAdditionalText} onChange={e => setCtAdditionalText(e.target.value)} placeholder={t('sales.additionalPh')} />
                    <label className="field-label">{t('sales.additionalChf')}</label>
                    <input value={ctAdditionalChf} onChange={e => setCtAdditionalChf(e.target.value)} placeholder="0" type="number" min="0" step="0.01" />
                    <input value={ctInsurance} onChange={e => setCtInsurance(e.target.value)} placeholder={t('sales.insurancePh')} />
                    <input value={ctPlate} onChange={e => setCtPlate(e.target.value)} placeholder={t('sales.regPlatePh')} />
                    <textarea value={ctNotes} onChange={e => setCtNotes(e.target.value)} placeholder={t('common.notes')} rows={2} />
                    <button type="button" onClick={createContract} disabled={loading}>{t('sales.createContract')}</button>
                  </div>
                </article>
              )}

              {salesAction === 'financing' && (
                <article className="card" style={{ marginBottom: '1rem' }}><h3>{t('sales.finTitle')}</h3>
                  <div className="offer-toggle"><button type="button" className={finViewMode === 'new' ? 'active' : ''} onClick={() => setFinViewMode('new')}>{t('sales.newOffer')}</button><button type="button" className={finViewMode === 'existing' ? 'active' : ''} onClick={() => setFinViewMode('existing')}>{t('sales.existingOffers', { n: financingOffers.length })}</button></div>
                  {finViewMode === 'new' && (
                    <div className="fin-layout">
                      <div className="form fin-col">
                        <label className="field-label">{t('sales.offerType')}</label>
                        <select value={finType} onChange={e => setFinType(e.target.value as 'LEASING' | 'FINANCING')}><option value="LEASING">{t('sales.leasing')}</option><option value="FINANCING">{t('sales.financing')}</option></select>
                        <label className="field-label">{t('sales.clientOpt')}</label>
                        <select value={finClientId} onChange={e => { setFinClientId(e.target.value); setFinCarId('') }}><option value="">{t('sales.anyNotLinked')}</option>{nonDealerClients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select>
                        <label className="field-label">{t('sales.custVehicleOpt')}</label>
                        <select value={finCarId} onChange={e => onFinancingVehicleChange(e.target.value)}><option value="">{finClientCars.length ? t('sales.selectVehicle') : t('sales.noVehiclesPick')}</option>{finClientCars.map(c => <option key={c.id} value={c.id}>{c.make ? `${c.make} ` : ''}{c.model}{c.plate ? ` (${c.plate})` : ''}</option>)}</select>
                        <label className="field-label">{t('sales.vehicleValueVat')}</label>
                        <input value={finValue} onChange={e => setFinValue(e.target.value)} placeholder={t('sales.vehicleValuePh')} type="number" min="0" step="0.01" />
                        {finValue && parseFloat(finValue) > 0 && <VatLine cents={Math.round(parseFloat(finValue) * 100)} />}
                        <label className="field-label">{t('sales.downPayment')}</label>
                        <input value={finDown} onChange={e => setFinDown(e.target.value)} placeholder={t('sales.downPh')} type="number" min="0" step="0.01" />
                      </div>
                      <div className="form fin-col">
                        {finType === 'LEASING' && <><label className="field-label">{t('sales.residualVat')}</label><div className="fin-residual-row"><input className="fin-residual-input" value={finResidual} onChange={e => { setFinResidual(e.target.value); if (finValue && e.target.value) setFinResidualPct(((parseFloat(e.target.value) / parseFloat(finValue)) * 100).toFixed(1)) }} placeholder={t('sales.residualPh')} type="number" min="0" step="0.01" /><input className="fin-residual-pct" value={finResidualPct} onChange={e => { setFinResidualPct(e.target.value); if (finValue && e.target.value) setFinResidual(((parseFloat(e.target.value) / 100) * parseFloat(finValue)).toFixed(2)) }} placeholder="%" type="number" min="0" max="100" step="0.1" /><span className="muted fin-pct-suffix">%</span></div></>}
                        <label className="field-label">{t('sales.duration')}</label>
                        <select value={finDuration} onChange={e => setFinDuration(e.target.value)}>{DURATION_OPTIONS.map(d => <option key={d} value={String(d)}>{d} {t('common.months')}</option>)}<option value="custom">{t('sales.customMonths')}</option></select>
                        {finDuration === 'custom' && <input value={finCustomDuration} onChange={e => setFinCustomDuration(e.target.value)} placeholder={t('sales.monthsPh')} type="number" min="1" />}
                        <label className="field-label">{t('sales.annualRate')}</label>
                        <input value={finRate} onChange={e => setFinRate(e.target.value)} onBlur={() => setFinRate(formatRate(finRate))} placeholder={t('sales.ratePh')} type="text" inputMode="decimal" />
                        {finMonthly > 0 && <div className="finance-preview"><div className="monthly">CHF {fmtChf(finMonthly)}{t('common.perMonth')}</div><VatLine cents={finMonthly} /></div>}
                        <button type="button" onClick={createFinancingOffer} disabled={loading}>{t('sales.saveOfferPdf')}</button>
                      </div>
                    </div>
                  )}
                  {finViewMode === 'existing' && (<ul className="list">{financingOffers.map(f => (<li key={f.id}><strong>{f.offerType === 'LEASING' ? t('sales.leasing') : t('sales.financing')}</strong> — {f.car ? `${f.car.make ?? ''} ${f.car.model}` : t('sales.finNoVehicle')} — CHF {fmtChf(f.monthlyPaymentCents)}{t('common.perMonth')}<br /><span className="muted">{t('sales.finSummary', { name: f.client?.displayName ?? t('common.none'), months: f.durationMonths, rate: f.interestRatePct })}</span><br /><span className="muted">{t('sales.finVehicleLine', { vv: fmtChf(f.vehicleValueCents), dp: fmtChf(f.downPaymentCents), residual: f.residualValueCents ? ` · ${t('sales.residualPh')}: CHF ${fmtChf(f.residualValueCents)}` : '' })}</span><button type="button" className="mini" onClick={() => previewPdf(`/api/v1/sales/financing/${f.id}/pdf`)}>{t('sales.previewPdf')}</button></li>))}{financingOffers.length === 0 && <li className="muted">{t('sales.noOffers')}</li>}</ul>)}
                </article>
              )}

              <article className="card" style={{ marginBottom: '1rem' }}><h3>{t('sales.stockTitle', { n: inventoryCars.length })}</h3>
                {editingInvCarId && (
                  <div className="edit-form inv-inline-edit" style={{ marginBottom: '1rem' }}>
                    <h4 style={{ margin: '0 0 .5rem', fontSize: '.9rem' }}>{t('sales.editStock')}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '.45rem' }}>
                      <input value={editInv.make} onChange={e => setEditInv(p => ({ ...p, make: e.target.value }))} placeholder={t('picker.make')} />
                      <input value={editInv.model} onChange={e => setEditInv(p => ({ ...p, model: e.target.value }))} placeholder={`${t('picker.model')} *`} />
                      <input value={editInv.plate} onChange={e => setEditInv(p => ({ ...p, plate: e.target.value }))} placeholder={t('common.plate')} />
                      <div style={{ gridColumn: '1 / -1' }}><VinInput value={editInv.vin} onChange={v => setEditInv(p => ({ ...p, vin: v }))} /></div>
                      <input value={editInv.year} onChange={e => setEditInv(p => ({ ...p, year: e.target.value }))} placeholder={t('common.year')} />
                      <input value={editInv.mileage} onChange={e => setEditInv(p => ({ ...p, mileage: e.target.value }))} placeholder={`${t('sales.tableMileage')} ${t('sales.km')}`} />
                      <input value={editInv.fuel} onChange={e => setEditInv(p => ({ ...p, fuel: e.target.value }))} placeholder={t('common.fuelType')} />
                      <input type="date" value={editInv.firstReg} onChange={e => setEditInv(p => ({ ...p, firstReg: e.target.value }))} />
                      <input value={editInv.purchase} onChange={e => setEditInv(p => ({ ...p, purchase: e.target.value }))} placeholder={t('sales.purchaseShort')} type="number" min="0" step="0.01" />
                      <input value={editInv.prep} onChange={e => setEditInv(p => ({ ...p, prep: e.target.value }))} placeholder={t('sales.prepShort')} type="number" min="0" step="0.01" />
                      <input value={editInv.selling} onChange={e => setEditInv(p => ({ ...p, selling: e.target.value }))} placeholder={t('sales.sellingShort')} type="number" min="0" step="0.01" />
                      <textarea value={editInv.notes} onChange={e => setEditInv(p => ({ ...p, notes: e.target.value }))} placeholder={t('common.notes')} rows={2} style={{ gridColumn: '1 / -1' }} />
                    </div>
                    <div className="edit-actions" style={{ marginTop: '.5rem' }}>
                      <button type="button" className="btn-save" onClick={saveInventoryEdit} disabled={loading}>{t('common.save')}</button>
                      <button type="button" className="btn-cancel" onClick={cancelEditInventory}>{t('common.cancel')}</button>
                    </div>
                  </div>
                )}
                {inventoryCars.length > 0 ? (<div style={{ overflowX: 'auto' }}>
                  <table className="inv-table"><thead><tr><th>{t('sales.tableVehicle')}</th><th>{t('sales.tableFuel')}</th><th>{t('sales.tableYear')}</th><th>{t('sales.tableFirstReg')}</th><th>{t('sales.tableColor')}</th><th>{t('sales.tableMileage')}</th><th>{t('sales.tablePurchase')}</th><th>{t('sales.tableSelling')}</th><th>{t('sales.tableMargin')}</th><th /></tr></thead>
                    <tbody>{inventoryCars.map(c => { const margin = (c.sellingPriceCents ?? 0) - (c.purchasePriceCents ?? 0) - (c.prepFeeCents ?? 0); return (<tr key={c.id}><td><strong>{c.make ? `${c.make} ` : ''}{c.model}</strong>{c.vin ? <><br /><span className="muted">{t('common.vin')} {c.vin}</span></> : null}</td><td>{c.fuelType ? fuelTypeLabel(c.fuelType) : t('common.none')}</td><td>{c.modelYear || t('common.none')}</td><td>{c.firstRegistrationDate || t('common.none')}</td><td>{c.color || t('common.none')}</td><td>{c.mileageKm != null ? `${c.mileageKm.toLocaleString()} ${t('sales.km')}` : t('common.none')}</td><td className="num">{c.purchasePriceCents != null ? fmtChf(c.purchasePriceCents) : t('common.none')}</td><td className="num"><strong>{c.sellingPriceCents != null ? fmtChf(c.sellingPriceCents) : t('common.none')}</strong></td><td className="num" style={{ color: margin >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{c.sellingPriceCents != null ? fmtChf(margin) : t('common.none')}</td><td><button type="button" className="mini" onClick={() => startEditInventory(c)}>{t('common.editLabel')}</button></td></tr>) })}</tbody>
                  </table></div>) : <p className="muted">{t('sales.noInventory')}</p>}
              </article>
            </>)}
          </section>
        )}

        {/* CLIENTS & CARS */}
        {page === 'clients' && (
          <section>
            {clientsView === 'choose' && (
              <div className="action-chooser" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                <button type="button" onClick={() => setClientsView('database')} style={{ padding: '1.5rem 2.5rem', fontSize: '1rem' }}>{t('clients.database')}</button>
                <button type="button" onClick={() => setClientsView('register')} style={{ padding: '1.5rem 2.5rem', fontSize: '1rem' }}>{t('clients.registerNew')}</button>
              </div>
            )}

            {clientsView === 'database' && (<>
              <button type="button" className="back-btn" onClick={() => setClientsView('choose')}>{t('common.backArrow')}</button>
              <article className="card">
                <h3>{t('clients.dbTitle')}</h3>
                <div className="db-search"><input value={dbSearch} onChange={e => setDbSearch(e.target.value)} placeholder={t('clients.dbSearchPh')} /></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="db-table">
                    <thead><tr><th></th><th>{t('clients.clientCol')}</th><th>{t('clients.phoneCol')}</th><th>{t('clients.emailCol')}</th><th>{t('clients.addressCol')}</th><th>{t('clients.birthdayCol')}</th><th>{t('clients.vehiclesCol')}</th><th>{t('common.actions')}</th></tr></thead>
                    <tbody>{filteredDbClients.map(c => {
                      const clientCars = cars.filter(car => car.clientId === c.id)
                      const clientContracts = contracts.filter(ct => ct.client?.id === c.id)
                      const clientInvoices = invoices.filter(inv => inv.client.id === c.id)
                      const isExpanded = expandedClientId === c.id
                      return (<>
                        <tr key={c.id}>
                          <td><button type="button" className="expand-btn" onClick={() => setExpandedClientId(isExpanded ? null : c.id)}>{isExpanded ? '▼' : '▶'}</button></td>
                          <td><strong>{c.displayName}</strong></td>
                          <td>{c.phone || t('common.none')}</td>
                          <td>{c.email || t('common.none')}</td>
                          <td>{[c.addressLine, [c.zipCode, c.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || t('common.none')}</td>
                          <td>{c.birthday || t('common.none')}</td>
                          <td>{clientCars.length}</td>
                          <td>
                            <button type="button" className="mini" onClick={() => startEditClient(c)}>{t('common.editLabel')}</button>
                            <button type="button" className="mini" style={{ background: '#fee2e2', color: '#dc2626', marginLeft: '.25rem' }} onClick={() => setConfirmDelete({ type: 'client', id: c.id, label: c.displayName })}>{t('common.delete')}</button>
                          </td>
                        </tr>
                        {isExpanded && (<tr key={c.id + '-detail'}><td colSpan={8}>
                          <div className="db-detail">
                            {editingClientId === c.id && (<div className="edit-form" style={{ marginBottom: '.5rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                                <input value={editClient.firstName} onChange={e => setEditClient(p => ({ ...p, firstName: e.target.value }))} placeholder={t('common.firstName')} />
                                <input value={editClient.lastName} onChange={e => setEditClient(p => ({ ...p, lastName: e.target.value }))} placeholder={t('common.lastName')} />
                                <input value={editClient.phone} onChange={e => setEditClient(p => ({ ...p, phone: e.target.value }))} placeholder={t('common.phone')} />
                                <input value={editClient.email} onChange={e => setEditClient(p => ({ ...p, email: e.target.value }))} placeholder={t('common.email')} />
                                <input value={editClient.addressLine} onChange={e => setEditClient(p => ({ ...p, addressLine: e.target.value }))} placeholder={t('common.address')} />
                                <input value={editClient.zipCode} onChange={e => setEditClient(p => ({ ...p, zipCode: e.target.value }))} placeholder={t('common.zip')} />
                                <input value={editClient.city} onChange={e => setEditClient(p => ({ ...p, city: e.target.value }))} placeholder={t('common.city')} />
                                <input type="date" value={editClient.birthday} onChange={e => setEditClient(p => ({ ...p, birthday: e.target.value }))} />
                              </div>
                              <div className="edit-actions"><button type="button" className="btn-save" onClick={updateClientSubmit} disabled={loading}>{t('common.save')}</button><button type="button" className="btn-cancel" onClick={() => setEditingClientId(null)}>{t('common.cancel')}</button></div>
                            </div>)}
                            {clientCars.length > 0 && <><h5>{t('common.expandVehicles', { n: clientCars.length })}</h5><ul className="db-sub-list">{clientCars.map(car => (<li key={car.id}><strong>{car.make ? `${car.make} ` : ''}{car.model}</strong>{car.plate ? ` (${car.plate})` : ''}{car.fuelType ? ` · ${fuelTypeLabel(car.fuelType)}` : ''}{car.vin ? ` · ${t('common.vin')} ${car.vin}` : ''}{car.modelYear ? ` · ${car.modelYear}` : ''}{car.firstRegistrationDate ? ` · ${car.firstRegistrationDate}` : ''} <button type="button" className="mini" style={{ background: '#fee2e2', color: '#dc2626' }} onClick={() => setConfirmDelete({ type: 'car', id: car.id, label: `${car.make ?? ''} ${car.model}` })}>{t('common.delete')}</button></li>))}</ul></>}
                            {clientContracts.length > 0 && <><h5>{t('common.expandContracts', { n: clientContracts.length })}</h5><ul className="db-sub-list">{clientContracts.map(ct => (<li key={ct.id}>{ct.car ? `${ct.car.make ?? ''} ${ct.car.model}` : t('common.none')} — {t('sales.totalFmt', { v: fmtChf(contractInvoiceTotalCents(ct)) })} — {ct.contractDate} <button type="button" className="mini" onClick={() => previewPdf(`/api/v1/sales/contracts/${ct.id}/pdf`)}>{t('finance.preview')}</button></li>))}</ul></>}
                            {clientInvoices.length > 0 && <><h5>{t('common.expandInvoices', { n: clientInvoices.length })}</h5><ul className="db-sub-list">{clientInvoices.map(inv => (<li key={inv.id}>{inv.invoiceNumber} — <StatusBadge status={inv.status} /> — CHF {fmtChf(inv.amountCents)} <button type="button" className="mini" onClick={() => previewPdf(`/api/v1/finance/invoices/${inv.id}/pdf`)}>{t('finance.preview')}</button></li>))}</ul></>}
                            {clientCars.length === 0 && clientContracts.length === 0 && clientInvoices.length === 0 && <p className="muted">{t('clients.linkedNone')}</p>}
                          </div>
                        </td></tr>)}
                      </>)
                    })}{filteredDbClients.length === 0 && <tr><td colSpan={8} className="muted" style={{ padding: '1rem', textAlign: 'center' }}>{t('clients.noResults')}</td></tr>}</tbody>
                  </table>
                </div>
              </article>
            </>)}

            {clientsView === 'register' && (<>
              <button type="button" className="back-btn" onClick={() => setClientsView('choose')}>{t('common.backArrow')}</button>
              <div className="grid two">
                <article className="card"><h3>{t('clients.newClient')}</h3>
                  <div className="form">
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t('clients.firstNameStar')} />
                    <FieldHint ok={firstName.trim().length >= 2} err={firstName.length > 0 && firstName.trim().length < 2 ? t('common.min2') : undefined} show={firstName.length > 0} />
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t('clients.ln')} />
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('common.phone')} />
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t('common.email')} type="email" />
                    <FieldHint ok={!email.trim() || email.includes('@')} err={email.trim() && !email.includes('@') ? t('common.invalidEmail') : undefined} show={!!email.trim()} />
                    <input value={addrLine} onChange={e => setAddrLine(e.target.value)} placeholder={t('common.address')} />
                    <input value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder={t('common.zip')} />
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder={t('common.city')} />
                    <FieldHint ok={!!addrLine.trim() && !!zipCode.trim() && !!city.trim()} err={(addrLine.length + zipCode.length + city.length > 0) && (!addrLine.trim() || !zipCode.trim() || !city.trim()) ? t('common.fullAddress') : undefined} show={addrLine.length + zipCode.length + city.length > 0} />
                    <label className="field-label">{t('common.birthday')}</label>
                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                    <FieldHint ok={!!birthday.trim()} show={!!birthday} />
                    <button type="button" onClick={addClient} disabled={loading}>{t('clients.saveClient')}</button>
                  </div>
                </article>
                <article className="card"><h3>{t('clients.regVehicle')}</h3><p className="hint">{t('clients.stockHint')}</p>
                  <div className="form">
                    <select value={carClientId} onChange={e => setCarClientId(e.target.value)}><option value="">{t('clients.selectClient')}</option>{nonDealerClients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}</select>
                    <MakeModelVersionPicker make={carMake} model={carModel} version={carVersion} onMake={setCarMake} onModel={setCarModel} onVersion={setCarVersion} />
                    <FuelTypePicker value={carFuelType} onChange={setCarFuelType} />
                    <input value={carPlate} onChange={e => setCarPlate(e.target.value)} placeholder={t('common.plate')} />
                    <input value={carStamm} onChange={e => setCarStamm(e.target.value)} placeholder={t('common.stamm')} />
                    <label className="field-label">{t('common.vin')}</label>
                    <VinInput value={carVin} onChange={setCarVin} id="car-vin" />
                    <input value={carYear} onChange={e => setCarYear(e.target.value)} placeholder={t('common.year')} />
                    <label className="field-label">{t('common.firstReg')}</label>
                    <input type="date" value={carFirstReg} onChange={e => setCarFirstReg(e.target.value)} />
                    <ColorPicker colors={CAR_COLORS} value={carColor} custom={carColorCustom} onChange={setCarColor} onCustom={setCarColorCustom} label={t('common.exteriorColor')} />
                    <ColorPicker colors={TRIM_COLORS} value={carTrimColor} custom={carTrimCustom} onChange={setCarTrimColor} onCustom={setCarTrimCustom} label={t('common.trimColor')} />
                    <input value={carMileage} onChange={e => setCarMileage(e.target.value)} placeholder={t('common.mileage')} />
                    <input value={carBranch} onChange={e => setCarBranch(e.target.value)} placeholder={t('common.branch')} />
                    <textarea value={carNotes} onChange={e => setCarNotes(e.target.value)} placeholder={t('common.notes')} rows={2} />
                    <button type="button" onClick={addCustomerCar} disabled={loading}>{t('clients.saveVehicle')}</button>
                  </div>
                </article>
              </div>
            </>)}
          </section>
        )}

        {/* FINANCE */}
        {page === 'finance' && (
          <section className="grid two">
            <article className="card"><h3>{t('finance.createInvoice')}</h3>
              <div className="form">
                <select value={invRefType} onChange={e => { setInvRefType(e.target.value as 'WORKSHOP_JOB' | 'SALES_LEAD' | 'SALES_CONTRACT'); setInvRefId(''); setInvAmount('') }}><option value="WORKSHOP_JOB">{t('finance.workshopJob')}</option><option value="SALES_LEAD">{t('finance.salesLead')}</option><option value="SALES_CONTRACT">{t('finance.salesContract')}</option></select>
                <select value={invRefId} onChange={e => setInvRefId(e.target.value)}><option value="">{invRefOptions.length ? t('finance.select') : t('finance.noEntries')}</option>{invRefOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
                <label className="field-label">{t('finance.amountVat')}</label>
                <input value={invAmount} onChange={e => setInvAmount(e.target.value)} placeholder={t('finance.amountPh')} type="number" min="0" step="0.01" />
                {invAmount && parseFloat(invAmount) > 0 && <VatLine cents={Math.round(parseFloat(invAmount) * 100)} />}
                <button type="button" onClick={createInvoice} disabled={loading}>{t('finance.createInv')}</button>
              </div>
            </article>
            <article className="card wide"><h3>{t('finance.queueTitle')}</h3>
              <ul className="list">{invoices.map(f => { let refLabel = f.referenceId.substring(0, 8) + '...'; if (f.referenceType === 'WORKSHOP_JOB') { const j = jobs.find(x => x.id === f.referenceId); if (j) refLabel = t('finance.refJob', { title: j.title }) } else if (f.referenceType === 'SALES_CONTRACT') { const ct = contracts.find(x => x.id === f.referenceId); if (ct) refLabel = t('finance.refContract', { name: `${ct.client?.displayName ?? t('common.none')}${ct.car ? ` · ${ct.car.make ?? ''} ${ct.car.model}`.trim() : ''}` }) } else { const l = leads.find(x => x.id === f.referenceId); if (l) refLabel = t('finance.refLead', { name: l.client.displayName }) } return (<li key={f.id}><strong>{f.invoiceNumber}</strong> — {refLabel} <StatusBadge status={f.status} /><br /><span className="muted">{f.client.displayName} · {f.currency} {fmtChf(f.amountCents)}</span>{f.amountCents > 0 && <><br /><VatLine cents={f.amountCents} /></>}<select className="inline-select" value={f.status} onChange={e => setInvoiceStatus(f.id, e.target.value)} disabled={f.status === 'PAID'}>{INVOICE_STATUSES.map(s => <option key={s} value={s}>{(t as (k: string) => string)(`status.${s}`)}</option>)}</select><button type="button" className="mini" onClick={() => previewPdf(`/api/v1/finance/invoices/${f.id}/pdf`)}>{t('finance.preview')}</button></li>) })}{invoices.length === 0 && <li className="muted">{t('finance.noInvoices')}</li>}</ul>
            </article>
          </section>
        )}

        {page === 'admin' && (
          <section className="card admin-section" aria-labelledby="admin-heading">
            <h3 id="admin-heading">{t('admin.title')}</h3>
            <p className="muted">{t('admin.coming')}</p>
          </section>
        )}
      </main>

      {confirmDelete && <ConfirmModal title={t('common.deleteConfirmTitle')} message={confirmDelete.type === 'client' ? t('modal.deleteClient', { name: confirmDelete.label }) : t('modal.deleteCar', { name: confirmDelete.label })} onConfirm={() => confirmDelete.type === 'client' ? deleteClientConfirmed(confirmDelete.id) : deleteCarConfirmed(confirmDelete.id)} onCancel={() => setConfirmDelete(null)} />}
    </div>
  )
}

export default App
