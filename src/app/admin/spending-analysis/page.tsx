
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Calendar, RefreshCw, AlertTriangle } from "lucide-react"
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart as RechartsPieChart, Pie, Cell } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"
import type { SpendingAnalysisData } from "@/lib/types"
import { getSpendingAnalysisAction } from "@/lib/actions"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"

export default function SpendingAnalysisPage() {
  const [data, setData] = useState<SpendingAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSpendingAnalysisAction();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Gagal memuat data analisis.");
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
        <div className="flex items-center justify-between">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-96" />
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

  const COLORS = ['#dc2626', '#64748b', '#92400e', '#10b981', '#7c3aed'];

  const categoryDistributionData = data.spendingByCategory.map((item, index) => ({
    name: item.categoryName,
    value: item.totalAmount,
    color: COLORS[index % COLORS.length],
    percentage: ((item.totalAmount / data.totalSpending) * 100).toFixed(1)
  }));
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Analisis Pengeluaran User</h1>
          <p className="text-slate-600">Kategori split bill yang paling populer dan tren pengeluaran</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Pengeluaran</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.totalSpending)}</div>
            <p className="text-xs text-slate-500">Dari semua sesi tagihan</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Kategori Terpopuler</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.mostPopularCategory.categoryName}</div>
            <p className="text-xs text-slate-500">{data.mostPopularCategory.billCount} sesi tagihan</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Sesi</CardTitle>
            <Users className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.totalBills}</div>
            <p className="text-xs text-slate-500">Sesi patungan dibuat</p>
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Rata-rata per Sesi</CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.averagePerBill)}</div>
            <p className="text-xs text-slate-500">Per transaksi split</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-slate-800">Tren Pengeluaran per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data.spendingTrend}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value as number / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value as number), ""]}
                    labelFormatter={(label) => `Bulan ${label}`}
                  />
                  {Object.keys(data.spendingTrend[0] || {}).filter(key => key !== 'month').map((key, index) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} />
                  ))}
                </RechartsBarChart>
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
                <RechartsPieChart>
                  <Pie
                    data={categoryDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(value as number), ""]} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {categoryDistributionData.map((category) => (
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
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Kategori Teratas (Total)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.topCategories.map((category, index) => (
              <div key={category.categoryName} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-cyan-700">#{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{category.categoryName}</p>
                    <p className="text-sm text-slate-500">{category.billCount} sesi tagihan</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">{formatCurrency(category.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
