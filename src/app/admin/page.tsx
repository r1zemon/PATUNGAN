
'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserGrowthChart } from "@/components/user-growth-chart"
import { UserStatusChart } from "@/components/user-status-chart"
import { UserActivityChart } from "@/components/user-activity-chart"
import { Users, UserCheck, UserPlus, Users2, Download, RefreshCw, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import { getAdminDashboardDataAction } from "@/lib/actions"
import type { AdminDashboardData } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"

export default function Dashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminDashboardDataAction();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Gagal memuat data dasbor.");
      }
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan yang tidak terduga.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportData = () => {
    console.log("Exporting user data...")
  }
  
  const userMetrics = data ? [
    {
      title: "Total Pengguna",
      value: data.totalUsers.toString(),
      change: `+${data.newUserWeekCount} minggu ini`,
      icon: Users,
      description: "Semua akun terdaftar",
    },
    {
      title: "Pengguna Aktif",
      value: data.activeUsers.toString(),
      change: `Aktif 30 hari terakhir`,
      icon: UserCheck,
      description: "Online dalam 30 hari",
    },
    {
      title: "Pengguna Baru",
      value: data.newUserWeekCount.toString(),
      change: `+${data.newUserMonthCount} bulan ini`,
      icon: UserPlus,
      description: "Terdaftar dalam 7 hari",
    },
    {
      title: "Total Grup Dibuat",
      value: data.totalBills.toString(),
      change: `+${data.billsLastWeekCount} minggu lalu`,
      icon: Users2,
      description: "Sesi patungan dibuat",
    },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="md:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Gagal Memuat Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
          <Button onClick={fetchData} variant="secondary" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      </div>
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
                <span className="font-medium text-emerald-600">{metric.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-slate-800">Pertumbuhan Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <UserGrowthChart data={data?.userGrowthData || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Status Pengguna</CardTitle>
          </CardHeader>
          <CardContent>
            <UserStatusChart data={data?.userStatusData || []} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Aktivitas Pengguna Harian</CardTitle>
        </CardHeader>
        <CardContent>
          <UserActivityChart data={data?.dailyActivityData || []}/>
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
