
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { DashboardData, MonthlyExpenseByCategory, ExpenseChartDataPoint, RecentBillDisplayItem, ScheduledBillDisplayItem } from '@/lib/types';
// import { getDashboardDataAction } from '@/lib/actions'; // Comment out for now
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart, CalendarClock, ChevronRight, ChevronsUpDown, Info, ListChecks, Loader2, PieChart, TrendingUp, Users, Wallet, XCircle, Tag, Clock, Utensils, Car, Gamepad2, BedDouble, Shapes } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, addDays, subDays } from 'date-fns';
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

const getDummyDashboardData = (): DashboardData => {
  const now = new Date();
  return {
    monthlyExpenses: [
      { categoryName: "Makanan", totalAmount: 750000, icon: Utensils, color: PREDEFINED_CATEGORY_COLORS["Makanan"] },
      { categoryName: "Transportasi", totalAmount: 250000, icon: Car, color: PREDEFINED_CATEGORY_COLORS["Transportasi"] },
      { categoryName: "Hiburan", totalAmount: 300000, icon: Gamepad2, color: PREDEFINED_CATEGORY_COLORS["Hiburan"] },
      { categoryName: "Penginapan", totalAmount: 0, icon: BedDouble, color: PREDEFINED_CATEGORY_COLORS["Penginapan"] }, // Example of zero expense
      { categoryName: "Belanja Online", totalAmount: 450000, icon: Shapes, color: PREDEFINED_CATEGORY_COLORS["Lainnya"] }, // Example "Lainnya" category
    ],
    expenseChartData: [ // Dummy data for Bar Chart (monthly expenses by category)
      { name: "Makanan", total: 750000 },
      { name: "Transportasi", total: 250000 },
      { name: "Hiburan", total: 300000 },
      { name: "Belanja Online", total: 450000 },
    ],
    recentBills: [
      { id: "rb1", name: "Makan Malam Tim", createdAt: subDays(now, 2).toISOString(), grandTotal: 680000, categoryName: "Makanan", participantCount: 5 },
      { id: "rb2", name: "Bensin Mingguan", createdAt: subDays(now, 5).toISOString(), grandTotal: 150000, categoryName: "Transportasi", participantCount: 2 },
      { id: "rb3", name: "Nonton Bioskop", createdAt: subDays(now, 7).toISOString(), grandTotal: 220000, categoryName: "Hiburan", participantCount: 4 },
    ],
    scheduledBills: [
      { id: "sb1", name: "Trip ke Puncak", scheduled_at: addDays(now, 7).toISOString(), categoryName: "Hiburan", participantCount: 3 },
      { id: "sb2", name: "Sewa Villa Bulanan", scheduled_at: addDays(now, 15).toISOString(), categoryName: "Penginapan", participantCount: 6 },
    ],
  };
};


export function DashboardClient({ authUser }: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching data with dummy data
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      setDashboardData(getDummyDashboardData());
      setIsLoading(false);
    }, 500); // Simulate network delay
  }, [authUser]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    // Ensure "Lainnya" category gets a default icon if not explicitly set by dummy data.
    const defaultOtherIcon = Shapes;

    dashboardData?.monthlyExpenses.forEach(expense => {
      config[expense.categoryName] = {
        label: expense.categoryName,
        color: expense.color || PREDEFINED_CATEGORY_COLORS[expense.categoryName] || PREDEFINED_CATEGORY_COLORS["Lainnya"],
        icon: expense.icon || (expense.categoryName === "Lainnya" ? defaultOtherIcon : Shapes),
      };
    });
     // Ensure all predefined categories and "Lainnya" have a config entry for the legend, even if no expense
    const allCategoriesForLegend = ["Makanan", "Transportasi", "Hiburan", "Penginapan", "Lainnya"];
    dashboardData?.monthlyExpenses.map(e => e.categoryName).forEach(cn => {
        if (!allCategoriesForLegend.includes(cn)) allCategoriesForLegend.push(cn);
    });

    allCategoriesForLegend.forEach(catName => {
        if (!config[catName]) {
            config[catName] = {
                label: catName,
                color: PREDEFINED_CATEGORY_COLORS[catName] || PREDEFINED_CATEGORY_COLORS["Lainnya"],
                icon: CATEGORY_ICONS[catName] || (catName === "Lainnya" ? defaultOtherIcon : Shapes),
            };
        }
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

      {/* Expense Bar Chart */}
      {expenseChartData.length > 0 ? (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/>Diagram Pengeluaran</CardTitle>
              <CardDescription>Visualisasi pengeluaran Anda per kategori untuk bulan ini. (Sortir per periode akan datang)</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="mx-auto aspect-video max-h-[350px]">
                <RechartsBarChart data={expenseChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                   <XAxis type="number" hide />
                   <YAxis 
                    dataKey="name" 
                    type="category" 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => chartConfig[value]?.label || value}
                    width={100}
                    />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="total" layout="vertical" radius={5}>
                     {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color || PREDEFINED_CATEGORY_COLORS["Lainnya"]} />
                      ))}
                  </Bar>
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsBarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </section>
      ) : (
         <Card>
            <CardHeader><CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/>Diagram Pengeluaran</CardTitle></CardHeader>
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
