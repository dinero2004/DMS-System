import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  loadStoredEvents,
  saveStoredEvents,
  newEventId,
  type CalendarTag,
  type StoredCalendarEvent,
} from './calendarStorage'
import {
  buildSystemCalendarEvents,
  storedToCalendarEvent,
  calendarEventToStored,
  type CalendarEvent,
} from './calendarEvents'

type ClientProfile = { id: string; displayName: string }
type CarProfile = { id: string; make?: string; model: string; plate?: string; arrivalDate?: string }
type WorkshopJobView = { id: string; title: string; description?: string; status: string; createdAt: string; client: ClientProfile; car: CarProfile }
type SalesLeadView = { id: string; status: string; interestModel?: string; notes?: string; createdAt: string; client: ClientProfile; car: CarProfile | null }
type ContractView = { id: string; contractDate: string; notes?: string; client: ClientProfile | null; car: CarProfile | null }
type InvoiceView = { id: string; invoiceNumber: string; status: string; issuedAt?: string; createdAt: string; client: ClientProfile }

const TAGS: CalendarTag[] = ['sales', 'service', 'finance', 'general']
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const HOUR_PX = 44

function startOfWeek(d: Date) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function minutesToTop(min: number) {
  return ((min - HOURS[0] * 60) / 60) * HOUR_PX
}

function eventHeight(start: string, end: string) {
  const dur = Math.max(parseMinutes(end) - parseMinutes(start), 30)
  return (dur / 60) * HOUR_PX
}

type Props = {
  fullPage?: boolean
  jobs: WorkshopJobView[]
  leads: SalesLeadView[]
  contracts: ContractView[]
  invoices: InvoiceView[]
  inventoryCars: CarProfile[]
}

