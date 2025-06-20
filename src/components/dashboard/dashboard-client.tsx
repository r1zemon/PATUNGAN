
"use client";

import { useEffect, useState, useMemo } from 'react';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { DashboardData, MonthlyExpenseByCategory, ExpenseChartDataPoint, RecentBillDisplayItem, ScheduledBillDisplayItem, DetailedBillSummaryData, Person, BillDetailsForHistory } from '@/lib/types';
import { getDashboardDataAction, getBillDetailsAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart, CalendarClock, ChevronRight, Info, ListChecks, Loader2, PieChart, TrendingUp, Users, Wallet, XCircle, Tag, Clock, Shapes, Utensils, Car, Gamepad2, BedDouble, ShoppingBag, Power } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart as RechartsPieChart, Pie, Cell, Sector } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SummaryDisplay } from "@/components/summary-display";


interface DashboardClientProps {
  authUser: SupabaseUser;
}

// Client-side map for icon string keys to actual components
const ICON_COMPONENTS_MAP: { [key: string]: React.ElementType } = {
  "Utensils": Utensils,
  "Car": Car,
  "Gamepad2": Gamepad2,
  "BedDouble": BedDouble,
  "ShoppingBag": ShoppingBag,
  "Shapes": Shapes,
};


export function DashboardClient({ authUser }: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // State for bill details dialog
  const [selectedBillForDetail, setSelectedBillForDetail] = useState<BillDetailsForHistory | null>(null);
  const [isLoadingBillDetail, setIsLoadingBillDetail] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      if (!authUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      const result = await getDashboardDataAction();
      if (result.success && result.data) {
        setDashboardData(result.data);
      } else {
        setError(result.error || "Gagal memuat data dashboard.");
        toast({ variant: "destructive", title: "Gagal Memuat", description: result.error || "Tidak dapat mengambil data dashboard."});
      }
      setIsLoading(false);
    };
    fetchData();
  }, [authUser, toast]);

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    dashboardData?.monthlyExpenses?.forEach(expense => {
      const IconComponent = expense.icon ? ICON_COMPONENTS_MAP[expense.icon] || Shapes : Shapes;
      config[expense.categoryName] = {
        label: expense.categoryName,
        color: expense.color || "hsl(var(--chart-1))", 
        icon: IconComponent,
      };
    });
    return config;
  }, [dashboardData?.monthlyExpenses]);

  const handleViewDetailsDashboard = async (billId: string) => {
    setIsLoadingBillDetail(true);
    setDetailError(null);
    setSelectedBillForDetail(null);
    setIsDetailDialogOpen(true);
    const result = await getBillDetailsAction(billId);
    if (result.success && result.data) {
      setSelectedBillForDetail(result.data);
    } else {
      setDetailError(result.error || "Gagal memuat detail tagihan.");
      toast({ variant: "destructive", title: "Gagal Detail", description: result.error });
    }
    setIsLoadingBillDetail(false);
  };


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

      <section>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-xl"><Wallet className="mr-2 h-5 w-5 text-primary"/> Pengeluaran Bulan Ini</CardTitle>
                <CardDescription>Total pengeluaran Anda untuk bulan {format(new Date(), "MMMM yyyy", { locale: IndonesianLocale })}.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold text-primary">{formatCurrency(totalMonthlySpending)}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                    {monthlyExpenses.map((expense) => {
                       const IconComponent = expense.icon ? ICON_COMPONENTS_MAP[expense.icon] || Shapes : Shapes;
                       return (
                        <div key={expense.categoryName} className="flex flex-col items-center p-3 bg-muted/50 rounded-lg shadow-sm">
                            <IconComponent className="h-6 w-6 mb-1.5" style={{ color: expense.color }} />
                            <span className="text-xs font-medium text-muted-foreground">{expense.categoryName}</span>
                            <span className="text-sm font-semibold text-foreground">{formatCurrency(expense.totalAmount)}</span>
                        </div>
                       );
                    })}
                     {monthlyExpenses.length === 0 && (
                        <p className="col-span-full text-center text-sm text-muted-foreground py-4">Belum ada pengeluaran bulan ini atau tidak ada kategori.</p>
                    )}
                </div>
            </CardContent>
        </Card>
      </section>

      {expenseChartData.length > 0 ? (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary"/>Diagram Pengeluaran</CardTitle>
              <CardDescription>Visualisasi pengeluaran Anda per kategori untuk bulan ini.</CardDescription>
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
                        <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color || "hsl(var(--chart-1))"} />
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

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {dashboardData.recentBills.length > 0 && ( // Check against dashboardData as recentBills might be empty
                <CardFooter>
                    <Button variant="ghost" className="w-full text-primary" onClick={() => router.push('/app/history?tab=scheduled')}>
                        Lihat Semua Terjadwal <ChevronRight className="ml-1 h-4 w-4"/>
                    </Button>
                </CardFooter>
            )}
          </Card>

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
                         <Button variant="outline" size="xs" onClick={() => handleViewDetailsDashboard(bill.id)}>
                            Lihat Detail <ChevronRight className="h-3 w-3 ml-1"/>
                         </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada riwayat tagihan.</p>
              )}
            </CardContent>
             {dashboardData.recentBills.length > 0 && ( // Check against dashboardData
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

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ListChecks className="mr-3 h-6 w-6 text-primary flex-shrink-0"/>
                <span className="truncate">
                  Detail Tagihan: {selectedBillForDetail?.billName || "Memuat..."}
                </span>
            </DialogTitle>
            {selectedBillForDetail && (
                 <DialogDescription>
                    Dibuat pada: {format(parseISO(selectedBillForDetail.createdAt), "dd MMMM yyyy, HH:mm", { locale: IndonesianLocale })}
                </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-12rem)] pr-2">
            {isLoadingBillDetail ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Memuat detail tagihan...</p>
              </div>
            ) : detailError ? (
              <Alert variant="destructive">
                <Power className="h-4 w-4" />
                <AlertTitle>Gagal Memuat Detail</AlertTitle>
                <AlertDescription>{detailError}</AlertDescription>
              </Alert>
            ) : selectedBillForDetail ? (
              <div className="py-2 pr-4">
                <SummaryDisplay 
                  summary={selectedBillForDetail.summaryData} 
                  people={selectedBillForDetail.participants} 
                />
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-10">Tidak ada detail untuk ditampilkan.</p>
            )}
          </ScrollArea>
          <DialogFooter className="sm:justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

    