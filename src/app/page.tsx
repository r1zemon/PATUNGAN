
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing-header';
import { Footer } from '@/components/footer';
import { ArrowRight, MoveRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow">
        <section className="container mx-auto px-4 sm:px-6 py-16 md:py-24 lg:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Text Content */}
            <div className="animate-fade-in-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-foreground leading-tight">
                Split your bill
                <br />
                Cara <span className="text-primary">termudah</span> untuk
                <br />
                bagi tagihan dengan teman.
              </h1>
              <p className="text-lg text-muted-foreground mb-10 max-w-lg">
                Jaga pengeluaran grup tetap adil dan bebas stres! Gunakan Patungan untuk membagi tagihan,
                mengelola dana bersama, dan melunasi setelah aktivitas apapun.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <Link href="/app">
                    Mulai Patungan <MoveRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <Link href="/signup"> 
                    Daftar Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
            {/* Right Image Content */}
            <div className="flex justify-center md:justify-end animate-fade-in-up animation-delay-300">
              <div className="bg-card p-3 sm:p-4 rounded-2xl shadow-2xl w-full max-w-[300px] sm:max-w-xs transform transition-transform duration-500 hover:scale-105">
                 <Image 
                    src="https://placehold.co/320x640.png" 
                    alt="Patungan App Screenshot" 
                    width={320} 
                    height={640} 
                    className="rounded-xl object-cover"
                    data-ai-hint="mobile app transactions" 
                    priority
                  />
              </div>
            </div>
          </div>
        </section>
         {/* Added key features section for more content */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Kenapa Pilih Patungan?</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-card p-6 rounded-lg shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-barcode mx-auto mb-4 text-primary h-12 w-12"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/></svg>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">Scan Struk Mudah</h3>
                <p className="text-muted-foreground">Scan dan digitalkan struk Anda dengan cepat menggunakan kamera ponsel.</p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-lg">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users-round mx-auto mb-4 text-primary h-12 w-12"><path d="M18 21a8 8 0 0 0-12 0"/><circle cx="12" cy="11" r="4"/><path d="M12 3a3 3 0 0 1 2.6 1.5L16.4 7H7.6l1.8-2.5A3 3 0 0 1 12 3Z"/></svg>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">Pembagian Fleksibel</h3>
                <p className="text-muted-foreground">Tetapkan item ke banyak orang dan bagi biaya secara akurat.</p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2 mx-auto mb-4 text-primary h-12 w-12"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">Ringkasan Jelas</h3>
                <p className="text-muted-foreground">Dapatkan rincian yang jelas tentang siapa berutang apa, membuat pelunasan menjadi mudah.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
