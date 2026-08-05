import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CAR_COLORS, CAR_MAKE_LIST, TRIM_COLORS, FUEL_TYPES, getModelList, getVersionList } from './vehicleData'
import type { ColorOption } from './vehicleData'

export type CarProfile = {
  id: string
  clientId: string
  branchId?: string
  make?: string
  model: string
  plate?: string
  vin?: string
  stammnummer?: string
  typeApproval?: string
  vehicleRole: string
  modelYear?: number
  color?: string
  trimColor?: string
  mileageKm?: number
  notes?: string
  purchasePriceCents?: number
  catalogPriceCents?: number
  usedValueCents?: number
  sellingPriceCents?: number
  prepFeeCents?: number
  arrivalDate?: string
  fuelType?: string
  firstRegistrationDate?: string
}

type CarImageInfo = { filename: string; url: string }

type FormState = {
  make: string
  model: string
  version: string
  plate: string
  vin: string
  stamm: string
  typeApproval: string
  year: string
  mileage: string
  fuel: string
  firstReg: string
  arrival: string
  color: string
  colorCustom: string
  trim: string
  trimCustom: string
  purchase: string
  catalog: string
  used: string
  selling: string
  prep: string
  notes: string
  branch: string
}

function centsToChf(c?: number) {
  return c != null ? (c / 100).toFixed(2) : ''
}

function carToForm(c: CarProfile): FormState {
  const mk = c.make ?? ''
  const inList = mk && CAR_MAKE_LIST.includes(mk)
  const models = inList ? getModelList(mk) : []
  const modelInList = inList && models.includes(c.model)
  return {
    make: inList ? mk : (mk ? '__other' : ''),
    model: inList ? (modelInList ? c.model : '__other') : (mk ? `${mk} ${c.model}`.trim() : c.model),
    version: inList && !modelInList && c.model ? c.model : '',
    plate: c.plate ?? '',
    vin: c.vin ?? '',
    stamm: c.stammnummer ?? '',
    typeApproval: c.typeApproval ?? '',
    year: c.modelYear != null ? String(c.modelYear) : '',
    mileage: c.mileageKm != null ? String(c.mileageKm) : '',
    fuel: c.fuelType ?? '',
    firstReg: c.firstRegistrationDate ?? '',
    arrival: c.arrivalDate ?? '',
    color: c.color ?? '',
    colorCustom: '',
    trim: c.trimColor ?? '',
    trimCustom: '',
    purchase: centsToChf(c.purchasePriceCents),
    catalog: centsToChf(c.catalogPriceCents),
    used: centsToChf(c.usedValueCents),
    selling: centsToChf(c.sellingPriceCents),
    prep: centsToChf(c.prepFeeCents),
    notes: c.notes ?? '',
    branch: c.branchId ?? '',
  }
}

function resolveColor(selected: string, custom: string) {
  if (selected === '__other') return custom.trim() || undefined
  return selected.trim() || undefined
}

type Props = {
  car: CarProfile
  step: 'data' | 'images'
  onStepChange: (step: 'data' | 'images') => void
  onClose: () => void
  onSave: (payload: Record<string, unknown>) => Promise<void>
  apiBase: string
  loading: boolean
}

