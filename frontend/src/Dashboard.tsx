import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, type PieLabelRenderProps } from 'recharts'

const PALETTE = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ef4444', '#a855f7', '#06b6d4', '#ec4899']

type Props = {
  clients: { id: string }[]
  cars: { vehicleRole: string; make?: string }[]
  jobs: { status: string }[]
  leads: { status: string }[]
  invoices: { amountCents: number; status: string }[]
}

export default function Dashboard({ clients, cars, jobs, leads, invoices }: Props) {
  const vehicleClass = useMemo(() => {
    const m: Record<string, number> = {}
    cars.forEach(c => { const r = c.vehicleRole.replace('_', ' '); m[r] = (m[r] || 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [cars])

  const jobsByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    jobs.forEach(j => { m[j.status] = (m[j.status] || 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name: name.replace('_', ' '), value }))
  }, [jobs])

  const salesPipeline = useMemo(() => {
    const m: Record<string, number> = {}
    leads.forEach(l => { m[l.status] = (m[l.status] || 0) + 1 })
    return Object.entries(m).map(([name, value]) => ({ name, value }))
  }, [leads])

  const revenueByStatus = useMemo(() => {
    const m: Record<string, number> = {}
    invoices.forEach(i => { m[i.status] = (m[i.status] || 0) + i.amountCents / 100 })
    return Object.entries(m).map(([name, value]) => ({ name, value: Math.round(value) }))
  }, [invoices])

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
        <div className="stat-card"><span className="stat-value">{clients.length}</span><span className="stat-label">Clients</span></div>
        <div className="stat-card"><span className="stat-value">{cars.length}</span><span className="stat-label">Vehicles</span></div>
        <div className="stat-card"><span className="stat-value">{jobs.filter(j => j.status !== 'DONE').length}</span><span className="stat-label">Active Jobs</span></div>
        <div className="stat-card"><span className="stat-value">CHF {totalRevenue.toLocaleString('de-CH', { minimumFractionDigits: 0 })}</span><span className="stat-label">Total Invoiced</span></div>
      </div>

      <div className="chart-row">
        {vehicleClass.length > 0 && <div className="chart-card"><h4>Vehicle Classification</h4><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={vehicleClass} dataKey="value" cx="50%" cy="45%" outerRadius={75} label={renderLabel} labelLine={false}>{vehicleClass.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ paddingTop: 12 }} /></PieChart></ResponsiveContainer></div>}
        {jobsByStatus.length > 0 && <div className="chart-card"><h4>Workshop Jobs</h4><ResponsiveContainer width="100%" height={250}><BarChart data={jobsByStatus} margin={{ bottom: 10 }}><XAxis dataKey="name" fontSize={11} tick={{ dy: 5 }} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" fill="#f97316" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>}
        {salesPipeline.length > 0 && <div className="chart-card"><h4>Sales Pipeline</h4><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={salesPipeline} dataKey="value" cx="50%" cy="45%" outerRadius={75} label={renderLabel} labelLine={false}>{salesPipeline.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip /><Legend wrapperStyle={{ paddingTop: 12 }} /></PieChart></ResponsiveContainer></div>}
      </div>

      <div className="chart-row">
        {revenueByStatus.length > 0 && <div className="chart-card"><h4>Revenue by Status (CHF)</h4><ResponsiveContainer width="100%" height={250}><BarChart data={revenueByStatus} margin={{ bottom: 10 }}><XAxis dataKey="name" fontSize={11} tick={{ dy: 5 }} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="value" fill="#22c55e" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>}
        {topMakes.length > 0 && <div className="chart-card"><h4>Top Makes</h4><ResponsiveContainer width="100%" height={250}><BarChart data={topMakes} margin={{ bottom: 10 }}><XAxis dataKey="name" fontSize={10} tick={{ dy: 5 }} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" fill="#3b82f6" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>}
        <div className="chart-card summary-card">
          <h4>Financial Summary</h4>
          <div className="summary-grid">
            <div className="summary-item"><span className="summary-val">CHF {paidRevenue.toLocaleString('de-CH')}</span><span className="summary-lbl">Paid</span></div>
            <div className="summary-item"><span className="summary-val">CHF {(totalRevenue - paidRevenue).toLocaleString('de-CH')}</span><span className="summary-lbl">Outstanding</span></div>
            <div className="summary-item"><span className="summary-val">{invoices.length}</span><span className="summary-lbl">Invoices</span></div>
            <div className="summary-item"><span className="summary-val">{leads.length}</span><span className="summary-lbl">Leads</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
