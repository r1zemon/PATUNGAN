'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserGrowthChart } from "@/components/user-growth-chart"
import { UserStatusChart } from "@/components/user-status-chart"
import { UserActivityChart } from "@/components/user-activity-chart"
import { Users, UserCheck, UserPlus, Users2, Download } from "lucide-react"

const userMetrics = [
  {
    title: "Total Pengguna",
    value: "247",
    change: "+12.5%",
    icon: Users,
    description: "Semua akun terdaftar",
  },
  {
    title: "Pengguna Aktif",
    value: "165",
    change: "+8.2%",
    icon: UserCheck,
    description: "Aktif 30 hari terakhir",
  },
  {
    title: "Pengguna Baru",
    value: "23",
    change: "+15.8%",
    icon: UserPlus,
    description: "Minggu ini",
  },
  {
    title: "Total Grup Dibuat",
    value: "89",
    change: "+22.1%",
    icon: Users2,
    description: "Sesi patungan dibuat",
  },
]

export default function Dashboard() {
  const handleExportData = () => {
    console.log("Exporting user data...")
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* Export Data button removed from here */}
      </div>
      {/* User Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {userMetrics.map((metric) => (
          <Card key={metric.title} className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{metric.value}</div>
              <p className="text-xs text-slate-500">{metric.description}</p>
              <div className="mt-2 flex items-center text-xs">
                <span className={`font-medium ${metric.change.startsWith("+") ? "text-emerald-600" : "text-red-500"}`}>{metric.change}</span>
                <span className="text-slate-500 ml-1">dari bulan lalu</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-slate-800">Pertumbuhan Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <UserGrowthChart />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Status Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <UserStatusChart />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Aktivitas Pengguna Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <UserActivityChart />
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={handleExportData} className="flex items-center gap-2 bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200 mt-4">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>
    </div>
  )
}
