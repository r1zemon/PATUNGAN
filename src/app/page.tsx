
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing-header';
import { Footer } from '@/components/footer';
import { ArrowRight, MoveRight, ScanLine, Users, ListChecks, Wallet, BarChart3, CreditCard, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getCurrentUserAction } from '@/lib/actions';

export default function LandingPage() {
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

  const features = [
    {
      title: "Scan Struk Cepat & Akurat",
      description: "Hemat waktu dengan memindai struk belanjaan Anda. AI kami akan otomatis mendeteksi item dan harga.",
      icon: ScanLine,
      imageSrc: "https://placehold.co/240x520.png",
      imageAlt: "App screenshot showing receipt scanning feature",
      aiHint: "receipt scan app",
      bgColor: "bg-sky-100 dark:bg-sky-900/30",
      textColor: "text-sky-700 dark:text-sky-300",
    },
    {
      title: "Alokasi Fleksibel & Adil",
      description: "Bagikan setiap item ke orang yang tepat dengan mudah. Atur kuantitas per orang, dan biarkan sistem menghitungnya.",
      icon: Users,
      imageSrc: "https://placehold.co/240x520.png",
      imageAlt: "App screenshot showing item assignment feature",
      aiHint: "bill split assignment",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      textColor: "text-amber-700 dark:text-amber-300",
    },
    {
      title: "Ringkasan Jelas & Transparan",
      description: "Lihat rincian siapa berutang apa kepada siapa dengan ringkasan yang mudah dipahami. Tidak ada lagi kebingungan!",
      icon: ListChecks,
      imageSrc: "https://placehold.co/240x520.png",
      imageAlt: "App screenshot showing bill summary feature",
      aiHint: "payment summary app",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      textColor: "text-emerald-700 dark:text-emerald-300",
    },
  ];

  const appCoreFeatures = [
    {
      icon: Wallet,
      title: "Kelola Biaya Bersama Jadi Mudah",
      description: "Unggah struk atau masukkan pengeluaran manual. Patungan mencatat dan membagi semua biaya dengan adil.",
      imageSrc: "https://placehold.co/240x520.png?bg=ccffee",
      aiHint: "expense management mobile",
    },
    {
      icon: BarChart3,
      title: "Pantau Saldo & Utang Real-time",
      description: "Dengan ringkasan yang jelas, Anda selalu tahu siapa berutang kepada siapa setelah setiap pembagian.",
      imageSrc: "https://placehold.co/240x520.png?bg=e6f7ff",
      aiHint: "balance tracking app",
    },
    {
      icon: CreditCard,
      title: "Selesaikan Pembayaran Cepat",
      description: "Dapatkan rincian jelas total yang harus dibayar setiap orang. Proses pelunasan jadi sederhana.",
      imageSrc: "https://placehold.co/240x520.png?bg=fff0e6",
      aiHint: "payment settlement mobile",
    },
  ];

  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <LandingHeader />
      <main className="relative z-[1] flex-grow">
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
                  <Image 
                      src="https://placehold.co/280x560.png" 
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
        
        {/* New Core Features Section (Vertical Layout) */}
        <section className="py-12 md:py-16 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Semua untuk Keuangan Grup Anda</h2>
              <p className="text-base md:text-lg text-foreground mt-2 max-w-xl mx-auto">
                Dari scan struk hingga pelacakan pengeluaran, Patungan siap membantu.
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-10">
              {appCoreFeatures.map((feature, index) => {
                const IconComponent = feature.icon;
                const isImageLeft = index % 2 === 0;
                return (
                  <div key={feature.title} className="grid md:grid-cols-2 gap-6 md:gap-8 items-center bg-card p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                    <div className={`flex justify-center ${isImageLeft ? 'md:order-1' : 'md:order-2'}`}>
                       <div className="bg-neutral-800 p-1.5 sm:p-2 rounded-[2rem] shadow-lg w-full max-w-[200px] sm:max-w-[220px] transition-transform duration-500">
                        <div className="bg-background rounded-[1.8rem] overflow-hidden aspect-[9/19]">
                          <Image
                            src={feature.imageSrc}
                            alt={`${feature.title} mock-up`}
                            width={240}
                            height={520}
                            className="object-cover w-full h-full"
                            data-ai-hint={feature.aiHint}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={`text-center md:text-left ${isImageLeft ? 'md:order-2' : 'md:order-1'}`}>
                      <div className="inline-flex items-center justify-center p-2 bg-primary/20 rounded-md mb-3 text-primary">
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl lg:text-2xl font-semibold mb-2 text-card-foreground">{feature.title}</h3>
                      <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>


        {/* Key Features Section (Original - maybe rename or merge) */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-foreground">Kenapa Pilih Patungan?</h2>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div className="bg-card p-5 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-barcode mx-auto mb-3 text-primary h-10 w-10"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/></svg>
                <h3 className="text-lg font-semibold mb-1 text-card-foreground">Scan Struk Mudah</h3>
                <p className="text-sm text-muted-foreground">Scan struk cepat pakai kamera ponsel Anda.</p>
              </div>
              <div className="bg-card p-5 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl">
                 <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users-round mx-auto mb-3 text-primary h-10 w-10"><path d="M18 21a8 8 0 0 0-12 0"/><circle cx="12" cy="11" r="4"/><path d="M12 3a3 3 0 0 1 2.6 1.5L16.4 7H7.6l1.8-2.5A3 3 0 0 1 12 3Z"/></svg>
                <h3 className="text-lg font-semibold mb-1 text-card-foreground">Pembagian Fleksibel</h3>
                <p className="text-sm text-muted-foreground">Tetapkan item ke banyak orang, bagi biaya akurat.</p>
              </div>
              <div className="bg-card p-5 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2 mx-auto mb-3 text-primary h-10 w-10"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                <h3 className="text-lg font-semibold mb-1 text-card-foreground">Ringkasan Jelas</h3>
                <p className="text-sm text-muted-foreground">Rincian jelas siapa berutang apa, pelunasan mudah.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Features Section (Original from previous request, maybe rename or merge) */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 md:mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Fitur Unggulan Patungan</h2>
              <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-xl mx-auto">
                Dirancang untuk memudahkan setiap aspek pembagian biaya grup Anda.
              </p>
            </div>

            <div className="space-y-12 md:space-y-16">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                const isEven = index % 2 === 0;
                return (
                  <div key={feature.title} className={`grid md:grid-cols-5 gap-6 md:gap-8 items-center animate-fade-in-up ${feature.bgColor} p-4 sm:p-6 rounded-lg shadow-md`}>
                    <div className={`md:col-span-3 ${isEven ? 'md:order-2' : 'md:order-1'} text-center md:text-left`}>
                      <div className="inline-flex items-center justify-center p-2 bg-primary/20 rounded-md mb-3">
                        <IconComponent className={`h-6 w-6 ${feature.textColor}`} />
                      </div>
                      <h3 className={`text-xl lg:text-2xl font-semibold mb-2 ${feature.textColor}`}>{feature.title}</h3>
                      <p className="text-sm lg:text-base text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    <div className={`md:col-span-2 flex justify-center ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                      <div className="bg-neutral-800 p-1.5 sm:p-2 rounded-[2rem] shadow-xl w-full max-w-[200px] sm:max-w-[220px] transition-transform duration-500">
                        <div className="bg-background rounded-[1.8rem] overflow-hidden aspect-[9/19]">
                          <Image
                            src={feature.imageSrc}
                            alt={feature.imageAlt}
                            width={240}
                            height={520}
                            className="object-cover w-full h-full"
                            data-ai-hint={feature.aiHint}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
    

    
