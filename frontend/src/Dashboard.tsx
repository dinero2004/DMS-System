import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, type PieLabelRenderProps } from 'recharts'
import { useTheme } from './theme'

const PALETTE = ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#f472b6', '#38bdf8', '#fb923c']

type Props = {
  clients: { id: string }[]
  cars: { vehicleRole: string; make?: string }[]
  jobs: { status: string }[]
  leads: { status: string }[]
  invoices: { amountCents: number; status: string }[]
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export default function Dashboard({ clients, cars, jobs, leads, invoices }: Props) {
  const { theme } = useTheme()
  const chartUi = useMemo(() => {
    const g = cssVar
    const border = `1px solid ${g('--chart-tooltip-border')}`
    return {
      tooltip: {
        contentStyle: {
          background: g('--chart-tooltip-bg'),
          border,
          borderRadius: '8px',
          color: g('--chart-tooltip-text'),
          fontSize: '.82rem',
          fontFamily: "'Century Gothic', sans-serif",
        },
        itemStyle: { color: g('--chart-tooltip-text') },
        labelStyle: { color: g('--chart-tooltip-muted') },
      },
      legendWrapper: { paddingTop: 14, fontSize: '.78rem', color: g('--chart-legend-color') },
      axisTickX: { fill: g('--chart-axis-tick'), dy: 5 },
      axisTickY: { fill: g('--chart-axis-tick') },
      axisLine: { stroke: g('--chart-axis-line') },
      cursor: { fill: g('--chart-cursor-fill') },
      pieStroke: g('--chart-pie-stroke'),
    }
  }, [theme])

  const { t, i18n } = useTranslation()
  const tk = t as (k: string, o?: Record<string, string | number>) => string

  const vehicleClass = useMemo(() => {
    const m: Record<string, number> = {}
    cars.forEach(c => { const r = c.vehicleRole; m[r] = (m[r] || 0) + 1 })
    return Object.entries(m).map(([key, value]) => ({ name: tk(`role.${key}`), value }))
  }, [cars, i18n.language, tk])

  const jobsByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    jobs.forEach(j => { m[j.status] = (m[j.status] || 0) + 1 })
    return Object.entries(m).map(([key, value]) => ({ name: tk(`status.${key}`), value }))
  }, [jobs, i18n.language, tk])

  const salesPipeline = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach(l => { m[l.status] = (m[l.status] || 0) + 1 })
    return Object.entries(m).map(([key, value]) => ({ name: tk(`status.${key}`), value }))
  }, [leads, i18n.language, tk])

  const revenueByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    invoices.forEach(i => { m[i.status] = (m[i.status] || 0) + i.amountCents / 100 })
    return Object.entries(m).map(([key, value]) => ({ name: tk(`status.${key}`), value: Math.round(value) }))
  }, [invoices, i18n.language, tk])

  const topMakes = useMemo(() => {
    const m: Record<string, number> = {}
    cars.forEach(c => { if (c.make) m[c.make] = (m[c.make] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [cars])

  const totalRevenue = invoices.reduce((s, i) => s + i.amountCents, 0) / 100
  const paidRevenue = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.amountCents, 0) / 100

  const renderLabel = (p: PieLabelRenderProps) => {
    const pct = Number(p.percent ?? 0)
    return pct > 0.08 ? `${(pct * 100).toFixed(0)}%` : ''
  }

  return (
    <section className="dashboard">
      <div className="stat-row">
        <div className="stat-card"><span className="stat-value">{clients.length}</span><span className="stat-label">{t('dashboard.clients')}</span></div>
        <div className="stat-card"><span className="stat-value">{cars.length}</span><span className="stat-label">{t('dashboard.vehicles')}</span></div>
        <div className="stat-card"><span className="stat-value">{jobs.filter(j => j.status !== 'DONE').length}</span><span className="stat-label">{t('dashboard.activeJobs')}</span></div>
        <div className="stat-card"><span className="stat-value">CHF {totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">{t('dashboard.totalInvoiced')}</span></div>
      </div>

      <div className="chart-row">
        {vehicleClass.length > 0 && (
          <div className="chart-card">
            <h4>{t('dashboard.vehicleClass')}</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={vehicleClass} dataKey="value" cx="50%" cy="45%" outerRadius={80} label={renderLabel} labelLine={false} stroke={chartUi.pieStroke} strokeWidth={1}>
                  {vehicleClass.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip {...chartUi.tooltip} />
                <Legend wrapperStyle={chartUi.legendWrapper} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {jobsByStatus.length > 0 && (
          <div className="chart-card">
            <h4>{t('dashboard.workshopJobs')}</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={jobsByStatus} margin={{ bottom: 12 }}>
                <XAxis dataKey="name" fontSize={11} tick={chartUi.axisTickX} axisLine={chartUi.axisLine} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tick={chartUi.axisTickY} axisLine={false} tickLine={false} />
                <Tooltip {...chartUi.tooltip} cursor={chartUi.cursor} />
                <Bar dataKey="value" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {salesPipeline.length > 0 && (
          <div className="chart-card">
            <h4>{t('dashboard.salesPipeline')}</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={salesPipeline} dataKey="value" cx="50%" cy="45%" outerRadius={80} label={renderLabel} labelLine={false} stroke={chartUi.pieStroke} strokeWidth={1}>
                  {salesPipeline.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip {...chartUi.tooltip} />
                <Legend wrapperStyle={chartUi.legendWrapper} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="chart-row">
        {revenueByStatus.length > 0 && (
          <div className="chart-card">
            <h4>{t('dashboard.revenueByStatus')}</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueByStatus} margin={{ bottom: 12 }}>
                <XAxis dataKey="name" fontSize={11} tick={chartUi.axisTickX} axisLine={chartUi.axisLine} tickLine={false} />
                <YAxis fontSize={11} tick={chartUi.axisTickY} axisLine={false} tickLine={false} />
                <Tooltip {...chartUi.tooltip} cursor={chartUi.cursor} />
                <Bar dataKey="value" fill="var(--success)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {topMakes.length > 0 && (
          <div className="chart-card">
            <h4>{t('dashboard.topMakes')}</h4>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topMakes} margin={{ bottom: 12 }}>
                <XAxis dataKey="name" fontSize={10} tick={chartUi.axisTickX} axisLine={chartUi.axisLine} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={11} tick={chartUi.axisTickY} axisLine={false} tickLine={false} />
                <Tooltip {...chartUi.tooltip} cursor={chartUi.cursor} />
                <Bar dataKey="value" fill="var(--accent-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="chart-card summary-card">
          <h4>{t('dashboard.financialSummary')}</h4>
          <div className="summary-grid">
            <div className="summary-item"><span className="summary-val">CHF {paidRevenue.toLocaleString('de-CH')}</span><span className="summary-lbl">{t('dashboard.paid')}</span></div>
            <div className="summary-item"><span className="summary-val">CHF {(totalRevenue - paidRevenue).toLocaleString('de-CH')}</span><span className="summary-lbl">{t('dashboard.outstanding')}</span></div>
            <div className="summary-item"><span className="summary-val">{invoices.length}</span><span className="summary-lbl">{t('dashboard.invoices')}</span></div>
            <div className="summary-item"><span className="summary-val">{leads.length}</span><span className="summary-lbl">{t('dashboard.leads')}</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
