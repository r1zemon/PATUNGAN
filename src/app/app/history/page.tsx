
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';

import type { BillHistoryEntry } from "@/lib/types";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getCurrentUserAction, logoutUserAction, getBillsHistoryAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Home, LogOut, Settings, UserCircle, Power, Info, FilePlus, Loader2, History as HistoryIconLucide, ArrowLeft, Users, Coins, CalendarDays } from "lucide-react"; // Renamed History to HistoryIconLucide
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const { toast } = useToast();
  const router = useRouter();

  const fetchUserAndHistory = useCallback(async () => {
    setIsLoadingUser(true);
    setIsLoadingHistory(true);

    const { user, profile, error: userError } = await getCurrentUserAction();
    if (userError || !user) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: userError || "Anda harus login untuk melihat riwayat." });
      router.push("/login");
      setIsLoadingUser(false);
      setIsLoadingHistory(false);
      return;
    }
    setAuthUser(user);
    setUserProfile(profile);
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

  const handleLogout = async () => {
    const { success, error: logoutErr } = await logoutUserAction();
    if (success) {
      toast({ title: "Logout Berhasil" });
      setAuthUser(null);
      setUserProfile(null);
      router.push("/"); 
    } else {
      toast({ variant: "destructive", title: "Logout Gagal", description: logoutErr });
    }
  };
  
  const displayName = userProfile?.username || userProfile?.full_name || authUser?.email || "Pengguna";
  const avatarInitial = displayName ? displayName.substring(0,1).toUpperCase() : "P";


  if (isLoadingUser || isLoadingHistory) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/10 to-background p-4 bg-money-pattern bg-[length:150px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
        <header className="relative z-[1] py-4 px-4 sm:px-6 md:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between">
            <Link href="/app" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <Image src="/logo.png" alt="Patungan Logo" width={48} height={48} className="rounded-lg shadow-sm" data-ai-hint="logo company"/>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Patungan</h1>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Skeleton className="h-9 w-28 hidden sm:block" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </header>
        <main className="relative z-[1] container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-foreground">Memuat riwayat tagihan...</p>
          </div>
        </main>
         <footer className="relative z-[1] mt-auto pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
            <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/10 to-background bg-money-pattern bg-[length:150px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <header className="relative z-[1] py-4 px-4 sm:px-6 md:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/app" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <Image src="/logo.png" alt="Patungan Logo" width={48} height={48} className="rounded-lg shadow-sm" data-ai-hint="logo company"/>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Patungan
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
             <Button variant="outline" onClick={() => router.push('/app')} size="sm" className="hidden sm:inline-flex">
                <FilePlus className="mr-2 h-4 w-4" /> Tagihan Baru
            </Button>
            <Link href="/app" passHref>
              <Button variant="ghost" size="icon" aria-label="Ke Aplikasi Utama">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            {authUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={userProfile?.avatar_url || `https://placehold.co/40x40.png?text=${avatarInitial}`} alt={displayName} data-ai-hint="profile avatar"/>
                      <AvatarFallback>{avatarInitial}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userProfile?.full_name || displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {authUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/app')} className="sm:hidden">
                      <FilePlus className="mr-2 h-4 w-4" />
                      <span>Tagihan Baru</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => toast({title: "Info", description: "Halaman profil belum diimplementasikan."})}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast({title: "Info", description: "Pengaturan belum diimplementasikan."})}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/login')} variant="outline" size="sm">
                Masuk / Daftar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-[1] container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground flex items-center">
                <HistoryIconLucide className="mr-3 h-8 w-8 text-primary" />
                Riwayat Tagihan Anda
            </h2>
             <Button onClick={() => router.push('/app')} variant="default">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Aplikasi
            </Button>
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

        {billsHistory.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {billsHistory.map((bill) => (
              <Card key={bill.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate text-xl">{bill.name || "Tagihan Tanpa Nama"}</CardTitle>
                  <CardDescription className="flex items-center text-sm">
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    {format(new Date(bill.createdAt), "dd MMMM yyyy, HH:mm", { locale: IndonesianLocale })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 flex-grow">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center"><Coins className="mr-2 h-4 w-4"/>Total Tagihan:</span>
                    <span className="font-semibold text-primary">{formatCurrency(bill.grandTotal || 0, "IDR")}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center"><UserCircle className="mr-2 h-4 w-4"/>Dibayar Oleh:</span>
                    <span className="font-medium truncate">{bill.payerName || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center"><Users className="mr-2 h-4 w-4"/>Partisipan:</span>
                    <span className="font-medium">{bill.participantCount} orang</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" onClick={() => toast({title: "Info", description:"Fitur lihat detail riwayat belum tersedia."})}>
                    Lihat Detail
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="relative z-[1] mt-auto pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}