export default function SalesCalendar({ fullPage = false, jobs, leads, contracts, invoices, inventoryCars }: Props) {
  const { t, i18n } = useTranslation()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [stored, setStored] = useState<StoredCalendarEvent[]>(() => loadStoredEvents())
  const [tagFilter, setTagFilter] = useState<Set<CalendarTag>>(() => new Set(TAGS))
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; event: CalendarEvent } | null>(null)
  const [viewEvent, setViewEvent] = useState<CalendarEvent | null>(null)

  const locale = i18n.language?.slice(0, 2) || 'en'
  const todayStr = toDateStr(new Date())

  const systemEvents = useMemo(
    () => buildSystemCalendarEvents({ jobs, leads, contracts, invoices, inventoryCars }),
    [jobs, leads, contracts, invoices, inventoryCars],
  )

  const allEvents = useMemo(() => [...systemEvents, ...stored.map(storedToCalendarEvent)], [stored, systemEvents])
  const filteredEvents = useMemo(() => allEvents.filter(e => tagFilter.has(e.tag)), [allEvents, tagFilter])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const weekLabel = useMemo(() => {
    const end = addDays(weekStart, 6)
    const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    return `${weekStart.toLocaleDateString(locale, fmt)} – ${end.toLocaleDateString(locale, { ...fmt, year: 'numeric' })}`
  }, [weekStart, locale])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of filteredEvents) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    for (const list of map.values()) list.sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))
    return map
  }, [filteredEvents])

  useEffect(() => { saveStoredEvents(stored) }, [stored])

  const toggleTag = (tag: CalendarTag) => {
    setTagFilter(prev => {
      const next = new Set(prev)
      if (next.has(tag)) { if (next.size > 1) next.delete(tag) } else next.add(tag)
      return next
    })
  }

  const openCreate = useCallback((date: string, hour?: number) => {
    const start = hour != null ? `${String(hour).padStart(2, '0')}:00` : '09:00'
    const endH = hour != null ? hour + 1 : 10
    setModal({
      mode: 'create',
      event: {
        id: newEventId(),
        title: '',
        description: '',
        tag: 'sales',
        date,
        startTime: start,
        endTime: `${String(endH).padStart(2, '0')}:00`,
        allDay: false,
        source: 'user',
        editable: true,
      },
    })
    setViewEvent(null)
  }, [])

  const openEdit = (event: CalendarEvent) => {
    if (!event.editable) { setViewEvent(event); return }
    setModal({ mode: 'edit', event: { ...event } })
    setViewEvent(null)
  }

  const saveModal = () => {
    if (!modal?.event.title.trim()) return
    const storedEv = calendarEventToStored(modal.event)
    setStored(prev => modal.mode === 'create' ? [...prev, storedEv] : prev.map(e => (e.id === storedEv.id ? storedEv : e)))
    setModal(null)
  }

  const deleteModal = () => {
    if (!modal) return
    setStored(prev => prev.filter(e => e.id !== modal.event.id))
    setModal(null)
  }

  return (
    <div className={fullPage ? 'calendar-page' : 'sales-calendar'}>
      <div className="cal-header">
        <h3>{t('calendar.title')}</h3>
        <div className="cal-nav">
          <button type="button" className="mini" onClick={() => setWeekStart(d => addDays(d, -7))}>‹</button>
          <button type="button" className="mini cal-today-btn" onClick={() => setWeekStart(startOfWeek(new Date()))}>{t('calendar.today')}</button>
          <button type="button" className="mini" onClick={() => setWeekStart(d => addDays(d, 7))}>›</button>
        </div>
      </div>
      <p className="cal-week-label">{weekLabel}</p>

      <div className="cal-tag-filter">
        {TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            className={`cal-tag-pill cal-tag-${tag}${tagFilter.has(tag) ? ' active' : ''}`}
            onClick={() => toggleTag(tag)}
          >
            {t(`calendar.tag.${tag}`)}
          </button>
        ))}
      </div>

      <div className="cal-grid-wrap">
        <WeekHeader weekDays={weekDays} locale={locale} todayStr={todayStr} />
        <div className="cal-grid">
          <div className="cal-time-gutter">
            <div className="cal-allday-label">{t('calendar.allDay')}</div>
            {HOURS.map(h => (
              <div key={h} className="cal-hour-label">{`${String(h).padStart(2, '0')}:00`}</div>
            ))}
          </div>
          {weekDays.map(day => (
            <DayColumn
              key={toDateStr(day)}
              day={day}
              todayStr={todayStr}
              events={eventsByDate.get(toDateStr(day)) ?? []}
              t={t}
              onCreate={openCreate}
              onEdit={openEdit}
            />
          ))}
        </div>
      </div>

      <button type="button" className="cal-new-btn" onClick={() => openCreate(todayStr)}>{t('calendar.newEvent')}</button>

      {viewEvent && (
        <ModalOverlay onClose={() => setViewEvent(null)}>
          <div className="modal-box cal-modal" onClick={e => e.stopPropagation()}>
            <h3>{viewEvent.title}</h3>
            <p><span className={`cal-event-tag cal-tag-${viewEvent.tag}`}>{t(`calendar.tag.${viewEvent.tag}`)}</span></p>
            <p className="muted">{viewEvent.date}{viewEvent.allDay ? '' : ` · ${viewEvent.startTime} – ${viewEvent.endTime}`}</p>
            {viewEvent.description && <p>{viewEvent.description}</p>}
            <p className="muted" style={{ fontSize: '.8rem' }}>{t('calendar.systemEventHint')}</p>
            <ModalActions onClose={() => setViewEvent(null)} label={t('common.cancel')} />
          </div>
        </ModalOverlay>
      )}

      {modal && (
        <ModalOverlay onClose={() => setModal(null)}>
          <EditForm
            modal={modal}
            t={t}
            onChange={ev => setModal(m => (m ? { ...m, event: ev } : null))}
            onSave={saveModal}
            onDelete={modal.mode === 'edit' ? deleteModal : undefined}
            onCancel={() => setModal(null)}
          />
        </ModalOverlay>
      )}
    </div>
  )
}

function WeekHeader({ weekDays, locale, todayStr }: { weekDays: Date[]; locale: string; todayStr: string }) {
  return (
    <div className="cal-week-header">
      <div className="cal-corner" />
      {weekDays.map(day => {
        const dateStr = toDateStr(day)
        return (
          <div key={dateStr} className={`cal-day-head${dateStr === todayStr ? ' cal-day-today' : ''}`}>
            <span className="cal-dow">{day.toLocaleDateString(locale, { weekday: 'short' })}</span>
            <span className="cal-dom">{day.getDate()}</span>
          </div>
        )
      })}
    </div>
  )
}

