
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, MoveRight, ScanLine, Users, ListChecks, Wallet, BarChart3, CreditCard, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getCurrentUserAction } from '@/lib/actions';


// This component contains the original content of the landing page
export function LandingPageContent() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsLoadingUser(true);
    const { user } = await getCurrentUserAction();
    setAuthUser(user);
    setIsLoadingUser(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <>
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-12 md:py-16 lg:py-20">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-in-up">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5 text-foreground leading-tight">
              Split your bill
              <br />
              Cara <span className="text-primary">termudah</span> untuk
              <br />
              bagi tagihan dengan teman.
            </h1>
            <p className="text-base sm:text-lg text-foreground mb-8 max-w-md">
              Jaga pengeluaran grup tetap adil dan bebas stres! Gunakan Patungan untuk membagi tagihan dan kelola dana bersama.
            </p>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <Button size="lg" asChild className="shadow-md hover:shadow-lg transition-shadow duration-300">
                <Link href="/app">
                  <span>Mulai Patungan <MoveRight className="ml-2 h-5 w-5 inline" /></span>
                </Link>
              </Button>
              {isLoadingUser ? (
                <Button size="lg" variant="outline" disabled className="border-primary text-primary hover:bg-primary/10 shadow-md hover:shadow-lg transition-shadow duration-300">
                   <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat...
                </Button>
              ) : !authUser && (
                <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10 shadow-md hover:shadow-lg transition-shadow duration-300">
                  <Link href="/signup">
                    <span>Daftar Sekarang <ArrowRight className="ml-2 h-5 w-5 inline" /></span>
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-center md:justify-end animate-fade-in-up">
            <div className="bg-neutral-800 p-2 rounded-[2rem] shadow-xl w-full max-w-[240px] sm:max-w-[280px] transition-transform duration-500">
              <div className="bg-background rounded-[1.8rem] overflow-hidden">
                {/* 
                  TIPS: Untuk mengganti gambar ini, pindahkan screenshot Anda ke folder 'public',
                  lalu ubah 'src' di bawah ini menjadi nama file Anda (contoh: src="/nama-file-anda.png").
                */}
                <Image 
                    src="/ss.jpg" 
                    alt="Patungan App Screenshot on Phone" 
                    width={280} 
                    height={560} 
                    className="object-cover"
                    data-ai-hint="mobile app transactions" 
                    priority
                  />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
