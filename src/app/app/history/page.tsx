
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format, parseISO } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';

import type { BillHistoryEntry, DetailedBillSummaryData, Person, FetchedBillDetails } from "@/lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getCurrentUserAction, getBillsHistoryAction, getBillDetailsAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Power, FilePlus, Loader2, History as HistoryIconLucide, Users, Coins, CalendarDays, BarChart2, Star, Zap, ShoppingBag, Tag, ListChecks } from "lucide-react"; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge"; 
import { SummaryDisplay } from "@/components/summary-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LandingHeader } from "@/components/landing-header";

interface Profile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string; 
}

export default function HistoryPage() {
  const [billsHistory, setBillsHistory] = useState<BillHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [selectedBillForDetail, setSelectedBillForDetail] = useState<FetchedBillDetails | null>(null);
  const [isLoadingBillDetail, setIsLoadingBillDetail] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);


  const { toast } = useToast();
  const router = useRouter();

  const fetchUserAndHistory = useCallback(async () => {
    setIsLoadingUser(true);
    setIsLoadingHistory(true);

    const { user, error: userError } = await getCurrentUserAction();
    if (userError || !user) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: userError || "Anda harus login untuk melihat riwayat." });
      router.push("/login");
      setIsLoadingUser(false);
      setIsLoadingHistory(false);
      return;
    }
    setAuthUser(user);
    setIsLoadingUser(false);


    const historyResult = await getBillsHistoryAction();
    if (historyResult.success && historyResult.data) {
      setBillsHistory(historyResult.data);
    } else {
      setError(historyResult.error || "Gagal memuat riwayat tagihan.");
      toast({ variant: "destructive", title: "Gagal Memuat Riwayat", description: historyResult.error });
    }
    setIsLoadingHistory(false);
  }, [router, toast]);

  useEffect(() => {
    fetchUserAndHistory();
  }, [fetchUserAndHistory]);

  const handleViewDetails = async (billId: string) => {
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
  
  if (isLoadingUser || isLoadingHistory) {
    return (
      <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
        <LandingHeader />
        <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-foreground">Memuat riwayat tagihan...</p>
          </div>
        </main>
         <footer className="relative z-10 mt-auto pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        </footer>
      </div>
    );
  }

  const displayedBills = billsHistory;

  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <LandingHeader />
      <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground flex items-center">
                <HistoryIconLucide className="mr-3 h-8 w-8 text-primary" />
                Riwayat Tagihan Anda
            </h2>
        </div>
        
        {error && (
          <Alert variant="destructive" className="shadow-md mb-6">
            <Power className="h-4 w-4" />
            <AlertTitle>Kesalahan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {billsHistory.length === 0 && !isLoadingHistory && !error && (
          <Card className="shadow-lg border-dashed">
            <CardContent className="p-10 text-center">
              <HistoryIconLucide className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Belum Ada Riwayat</h3>
              <p className="text-muted-foreground mb-6">Anda belum memiliki riwayat tagihan yang tersimpan. Mulai buat tagihan baru!</p>
              <Button onClick={() => router.push('/app')}>
                <FilePlus className="mr-2 h-4 w-4" /> Buat Tagihan Baru Sekarang
              </Button>
            </CardContent>
          </Card>
        )}

        {displayedBills.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedBills.map((bill) => (
              <Card key={bill.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate text-xl">{bill.name || "Tagihan Tanpa Nama"}</CardTitle>
                  <CardDescription className="flex items-center text-sm">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    {bill.scheduled_at ? 
                        `Dijadwalkan: ${format(parseISO(bill.scheduled_at), "dd MMMM yyyy, HH:mm", { locale: IndonesianLocale })}` :
                        format(parseISO(bill.createdAt), "dd MMMM yyyy, HH:mm", { locale: IndonesianLocale })
                    }
                  </CardDescription>
                  {bill.categoryName && (
                     <Badge variant="outline" className="mt-1 w-fit text-xs">
                        <Tag className="mr-1.5 h-3 w-3"/>
                        {bill.categoryName}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                   {bill.grandTotal !== null ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center"><Coins className="mr-2 h-4 w-4"/>Total Tagihan:</span>
                        <span className="font-semibold text-primary">{formatCurrency(bill.grandTotal || 0, "IDR")}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4"/>Dibayar Oleh:</span>
                        <span className="font-medium truncate">{bill.payerName || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4"/>Partisipan:</span>
                        <span className="font-medium">{bill.participantCount} orang</span>
                      </div>
                    </>
                   ) : (
                    <div className="text-sm text-muted-foreground flex items-center">
                        <ShoppingBag className="mr-2 h-4 w-4 text-amber-500" />
                        Tagihan ini dijadwalkan dan detailnya belum diisi.
                    </div>
                   )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => handleViewDetails(bill.id)}>
                    Lihat Detail
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Card className="shadow-lg mt-10 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-primary"/> Ringkasan Finansial</CardTitle>
              <CardDescription>Statistik penggunaan aplikasi Patungan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Total Pengeluaran Bulan Ini:</h4>
                <p className="text-muted-foreground">Segera hadir! (Fitur grafik pengeluaran bulanan sedang dikembangkan).</p>
              </div>
              <div>
                <h4 className="font-medium">Total Tagihan Dibuat:</h4>
                <p className="text-muted-foreground">Segera hadir! (Jumlah tagihan yang pernah Anda inisiasi).</p>
              </div>
            </CardContent>
        </Card>
      </main>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl max-h-[90vh]">
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


      <footer className="relative z-10 mt-auto pt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}
