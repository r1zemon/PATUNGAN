"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, CreditCard } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts"

const revenueData = [
  { month: "Jan", revenue: 25000, transactions: 125, users: 85 },
  { month: "Feb", revenue: 32000, transactions: 160, users: 110 },
  { month: "Mar", revenue: 41000, transactions: 205, users: 135 },
  { month: "Apr", revenue: 38000, transactions: 190, users: 128 },
  { month: "May", revenue: 45000, transactions: 225, users: 145 },
  { month: "Jun", revenue: 52000, transactions: 260, users: 165 },
]

const revenueMetrics = [
  {
    title: "Total Pendapatan",
    value: "Rp 233K",
    change: "+18.2%",
    icon: DollarSign,
    description: "Fee 1% dari transaksi",
  },
  {
    title: "Rata-rata per Transaksi",
    value: "Rp 200",
    change: "+5.1%",
    icon: TrendingUp,
    description: "Fee rata-rata per split",
  },
  {
    title: "Total Transaksi",
    value: "165",
    change: "+22.5%",
    icon: CreditCard,
    description: "Split bill berhasil",
  },
  {
    title: "Pengguna Aktif",
    value: "165",
    change: "+15.8%",
    icon: Users,
    description: "User yang bertransaksi",
  },
]

export default function RevenuePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Pendapatan Platform</h1>
          <p className="text-slate-600">Analisis pendapatan dari fee transaksi split bill</p>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {revenueMetrics.map((metric) => (
          <Card key={metric.title} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{metric.value}</div>
              <p className="text-xs text-slate-500">{metric.description}</p>
              <div className="mt-2 flex items-center text-xs">
                <span className={`font-medium ${metric.change.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>
                  {metric.change}
                </span>
                <span className="text-slate-500 ml-1">dari bulan lalu</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Tren Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [`Rp ${(value / 1000).toFixed(0)}K`, "Pendapatan"]}
                    labelFormatter={(label) => `Bulan ${label}`}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#64748b" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Jumlah Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Transaksi"]} labelFormatter={(label) => `Bulan ${label}`} />
                  <Bar dataKey="transactions" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Breakdown Pendapatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm font-medium text-emerald-800">Fee Makanan</p>
                <p className="text-2xl font-bold text-emerald-600">Rp 128K</p>
                <p className="text-xs text-emerald-600">55% dari total</p>
              </div>
              <div className="p-4 bg-cyan-50 rounded-lg">
                <p className="text-sm font-medium text-cyan-700">Fee Transportasi</p>
                <p className="text-2xl font-bold text-cyan-600">Rp 62K</p>
                <p className="text-xs text-cyan-600">27% dari total</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium text-gray-800">Fee Lainnya</p>
                <p className="text-2xl font-bold text-gray-600">Rp 43K</p>
                <p className="text-xs text-gray-600">18% dari total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
