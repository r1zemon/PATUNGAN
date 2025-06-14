
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing-header';
import { Footer } from '@/components/footer';
import { ArrowRight, MoveRight, ScanLine, Users, ListChecks, Wallet, BarChart3, CreditCard } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      title: "Scan Struk Cepat & Akurat",
      description: "Hemat waktu dengan memindai struk belanjaan Anda. AI kami akan otomatis mendeteksi item dan harga, mengurangi input manual dan mempercepat proses pembagian.",
      icon: ScanLine,
      imageSrc: "https://placehold.co/280x600.png",
      imageAlt: "App screenshot showing receipt scanning feature",
      aiHint: "receipt scan app",
      bgColor: "bg-sky-100 dark:bg-sky-900/30",
      textColor: "text-sky-700 dark:text-sky-300",
    },
    {
      title: "Alokasi Fleksibel & Adil",
      description: "Bagikan setiap item ke orang yang tepat dengan mudah. Atur kuantitas per orang, dan biarkan sistem menghitung totalnya secara adil untuk semua partisipan.",
      icon: Users,
      imageSrc: "https://placehold.co/280x600.png",
      imageAlt: "App screenshot showing item assignment feature",
      aiHint: "bill split assignment",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      textColor: "text-amber-700 dark:text-amber-300",
    },
    {
      title: "Ringkasan Jelas & Transparan",
      description: "Lihat rincian siapa berutang apa kepada siapa dengan ringkasan yang mudah dipahami. Tidak ada lagi kebingungan saat menagih atau membayar!",
      icon: ListChecks,
      imageSrc: "https://placehold.co/280x600.png",
      imageAlt: "App screenshot showing bill summary feature",
      aiHint: "payment summary app",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      textColor: "text-emerald-700 dark:text-emerald-300",
    },
  ];

  const appCoreFeatures = [
    {
      icon: Wallet,
      title: "Kelola Biaya Bersama",
      description: "Catat semua pengeluaran grup Anda, dari makan malam hingga biaya liburan, semuanya di satu tempat.",
      imageSrc: "https://placehold.co/280x600.png",
      aiHint: "expense management mobile",
    },
    {
      icon: BarChart3,
      title: "Pantau Saldo & Utang",
      description: "Lihat dengan jelas siapa berutang kepada siapa dan lacak saldo Anda dengan teman-teman secara real-time.",
      imageSrc: "https://placehold.co/280x600.png",
      aiHint: "balance tracking app",
    },
    {
      icon: CreditCard,
      title: "Selesaikan Pembayaran Mudah",
      description: "Dapatkan rekomendasi cara termudah untuk melunasi utang piutang dalam grup Anda, minimalkan transaksi.",
      imageSrc: "https://placehold.co/280x600.png",
      aiHint: "payment settlement mobile",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background bg-geometric-pattern dark:bg-geometric-pattern-dark">
      <LandingHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 py-16 md:py-24 lg:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
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
                <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow duration-300 hover:scale-[1.03] transform">
                  <Link href="/app">
                    Mulai Patungan <MoveRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="border-primary text-primary hover:bg-primary/10 shadow-lg hover:shadow-xl transition-shadow duration-300 hover:scale-[1.03] transform">
                  <Link href="/signup"> 
                    Daftar Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="flex justify-center md:justify-end animate-fade-in-up">
              <div className="bg-neutral-800 p-2 sm:p-3 rounded-[2.5rem] shadow-2xl w-full max-w-[280px] sm:max-w-xs transform transition-transform duration-500 hover:scale-105">
                <div className="bg-background rounded-[2rem] overflow-hidden">
                  <Image 
                      src="https://placehold.co/320x640.png" 
                      alt="Patungan App Screenshot on Phone" 
                      width={320} 
                      height={640} 
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
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Semua yang Anda Butuhkan untuk Keuangan Grup</h2>
              <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
                Dari pembagian struk sekali jalan hingga pelacakan pengeluaran bersama jangka panjang, Patungan hadir untuk Anda.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-12">
              {appCoreFeatures.map((feature, index) => {
                const IconComponent = feature.icon;
                // Alternate image alignment for visual variety
                const isImageLeft = index % 2 === 0;
                return (
                  <div key={feature.title} className="grid md:grid-cols-2 gap-8 md:gap-12 items-center bg-card p-6 sm:p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div className={`flex justify-center ${isImageLeft ? 'md:order-1' : 'md:order-2'}`}>
                       <div className="bg-neutral-800 p-2 sm:p-3 rounded-[2.5rem] shadow-xl w-full max-w-[240px] sm:max-w-[260px] transform transition-transform duration-500 hover:scale-105">
                        <div className="bg-background rounded-[2rem] overflow-hidden aspect-[9/19]">
                          <Image
                            src={feature.imageSrc}
                            alt={`${feature.title} mock-up`}
                            width={280}
                            height={600}
                            className="object-cover w-full h-full"
                            data-ai-hint={feature.aiHint}
                          />
                        </div>
                      </div>
                    </div>
                    <div className={`text-center md:text-left ${isImageLeft ? 'md:order-2' : 'md:order-1'}`}>
                      <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-lg mb-4 text-primary">
                        <IconComponent className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl lg:text-3xl font-semibold mb-3 text-card-foreground">{feature.title}</h3>
                      <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
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
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">Kenapa Pilih Patungan?</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="bg-card p-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scan-barcode mx-auto mb-4 text-primary h-12 w-12"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/></svg>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">Scan Struk Mudah</h3>
                <p className="text-muted-foreground">Scan dan digitalkan struk Anda dengan cepat menggunakan kamera ponsel.</p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users-round mx-auto mb-4 text-primary h-12 w-12"><path d="M18 21a8 8 0 0 0-12 0"/><circle cx="12" cy="11" r="4"/><path d="M12 3a3 3 0 0 1 2.6 1.5L16.4 7H7.6l1.8-2.5A3 3 0 0 1 12 3Z"/></svg>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">Pembagian Fleksibel</h3>
                <p className="text-muted-foreground">Tetapkan item ke banyak orang dan bagi biaya secara akurat.</p>
              </div>
              <div className="bg-card p-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:scale-[1.03] hover:shadow-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-share-2 mx-auto mb-4 text-primary h-12 w-12"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                <h3 className="text-xl font-semibold mb-2 text-card-foreground">Ringkasan Jelas</h3>
                <p className="text-muted-foreground">Dapatkan rincian yang jelas tentang siapa berutang apa, membuat pelunasan menjadi mudah.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Features Section (Original from previous request, maybe rename or merge) */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Fitur Unggulan Patungan</h2>
              <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
                Dirancang untuk memudahkan setiap aspek pembagian biaya grup Anda, dari scan struk hingga pelunasan.
              </p>
            </div>

            <div className="space-y-16 md:space-y-24">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                const isEven = index % 2 === 0;
                return (
                  <div key={feature.title} className={`grid md:grid-cols-5 gap-8 md:gap-12 items-center animate-fade-in-up ${feature.bgColor} p-6 sm:p-8 rounded-xl shadow-lg`}>
                    <div className={`md:col-span-3 ${isEven ? 'md:order-2' : 'md:order-1'} text-center md:text-left`}>
                      <div className="inline-flex items-center justify-center p-3 bg-primary/20 rounded-lg mb-4">
                        <IconComponent className={`h-8 w-8 ${feature.textColor}`} />
                      </div>
                      <h3 className={`text-2xl lg:text-3xl font-semibold mb-3 ${feature.textColor}`}>{feature.title}</h3>
                      <p className="text-base lg:text-lg text-muted-foreground leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                    <div className={`md:col-span-2 flex justify-center ${isEven ? 'md:order-1' : 'md:order-2'}`}>
                      <div className="bg-neutral-800 p-2 sm:p-3 rounded-[2.5rem] shadow-2xl w-full max-w-[260px] transform transition-transform duration-500 hover:scale-105">
                        <div className="bg-background rounded-[2rem] overflow-hidden aspect-[9/19]">
                          <Image
                            src={feature.imageSrc}
                            alt={feature.imageAlt}
                            width={280}
                            height={600}
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
