import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ClientProfile = {
  id: string
  displayName: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
  addressLine?: string
  zipCode?: string
  city?: string
  birthday?: string
}

type CarProfile = {
  id: string
  clientId: string
  make?: string
  model: string
  plate?: string
  vin?: string
  arrivalDate?: string
  firstRegistrationDate?: string
  notes?: string
}

export type HomeSearchSelect =
  | { type: 'client'; clientId: string }
  | { type: 'car'; carId: string; clientId: string }

type Props = {
  clients: ClientProfile[]
  cars: CarProfile[]
  dealerStockClientId: string
  onSelect: (sel: HomeSearchSelect) => void
}

function norm(s: string) {
  return s.toLowerCase().trim()
}

function clientHaystack(c: ClientProfile) {
  return [
    c.displayName,
    c.firstName,
    c.lastName,
    c.email,
    c.phone,
    c.addressLine,
    c.zipCode,
    c.city,
    c.birthday,
  ].filter(Boolean).join(' ').toLowerCase()
}

function carHaystack(car: CarProfile, clientName?: string) {
  return [
    car.make,
    car.model,
    car.plate,
    car.vin,
    car.arrivalDate,
    car.firstRegistrationDate,
    car.notes,
    clientName,
  ].filter(Boolean).join(' ').toLowerCase()
}

export default function HomeSearch({ clients, cars, dealerStockClientId, onSelect }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = norm(query)
    if (q.length < 1) return { clients: [] as ClientProfile[], cars: [] as CarProfile[] }

    const matchedClients = clients
      .filter(c => c.id !== dealerStockClientId && clientHaystack(c).includes(q))
      .slice(0, 8)

    const matchedCars = cars
      .filter(car => carHaystack(car, clients.find(c => c.id === car.clientId)?.displayName).includes(q))
      .slice(0, 8)

    return { clients: matchedClients, cars: matchedCars }
  }, [query, clients, cars, dealerStockClientId])

  const hasResults = results.clients.length > 0 || results.cars.length > 0
  const showPanel = query.trim().length > 0

  return (
    <article className="card home-search">
      <h3>{t('home.searchTitle')}</h3>
      <p className="hint">{t('home.searchHint')}</p>
      <div className="home-search-input-wrap">
        <input
          type="search"
          className="home-search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('home.searchPlaceholder')}
          autoComplete="off"
        />
        {query && (
          <button type="button" className="mini home-search-clear" onClick={() => setQuery('')} aria-label={t('home.clearSearch')}>
            ×
          </button>
        )}
      </div>

      {showPanel && (
        <div className="home-search-results">
          {!hasResults && <p className="muted">{t('home.noResults')}</p>}

          {results.clients.length > 0 && (
            <section>
              <h4>{t('home.clientsSection', { n: results.clients.length })}</h4>
              <ul className="home-search-list">
                {results.clients.map(c => (
                  <li key={c.id}>
                    <button type="button" onClick={() => onSelect({ type: 'client', clientId: c.id })}>
                      <strong>{c.displayName}</strong>
                      <span className="muted">
                        {[c.phone, c.email, [c.addressLine, c.zipCode, c.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || t('common.none')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.cars.length > 0 && (
            <section>
              <h4>{t('home.vehiclesSection', { n: results.cars.length })}</h4>
              <ul className="home-search-list">
                {results.cars.map(car => {
                  const owner = clients.find(c => c.id === car.clientId)
                  return (
                    <li key={car.id}>
                      <button
                        type="button"
                        onClick={() => onSelect({ type: 'car', carId: car.id, clientId: car.clientId })}
                      >
                        <strong>{car.make ? `${car.make} ` : ''}{car.model}</strong>
                        <span className="muted">
                          {[car.plate, car.vin, owner?.displayName, car.arrivalDate ? `${t('home.arrival')}: ${car.arrivalDate}` : '', car.firstRegistrationDate ? `${t('common.firstReg')}: ${car.firstRegistrationDate}` : ''].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </article>
  )
}
