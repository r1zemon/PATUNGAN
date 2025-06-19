
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { DashboardData, MonthlyExpenseByCategory, ExpenseChartDataPoint, RecentBillDisplayItem, ScheduledBillDisplayItem } from '@/lib/types';
import { getDashboardDataAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart, CalendarClock, ChevronRight, ChevronsUpDown, Info, ListChecks, Loader2, PieChart, TrendingUp, Users, Wallet, XCircle, Tag, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, Sector } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface DashboardClientProps {
  authUser: SupabaseUser;
}

const PREDEFINED_CATEGORY_COLORS: { [key: string]: string } = {
  "Makanan": "hsl(var(--chart-1))",
  "Transportasi": "hsl(var(--chart-2))",
  "Hiburan": "hsl(var(--chart-3))",
  "Penginapan": "hsl(var(--chart-4))",
  "Lainnya": "hsl(var(--chart-5))",
};


export function DashboardClient({ authUser }: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      const result = await getDashboardDataAction();
      if (result.success && result.data) {
        setDashboardData(result.data);
      } else {
        setError(result.error || "Gagal memuat data dashboard.");
        toast({ variant: "destructive", title: "Error Memuat Dashboard", description: result.error });
      }
      setIsLoading(false);
    }
    fetchData();
  }, [authUser, toast]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    dashboardData?.monthlyExpenses.forEach(expense => {
      config[expense.categoryName] = {
        label: expense.categoryName,
        color: PREDEFINED_CATEGORY_COLORS[expense.categoryName] || PREDEFINED_CATEGORY_COLORS["Lainnya"],
        icon: expense.icon,
      };
    });
    return config;
  }, [dashboardData?.monthlyExpenses]);


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Dashboard</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-8 text-center">
        <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Tidak ada data untuk ditampilkan.</p>
        <Button onClick={() => router.push('/app')} className="mt-4">Buat Tagihan Pertama Anda</Button>
      </div>
    );
  }

  const { monthlyExpenses, expenseChartData, recentBills, scheduledBills } = dashboardData;
  const totalMonthlySpending = monthlyExpenses.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard Keuangan Anda</h1>

      {/* Monthly Expenses Summary Cards */}
      <section>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-xl"><Wallet className="mr-2 h-5 w-5 text-primary"/> Pengeluaran Bulan Ini</CardTitle>
                <CardDescription>Total pengeluaran Anda untuk bulan {format(new Date(), "MMMM yyyy", { locale: IndonesianLocale })}.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthlySpending)}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                    {monthlyExpenses.filter(e => e.totalAmount > 0).map((expense) => {
                       const Icon = expense.icon || Shapes;
                       return (
                        <div key={expense.categoryName} className="flex flex-col items-center p-3 bg-muted/50 rounded-lg shadow-sm">
                            <Icon className="h-6 w-6 mb-1.5" style={{ color: expense.color }} />
                            <span className="text-xs font-medium text-muted-foreground">{expense.categoryName}</span>
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(expense.totalAmount)}</span>
                        </div>
                       );
                    })}
                     {monthlyExpenses.filter(e => e.totalAmount > 0).length === 0 && (
                        <p className="col-span-full text-center text-sm text-muted-foreground py-4">Belum ada pengeluaran bulan ini.</p>
                    )}
                </div>
            </CardContent>
        </Card>
      </section>

      {/* Expense Chart */}
      {expenseChartData.length > 0 ? (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5 text-primary"/>Diagram Pengeluaran Bulan Ini</CardTitle>
              <CardDescription>Visualisasi pengeluaran Anda per kategori untuk bulan ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px] sm:max-h-[350px]">
                <RechartsPieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="categoryName" />} />
                  <Pie data={expenseChartData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}>
                    {expenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PREDEFINED_CATEGORY_COLORS[entry.name] || PREDEFINED_CATEGORY_COLORS["Lainnya"]} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name"/>} />
                </RechartsPieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
      ) : (
         <Card>
            <CardHeader><CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5 text-primary"/>Diagram Pengeluaran</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground text-center py-4">Belum ada data pengeluaran yang cukup untuk ditampilkan pada diagram.</p></CardContent>
        </Card>
      )}

      {/* Recent Activity Section */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Scheduled Bills */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center"><CalendarClock className="mr-2 h-5 w-5 text-primary"/>Tagihan Terjadwal</CardTitle>
              <CardDescription>Tagihan yang akan datang dan perlu diisi detailnya.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              {scheduledBills.length > 0 ? (
                scheduledBills.map(bill => (
                  <div key={bill.id} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-foreground truncate pr-2">{bill.name || "Tagihan Terjadwal"}</h4>
                        {bill.categoryName && <Badge variant="outline" className="text-xs flex-shrink-0"><Tag className="mr-1 h-3 w-3"/>{bill.categoryName}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 flex items-center">
                        <Clock className="mr-1.5 h-3 w-3"/>
                        {format(parseISO(bill.scheduled_at), "dd MMM yyyy, HH:mm", { locale: IndonesianLocale })} WIB
                    </p>
                    <div className="flex items-center justify-between text-xs mt-2">
                        <div className="flex items-center text-muted-foreground">
                            <Users className="mr-1.5 h-3 w-3"/> {bill.participantCount > 0 ? `${bill.participantCount} orang` : "Belum ada partisipan"}
                        </div>
                         <Button variant="outline" size="xs" onClick={() => toast({title: "Info", description: "Fitur edit/isi tagihan terjadwal belum diimplementasikan."})}>
                            Isi Detail <ChevronRight className="h-3 w-3 ml-1"/>
                         </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Tidak ada tagihan yang dijadwalkan.</p>
              )}
            </CardContent>
            {scheduledBills.length > 0 && (
                <CardFooter>
                    <Button variant="ghost" className="w-full text-primary" onClick={() => router.push('/app/history?tab=scheduled')}>
                        Lihat Semua Terjadwal <ChevronRight className="ml-1 h-4 w-4"/>
                    </Button>
                </CardFooter>
            )}
          </Card>

          {/* Recent Bills History */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary"/>Riwayat Tagihan Terbaru</CardTitle>
              <CardDescription>3 tagihan terakhir yang telah diselesaikan.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              {recentBills.length > 0 ? (
                recentBills.map(bill => (
                  <div key={bill.id} className="p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-card">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold text-foreground truncate pr-2">{bill.name || "Tagihan"}</h4>
                        <span className="font-semibold text-primary text-sm whitespace-nowrap">{formatCurrency(bill.grandTotal)}</span>
                    </div>
                     <p className="text-xs text-muted-foreground mb-1 flex items-center">
                         <Clock className="mr-1.5 h-3 w-3"/>
                        {format(parseISO(bill.createdAt), "dd MMM yyyy, HH:mm", { locale: IndonesianLocale })}
                    </p>
                    {bill.categoryName && <Badge variant="outline" className="text-xs mt-0.5 mb-1.5"><Tag className="mr-1 h-3 w-3"/>{bill.categoryName}</Badge>}
                    <div className="flex items-center justify-between text-xs mt-2">
                        <div className="flex items-center text-muted-foreground">
                            <Users className="mr-1.5 h-3 w-3"/> {bill.participantCount} orang
                        </div>
                         <Button variant="outline" size="xs" onClick={() => toast({title: "Info", description: "Fitur lihat detail riwayat belum diimplementasikan."})}>
                            Lihat Detail <ChevronRight className="h-3 w-3 ml-1"/>
                         </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat tagihan.</p>
              )}
            </CardContent>
             {recentBills.length > 0 && (
                <CardFooter>
                     <Button variant="ghost" className="w-full text-primary" onClick={() => router.push('/app/history')}>
                        Lihat Semua Riwayat <ChevronRight className="ml-1 h-4 w-4"/>
                    </Button>
                </CardFooter>
            )}
          </Card>
        </div>
      </section>
      
      <div className="mt-8 text-center">
        <Button size="lg" onClick={() => router.push('/app')}>
            <TrendingUp className="mr-2 h-5 w-5"/> Buat Sesi Tagihan Baru
        </Button>
      </div>
    </div>
  );
}
