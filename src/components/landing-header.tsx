"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, UserCircle, LayoutDashboard, Coins } from 'lucide-react'; 
import { useEffect, useState, useCallback } from 'react';
import { getCurrentUserAction, logoutUserAction } from '@/lib/actions';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '#features', label: 'Fitur' }, // Contoh link ke section
  { href: '#contact', label: 'Kontak' },
];

interface Profile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
}

export function LandingHeader() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  const fetchUser = useCallback(async () => {
    setIsLoadingUser(true);
    const { user, profile } = await getCurrentUserAction();
    setAuthUser(user);
    setUserProfile(profile);
    setIsLoadingUser(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleLogout = async () => {
    const { success, error } = await logoutUserAction();
    if (success) {
      toast({ title: "Logout Berhasil" });
      setAuthUser(null);
      setUserProfile(null);
      setIsMobileMenuOpen(false); // Close mobile menu on logout
      router.push("/"); // Tetap di landing page atau arahkan ke login
    } else {
      toast({ variant: "destructive", title: "Logout Gagal", description: error });
    }
  };
  
  const displayName = userProfile?.username || userProfile?.full_name || authUser?.email || "Pengguna";
  const avatarInitial = displayName.substring(0,1).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
           <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl group-hover:bg-primary/90 transition-colors shadow-md">
            P
          </div>
          <span className="text-2xl font-bold text-foreground group-hover:text-foreground/80 transition-colors">Patungan</span>
        </Link>

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

        <div className="hidden md:flex items-center space-x-3">
          {isLoadingUser ? (
             <Button variant="ghost" disabled size="sm">Memuat...</Button>
          ) : authUser ? (
            <>
              <Button variant="outline" asChild size="sm">
                <Link href="/app">
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Ke Aplikasi
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout} size="sm">
                 <LogOut className="mr-2 h-4 w-4" /> Keluar
              </Button>
               <Avatar className="h-9 w-9 cursor-pointer" onClick={() => router.push('/app')}> {/* /app/profile nanti */}
                <AvatarImage src={userProfile?.avatar_url || `https://placehold.co/40x40.png?text=${avatarInitial}`} alt={displayName} data-ai-hint="profile avatar" />
                <AvatarFallback>{avatarInitial}</AvatarFallback>
              </Avatar>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild size="sm">
                <Link href="/login">Masuk</Link>
              </Button>
              <Button variant="default" asChild size="sm">
                <Link href="/signup">Daftar</Link>
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-foreground" />
                <span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background">
              <nav className="flex flex-col space-y-6 p-6 pt-12">
                <Link href="/" className="flex items-center gap-2 mb-6" onClick={() => setIsMobileMenuOpen(false)}>
                   <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">P</div>
                   <span className="text-xl font-bold text-foreground">Patungan</span>
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                     onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-border pt-6 space-y-4">
                  {isLoadingUser ? (
                     <Button variant="outline" className="w-full" disabled>Memuat...</Button>
                  ) : authUser ? (
                    <>
                      <div className="flex items-center gap-3 mb-2 px-1">
                        <Avatar className="h-10 w-10">
                           <AvatarImage src={userProfile?.avatar_url || `https://placehold.co/40x40.png?text=${avatarInitial}`} alt={displayName} data-ai-hint="profile avatar" />
                           <AvatarFallback>{avatarInitial}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{userProfile?.full_name || displayName}</p>
                          <p className="text-xs text-muted-foreground">{authUser.email}</p>
                        </div>
                      </div>
                      <Button variant="default" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                         <Link href="/app"><LayoutDashboard className="mr-2 h-4 w-4"/> Ke Aplikasi</Link>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={handleLogout}>
                         <LogOut className="mr-2 h-4 w-4" /> Keluar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                         <Link href="/login">Masuk</Link>
                      </Button>
                      <Button variant="default" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                         <Link href="/signup">Daftar</Link>
                      </Button>
                    </>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}