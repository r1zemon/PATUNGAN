
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Users, CreditCard, RefreshCw, AlertTriangle } from "lucide-react"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart as RechartsBarChart } from "recharts"
import { useEffect, useState } from "react"
import { getRevenueDataAction } from "@/lib/actions"
import type { RevenueData } from "@/lib/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRevenueDataAction();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Gagal memuat data pendapatan.");
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

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  
  if (loading) {
    return (
       <div className="space-y-6">
        <Skeleton className="h-12 w-2/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-destructive/10 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Gagal Memuat Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || "Data tidak ditemukan."}</p>
          <Button onClick={fetchData} variant="secondary" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const revenueMetrics = [
    {
      title: "Total Pendapatan",
      value: formatCurrency(data.totalRevenue),
      change: "+18.2%", // Dummy
      icon: DollarSign,
      description: "Fee 1% dari transaksi",
    },
    {
      title: "Rata-rata per Transaksi",
      value: formatCurrency(data.averageFeePerTransaction),
      change: "+5.1%", // Dummy
      icon: TrendingUp,
      description: "Fee rata-rata per split",
    },
    {
      title: "Total Transaksi",
      value: data.totalTransactions.toString(),
      change: "+22.5%", // Dummy
      icon: CreditCard,
      description: "Split bill berhasil",
    },
    {
      title: "Pengguna Bertransaksi",
      value: data.totalPayingUsers.toString(),
      change: "+15.8%", // Dummy
      icon: Users,
      description: "User yang bertransaksi",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Pendapatan Platform</h1>
          <p className="text-slate-600">Analisis pendapatan dari fee transaksi split bill</p>
        </div>
      </div>
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
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Tren Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueTrend}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value as number / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), "Pendapatan"]}
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
                <RechartsBarChart data={data.transactionTrend}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(value) => [value, "Transaksi"]} labelFormatter={(label) => `Bulan ${label}`} />
                  <Bar dataKey="transactions" fill="#64748b" radius={[4, 4, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Breakdown Pendapatan per Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.revenueByCategory.map(cat => (
                <div key={cat.categoryName} className="p-4 bg-emerald-50 rounded-lg">
                  <p className="text-sm font-medium text-emerald-800">{cat.categoryName}</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(cat.revenue)}</p>
                  <p className="text-xs text-emerald-600">{((cat.revenue / data.totalRevenue) * 100).toFixed(1)}% dari total</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