export default function CarEditMask({ car, step, onStepChange, onClose, onSave, apiBase, loading }: Props) {
  const { t } = useTranslation()
  const [form, setForm] = useState<FormState>(() => carToForm(car))
  const [images, setImages] = useState<CarImageInfo[]>([])
  const [imgMsg, setImgMsg] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const loadImages = useCallback(async () => {
    try {
      const r = await fetch(`${apiBase}/api/v1/cars/${car.id}/images`, { credentials: 'include' })
      if (!r.ok) throw new Error(String(r.status))
      setImages(await r.json() as CarImageInfo[])
    } catch {
      setImages([])
    }
  }, [apiBase, car.id])

  useEffect(() => { if (step === 'images') void loadImages() }, [step, loadImages])

  function buildModelName() {
    if (form.make === '__other') return form.model.trim()
    if (form.model === '__other') return form.version.trim() || form.model.trim()
    const base = form.model.trim()
    return form.version.trim() ? `${base} ${form.version.trim()}`.trim() : base
  }

  async function submitData() {
    let makeVal: string | undefined
    let modelVal: string
    if (form.make === '__other') {
      const parts = form.model.trim().split(/\s+/).filter(Boolean)
      if (parts.length === 0) return
      makeVal = parts[0]
      modelVal = parts.slice(1).join(' ') || parts[0]
    } else {
      makeVal = form.make.trim() || undefined
      modelVal = buildModelName()
    }
    if (!modelVal) return
    const y = form.year.trim() ? parseInt(form.year) : undefined
    const mi = form.mileage.trim() ? parseInt(form.mileage) : undefined
    await onSave({
      make: makeVal,
      model: modelVal,
      plate: form.plate.trim() || undefined,
      vin: form.vin.trim() || undefined,
      stammnummer: form.stamm.trim() || undefined,
      typeApproval: form.typeApproval.trim() || undefined,
      branchId: form.branch.trim() || undefined,
      modelYear: Number.isFinite(y) ? y : undefined,
      mileageKm: Number.isFinite(mi) ? mi : undefined,
      fuelType: form.fuel || undefined,
      firstRegistrationDate: form.firstReg || undefined,
      arrivalDate: form.arrival || undefined,
      color: resolveColor(form.color, form.colorCustom),
      trimColor: resolveColor(form.trim, form.trimCustom),
      purchasePriceCents: form.purchase.trim() ? Math.round(parseFloat(form.purchase) * 100) : undefined,
      catalogPriceCents: form.catalog.trim() ? Math.round(parseFloat(form.catalog) * 100) : undefined,
      usedValueCents: form.used.trim() ? Math.round(parseFloat(form.used) * 100) : undefined,
      sellingPriceCents: form.selling.trim() ? Math.round(parseFloat(form.selling) * 100) : undefined,
      prepFeeCents: form.prep.trim() ? Math.round(parseFloat(form.prep) * 100) : undefined,
      notes: form.notes.trim() || undefined,
    })
    onStepChange('images')
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    setImgMsg('')
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch(`${apiBase}/api/v1/cars/${car.id}/images`, { method: 'POST', credentials: 'include', body: fd })
      if (!r.ok) {
        setImgMsg(t('carEdit.uploadFailed'))
        break
      }
    }
    await loadImages()
  }

  async function deleteImage(filename: string) {
    await fetch(`${apiBase}/api/v1/cars/${car.id}/images/${encodeURIComponent(filename)}`, { method: 'DELETE', credentials: 'include' })
    await loadImages()
  }

  const models = form.make && form.make !== '__other' ? getModelList(form.make) : []
  const versions = form.make && form.make !== '__other' && form.model && form.model !== '__other'
    ? getVersionList(form.make, form.model) : []

  return (
    <section className="car-edit-mask">
      <div className="car-edit-top">
        <button type="button" className="back-btn" onClick={onClose}>{t('common.backArrow')}</button>
        <h2>{t('carEdit.title', { name: `${car.make ? `${car.make} ` : ''}${car.model}` })}</h2>
      </div>

      <div className="car-edit-steps">
        <button type="button" className={step === 'data' ? 'active' : ''} onClick={() => onStepChange('data')}>{t('carEdit.stepData')}</button>
        <button type="button" className={step === 'images' ? 'active' : ''} onClick={() => onStepChange('images')}>{t('carEdit.stepImages')}</button>
      </div>

      {step === 'data' && (
        <article className="card">
          <div className="form car-edit-form">
            <h3>{t('carEdit.vehicleData')}</h3>
            <select value={form.make} onChange={e => { set('make', e.target.value); set('model', ''); set('version', '') }}>
              <option value="">{t('picker.make')}</option>
              {CAR_MAKE_LIST.map(m => <option key={m} value={m}>{m}</option>)}
              <option value="__other">{t('common.other')}</option>
            </select>
            {form.make === '__other' ? (
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder={t('common.typeMakeModel')} />
            ) : models.length > 0 ? (
              <select value={form.model} onChange={e => { set('model', e.target.value); set('version', '') }}>
                <option value="">{t('picker.model')}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="__other">{t('common.otherModel')}</option>
              </select>
            ) : form.make ? (
              <input value={form.model} onChange={e => set('model', e.target.value)} placeholder={`${t('picker.model')} *`} />
            ) : null}
            {versions.length > 0 && (
              <select value={form.version} onChange={e => set('version', e.target.value)}>
                <option value="">{t('picker.version')}</option>
                {versions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}

            <label className="field-label">{t('carEdit.chassis')}</label>
            <input value={form.vin} onChange={e => set('vin', e.target.value)} placeholder={t('vin.placeholder')} maxLength={17} />
            <input value={form.stamm} onChange={e => set('stamm', e.target.value)} placeholder={t('common.stamm')} />
            <input value={form.typeApproval} onChange={e => set('typeApproval', e.target.value)} placeholder={t('carEdit.typeApproval')} />
            <input value={form.plate} onChange={e => set('plate', e.target.value)} placeholder={t('common.plate')} />
            <input value={form.year} onChange={e => set('year', e.target.value)} placeholder={t('common.year')} type="number" />
            <input value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder={t('common.mileage')} type="number" />
            <select value={form.fuel} onChange={e => set('fuel', e.target.value)}>
              <option value="">{t('common.fuelType')}</option>
              {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <label className="field-label">{t('common.firstReg')}</label>
            <input type="date" value={form.firstReg} onChange={e => set('firstReg', e.target.value)} />
            <label className="field-label">{t('sales.arrival')}</label>
            <input type="date" value={form.arrival} onChange={e => set('arrival', e.target.value)} />
            <ColorField colors={CAR_COLORS} label={t('common.exteriorColor')} value={form.color} custom={form.colorCustom} onChange={(v, c) => { set('color', v); set('colorCustom', c) }} t={t} />
            <ColorField colors={TRIM_COLORS} label={t('common.trimColor')} value={form.trim} custom={form.trimCustom} onChange={(v, c) => { set('trim', v); set('trimCustom', c) }} t={t} />
            <input value={form.branch} onChange={e => set('branch', e.target.value)} placeholder={t('common.branch')} />

            <h3>{t('carEdit.pricing')}</h3>
            <input value={form.purchase} onChange={e => set('purchase', e.target.value)} placeholder={t('carEdit.purchase')} type="number" min="0" step="0.01" />
            <input value={form.used} onChange={e => set('used', e.target.value)} placeholder={t('carEdit.tradeIn')} type="number" min="0" step="0.01" />
            <input value={form.catalog} onChange={e => set('catalog', e.target.value)} placeholder={t('sales.catalogChf')} type="number" min="0" step="0.01" />
            <input value={form.selling} onChange={e => set('selling', e.target.value)} placeholder={t('carEdit.salePrice')} type="number" min="0" step="0.01" />
            <input value={form.prep} onChange={e => set('prep', e.target.value)} placeholder={t('sales.prepChf')} type="number" min="0" step="0.01" />
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('common.notes')} rows={3} />

            <div className="car-edit-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>{t('common.cancel')}</button>
              <button type="button" onClick={() => void submitData()} disabled={loading || !form.model.trim()}>{t('carEdit.saveAndImages')}</button>
            </div>
          </div>
        </article>
      )}

      {step === 'images' && (
        <article className="card">
          <h3>{t('carEdit.imagesTitle')}</h3>
          <p className="hint">{t('carEdit.imagesHint', { make: car.make ?? '—', model: car.model })}</p>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={e => void uploadFiles(e.target.files)} />
          {imgMsg && <p className="field-msg field-msg-error">{imgMsg}</p>}
          <div className="car-image-grid">
            {images.map(img => (
              <figure key={img.filename} className="car-image-thumb">
                <img src={`${apiBase}${img.url}`} alt={img.filename} />
                <figcaption>
                  <button type="button" className="mini btn-danger" onClick={() => void deleteImage(img.filename)}>{t('common.delete')}</button>
                </figcaption>
              </figure>
            ))}
            {images.length === 0 && <p className="muted">{t('carEdit.noImages')}</p>}
          </div>
          <div className="car-edit-actions">
            <button type="button" onClick={() => onStepChange('data')}>{t('carEdit.backToData')}</button>
            <button type="button" className="btn-cancel" onClick={onClose}>{t('carEdit.done')}</button>
          </div>
        </article>
      )}
    </section>
  )
}

function ColorField({ colors, label, value, custom, onChange, t }: {
  colors: ColorOption[]; label: string; value: string; custom: string
  onChange: (v: string, custom: string) => void
  t: (k: string) => string
}) {
  return (
    <>
      <label className="field-label">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value, e.target.value === '__other' ? custom : '')}>
        <option value="">—</option>
        {colors.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        <option value="__other">{t('common.other')}</option>
      </select>
      {value === '__other' && <input value={custom} onChange={e => onChange('__other', e.target.value)} placeholder={t('common.customColor')} />}
    </>
  )
}
