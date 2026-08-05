export type CalendarTag = 'sales' | 'service' | 'finance' | 'general'

export type StoredCalendarEvent = {
  id: string
  title: string
  description: string
  tag: CalendarTag
  date: string
  startTime: string
  endTime: string
  allDay: boolean
}

const STORAGE_KEY = 'dms-calendar-events'

export function loadStoredEvents(): StoredCalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredCalendarEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredEvents(events: StoredCalendarEvent[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export function newEventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