function DayColumn({ day, todayStr, events, t, onCreate, onEdit }: {
  day: Date
  todayStr: string
  events: CalendarEvent[]
  t: (k: string) => string
  onCreate: (date: string, hour?: number) => void
  onEdit: (e: CalendarEvent) => void
}) {
  const dateStr = toDateStr(day)
  const allDay = events.filter(e => e.allDay)
  const timed = events.filter(e => !e.allDay)
  const isToday = dateStr === todayStr

  return (
    <div className={`cal-day-col${isToday ? ' cal-day-today' : ''}`}>
      <div className="cal-allday-slot">
        {allDay.map(e => (
          <button key={e.id} type="button" className={`cal-event-chip cal-tag-${e.tag}`} onClick={() => onEdit(e)}>
            {e.title}
          </button>
        ))}
        <button type="button" className="cal-slot-add" onClick={() => onCreate(dateStr)} title={t('calendar.addEvent')} />
      </div>
      <DayBody dateStr={dateStr} timed={timed} onCreate={onCreate} onEdit={onEdit} />
    </div>
  )
}

function DayBody({ dateStr, timed, onCreate, onEdit }: {
  dateStr: string
  timed: CalendarEvent[]
  onCreate: (date: string, hour?: number) => void
  onEdit: (e: CalendarEvent) => void
}) {
  return (
    <div
      className="cal-day-body"
      style={{ height: HOURS.length * HOUR_PX }}
      onDoubleClick={e => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const hourIdx = Math.floor((e.clientY - rect.top) / HOUR_PX)
        onCreate(dateStr, HOURS[Math.min(Math.max(hourIdx, 0), HOURS.length - 1)])
      }}
    >
      {HOURS.map(h => (
        <div key={h} className="cal-hour-line" style={{ top: (h - HOURS[0]) * HOUR_PX }} />
      ))}
      {timed.map(ev => (
        <button
          key={ev.id}
          type="button"
          className={`cal-event-block cal-tag-${ev.tag}${ev.editable ? '' : ' cal-event-system'}`}
          style={{
            top: minutesToTop(parseMinutes(ev.startTime)),
            height: Math.max(eventHeight(ev.startTime, ev.endTime), 22),
          }}
          onClick={() => onEdit(ev)}
          title={ev.description || ev.title}
        >
          <span className="cal-event-time">{ev.startTime}</span>
          <span className="cal-event-title">{ev.title}</span>
        </button>
      ))}
    </div>
  )
}

function EditForm({ modal, t, onChange, onSave, onDelete, onCancel }: {
  modal: { mode: 'create' | 'edit'; event: CalendarEvent }
  t: (k: string) => string
  onChange: (e: CalendarEvent) => void
  onSave: () => void
  onDelete?: () => void
  onCancel: () => void
}) {
  const ev = modal.event
  return (
    <div className="modal-box cal-modal" onClick={e => e.stopPropagation()}>
      <h3>{modal.mode === 'create' ? t('calendar.newEvent') : t('calendar.editEvent')}</h3>
      <div className="form cal-form">
        <input value={ev.title} onChange={e => onChange({ ...ev, title: e.target.value })} placeholder={t('calendar.titlePh')} />
        <textarea value={ev.description} onChange={e => onChange({ ...ev, description: e.target.value })} placeholder={t('common.description')} rows={3} />
        <label className="field-label">{t('calendar.tagLabel')}</label>
        <select value={ev.tag} onChange={e => onChange({ ...ev, tag: e.target.value as CalendarTag })}>
          {TAGS.map(tag => (
            <option key={tag} value={tag}>{t(`calendar.tag.${tag}`)}</option>
          ))}
        </select>
        <label className="field-label">{t('calendar.date')}</label>
        <input type="date" value={ev.date} onChange={e => onChange({ ...ev, date: e.target.value })} />
        <label className="cal-check">
          <input type="checkbox" checked={ev.allDay} onChange={e => onChange({ ...ev, allDay: e.target.checked })} />
          {t('calendar.allDay')}
        </label>
        {!ev.allDay && (
          <>
            <label className="field-label">{t('calendar.start')}</label>
            <input type="time" value={ev.startTime} onChange={e => onChange({ ...ev, startTime: e.target.value })} />
            <label className="field-label">{t('calendar.end')}</label>
            <input type="time" value={ev.endTime} onChange={e => onChange({ ...ev, endTime: e.target.value })} />
          </>
        )}
      </div>
      <div className="modal-actions">
        {onDelete && <button type="button" className="btn-danger" onClick={onDelete}>{t('common.delete')}</button>}
        <button type="button" className="btn-cancel" onClick={onCancel}>{t('common.cancel')}</button>
        <button type="button" onClick={onSave} disabled={!ev.title.trim()}>{t('common.save')}</button>
      </div>
    </div>
  )
}

function ModalActions({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <div className="modal-actions">
      <button type="button" className="btn-cancel" onClick={onClose}>{label}</button>
    </div>
  )
}

function ModalOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      {children}
    </div>
  )
}
