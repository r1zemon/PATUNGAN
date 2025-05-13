
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Coins } from 'lucide-react'; // Added Coins for logo

const navLinks = [
  { href: '#', label: 'Home' },
  { href: '#', label: 'Contact' },
  { href: '#', label: 'Terms' },
  { href: '#', label: 'About' },
];

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-accent text-accent-foreground shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          {/* Patungan Logo (dark circle with P) - SVG or simple div */}
           <div className="h-8 w-8 bg-foreground rounded-full flex items-center justify-center text-accent font-bold text-lg group-hover:bg-foreground/80 transition-colors">
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
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          <Button variant="secondary" asChild>
            <Link href="#">Login</Link>
          </Button>
          <Button variant="default" className="bg-accent-foreground text-accent" asChild>
             {/* This button uses accent-foreground as BG, and accent as text to match screenshot for "Sign Up" if header is accent */}
             {/* Given header is accent, and Sign Up button is green (accent), its text is white (accent-foreground) */}
             {/* For this setup, Sign Up should be a standard primary or a differently styled button if header is accent */}
             {/* Let's make Sign Up a primary button for contrast if header is accent */}
             <Link href="#">Sign Up</Link>
          </Button>
           {/* Correcting Sign Up button based on theme:
              If header is bg-accent, and accent-foreground is white.
              Sign Up button (green with white text) should be:
              <Button className="bg-green-500 hover:bg-green-600 text-white">Sign Up</Button>
              Or use primary variant for it.
              Let's use primary variant as it's visually distinct and main CTA.
            */}
        </div>
         <div className="hidden md:flex items-center space-x-3">
           <Button variant="secondary" asChild>
            <Link href="#">Login</Link>
          </Button>
          <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            {/* This uses the theme's accent color directly. */}
            <Link href="#">Sign Up</Link>
          </Button>
        </div>


        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-foreground" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background">
              <nav className="flex flex-col space-y-6 p-6 pt-12">
                <Link href="/" className="flex items-center gap-2 mb-6">
                   <div className="h-8 w-8 bg-foreground rounded-full flex items-center justify-center text-background font-bold text-lg">P</div>
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
                  <Button variant="secondary" className="w-full" asChild>
                     <Link href="#">Login</Link>
                  </Button>
                  <Button variant="default" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                     <Link href="#">Sign Up</Link>
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
