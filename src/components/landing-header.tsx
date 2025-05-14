
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react'; 
import { Coins } from 'lucide-react'; // Kept for potential logo use

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '#', label: 'Kontak' },
  { href: '#', label: 'Ketentuan' },
  { href: '#', label: 'Tentang Kami' },
];

export function LandingHeader() {
  // Use primary color for header background as per PRD (Light Teal)
  // For text on this, we'd need good contrast, e.g. primary-foreground
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
           <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl group-hover:bg-primary/90 transition-colors shadow-md">
            P
          </div>
          <span className="text-2xl font-bold text-foreground group-hover:text-foreground/80 transition-colors">Patungan</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3">
           <Button variant="ghost" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button variant="default" asChild>
            <Link href="/signup">Daftar</Link>
          </Button>
        </div>

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-foreground" />
                <span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background">
              <nav className="flex flex-col space-y-6 p-6 pt-12">
                <Link href="/" className="flex items-center gap-2 mb-6">
                   <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">P</div>
                   <span className="text-xl font-bold text-foreground">Patungan</span>
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-border pt-6 space-y-4">
                  <Button variant="outline" className="w-full" asChild>
                     <Link href="/login">Masuk</Link>
                  </Button>
                  <Button variant="default" className="w-full" asChild>
                     <Link href="/signup">Daftar</Link>
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
