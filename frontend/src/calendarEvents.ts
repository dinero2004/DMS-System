import type { StoredCalendarEvent, CalendarTag } from './calendarStorage'

export type CalendarEventSource = 'user' | 'job' | 'contract' | 'lead' | 'inventory' | 'invoice'

export type CalendarEvent = {
  id: string
  title: string
  description: string
  tag: CalendarTag
  date: string
  startTime: string
  endTime: string
  allDay: boolean
  source: CalendarEventSource
  editable: boolean
}

type ClientProfile = { id: string; displayName: string }
type CarProfile = { id: string; make?: string; model: string; plate?: string; arrivalDate?: string }
type WorkshopJobView = { id: string; title: string; description?: string; status: string; createdAt: string; client: ClientProfile; car: CarProfile }
type SalesLeadView = { id: string; status: string; interestModel?: string; notes?: string; createdAt: string; client: ClientProfile; car: CarProfile | null }
type ContractView = { id: string; contractDate: string; notes?: string; client: ClientProfile | null; car: CarProfile | null }
type InvoiceView = { id: string; invoiceNumber: string; status: string; issuedAt?: string; createdAt: string; client: ClientProfile }

function dateFromIso(iso: string) {
  return iso.slice(0, 10)
}

function timeFromIso(iso: string, fallback: string) {
  if (iso.length < 16) return fallback
  return iso.slice(11, 16)
}

function carLabel(car: CarProfile | null | undefined) {
  if (!car) return ''
  return `${car.make ? `${car.make} ` : ''}${car.model}${car.plate ? ` (${car.plate})` : ''}`.trim()
}

export function buildSystemCalendarEvents(input: {
  jobs: WorkshopJobView[]
  leads: SalesLeadView[]
  contracts: ContractView[]
  invoices: InvoiceView[]
  inventoryCars: CarProfile[]
}): CalendarEvent[] {
  const out: CalendarEvent[] = []

  for (const j of input.jobs) {
    out.push({
      id: `job-${j.id}`,
      title: j.title,
      description: [j.description, j.client.displayName, carLabel(j.car)].filter(Boolean).join(' · '),
      tag: 'service',
      date: dateFromIso(j.createdAt),
      startTime: timeFromIso(j.createdAt, '09:00'),
      endTime: timeFromIso(j.createdAt, '10:00'),
      allDay: false,
      source: 'job',
      editable: false,
    })
  }

  for (const l of input.leads) {
    out.push({
      id: `lead-${l.id}`,
      title: `Lead: ${l.client.displayName}`,
      description: [l.interestModel, l.notes, carLabel(l.car)].filter(Boolean).join(' · '),
      tag: 'sales',
      date: dateFromIso(l.createdAt),
      startTime: '10:00',
      endTime: '11:00',
      allDay: false,
      source: 'lead',
      editable: false,
    })
  }

  for (const c of input.contracts) {
    out.push({
      id: `contract-${c.id}`,
      title: `Contract: ${c.client?.displayName ?? '—'}`,
      description: [carLabel(c.car), c.notes].filter(Boolean).join(' · '),
      tag: 'sales',
      date: c.contractDate,
      startTime: '11:00',
      endTime: '12:00',
      allDay: true,
      source: 'contract',
      editable: false,
    })
  }

  for (const inv of input.invoices) {
    const d = inv.issuedAt ?? inv.createdAt
    out.push({
      id: `invoice-${inv.id}`,
      title: `Invoice ${inv.invoiceNumber}`,
      description: `${inv.client.displayName} · ${inv.status}`,
      tag: 'finance',
      date: dateFromIso(d),
      startTime: timeFromIso(d, '14:00'),
      endTime: timeFromIso(d, '15:00'),
      allDay: false,
      source: 'invoice',
      editable: false,
    })
  }

  for (const car of input.inventoryCars) {
    if (!car.arrivalDate) continue
    out.push({
      id: `arrival-${car.id}`,
      title: `Stock arrival: ${carLabel(car)}`,
      description: car.arrivalDate,
      tag: 'sales',
      date: car.arrivalDate,
      startTime: '08:00',
      endTime: '09:00',
      allDay: true,
      source: 'inventory',
      editable: false,
    })
  }

  return out
}

export function storedToCalendarEvent(e: StoredCalendarEvent): CalendarEvent {
  return { ...e, source: 'user', editable: true }
}

export function calendarEventToStored(e: CalendarEvent): StoredCalendarEvent {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    tag: e.tag,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    allDay: e.allDay,
  }
}
