"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Calendar } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

const monthlySpendingData = [
  { month: "Jan", makanan: 45000, transportasi: 12000, hiburan: 8000, lainnya: 5000 },
  { month: "Feb", makanan: 52000, transportasi: 15000, hiburan: 9500, lainnya: 6200 },
  { month: "Mar", makanan: 68000, transportasi: 18000, hiburan: 12000, lainnya: 8500 },
  { month: "Apr", makanan: 61000, transportasi: 16500, hiburan: 10500, lainnya: 7800 },
  { month: "May", makanan: 72000, transportasi: 20000, hiburan: 13500, lainnya: 9200 },
  { month: "Jun", makanan: 85000, transportasi: 24000, hiburan: 16000, lainnya: 11500 },
]

const categoryData = [
  { name: "Makanan & Minuman", value: 383000, color: "#dc2626", percentage: 56.2 },
  { name: "Transportasi", value: 105500, color: "#64748b", percentage: 15.5 },
  { name: "Hiburan", value: 69500, color: "#92400e", percentage: 10.2 },
  { name: "Lainnya", value: 48000, color: "#10b981", percentage: 7.0 },
  { name: "Belanja", value: 75000, color: "#7c3aed", percentage: 11.1 },
]

const topCategories = [
  { category: "Makanan & Minuman", amount: 85000, sessions: 342, growth: "+12.5%" },
  { category: "Transportasi", amount: 24000, sessions: 168, growth: "+8.2%" },
  { category: "Hiburan", amount: 16000, sessions: 89, growth: "+15.8%" },
  { category: "Belanja", amount: 14500, sessions: 65, growth: "+22.1%" },
  { category: "Lainnya", amount: 11500, sessions: 42, growth: "+5.3%" },
]

export default function SpendingAnalysisPage() {
  const [selectedMonth, setSelectedMonth] = useState("Jun")

  const currentMonthData = monthlySpendingData.find((data) => data.month === selectedMonth)
  const totalSpending = currentMonthData
    ? currentMonthData.makanan + currentMonthData.transportasi + currentMonthData.hiburan + currentMonthData.lainnya
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Analisis Pengeluaran User</h1>
          <p className="text-slate-600">Kategori split bill yang paling populer dan tren pengeluaran</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Jan">Januari 2025</SelectItem>
            <SelectItem value="Feb">Februari 2025</SelectItem>
            <SelectItem value="Mar">Maret 2025</SelectItem>
            <SelectItem value="Apr">April 2025</SelectItem>
            <SelectItem value="May">Mei 2025</SelectItem>
            <SelectItem value="Jun">Juni 2025</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Pengeluaran</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">Rp {(totalSpending / 1000).toFixed(0)}K</div>
            <p className="text-xs text-slate-500">Bulan {selectedMonth} 2025</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Kategori Terpopuler</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">Makanan</div>
            <p className="text-xs text-slate-500">56.2% dari total split</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Sessions</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">342</div>
            <p className="text-xs text-slate-500">Split bill sessions</p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Rata-rata per Split</CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">Rp 225</div>
            <p className="text-xs text-slate-500">Per transaksi split</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Tren Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySpendingData}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [`Rp ${(value / 1000).toFixed(0)}K`, ""]}
                    labelFormatter={(label) => `Bulan ${label}`}
                  />
                  <Bar dataKey="makanan" stackId="a" fill="#dc2626" />
                  <Bar dataKey="transportasi" stackId="a" fill="#64748b" />
                  <Bar dataKey="hiburan" stackId="a" fill="#92400e" />
                  <Bar dataKey="lainnya" stackId="a" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Distribusi Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`Rp ${(value / 1000).toFixed(0)}K`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryData.map((category) => (
                <div key={category.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }} />
                    <span className="text-slate-600">{category.name}</span>
                  </div>
                  <span className="font-medium text-slate-800">{category.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Kategori Teratas Bulan {selectedMonth}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCategories.map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-cyan-700">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{category.category}</p>
                    <p className="text-sm text-slate-500">{category.sessions} split sessions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">Rp {(category.amount / 1000).toFixed(0)}K</p>
                  <p className={`text-sm ${category.growth.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>
                    {category.growth}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
