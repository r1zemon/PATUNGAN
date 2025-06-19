
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, UserCircle, LayoutDashboard, History as HistoryIconLucide, Settings, FilePlus } from 'lucide-react'; 
import { useEffect, useState, useCallback } from 'react';
import { getCurrentUserAction, logoutUserAction } from '@/lib/actions';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation"; // Added usePathname
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/app/history', label: 'Riwayat' }, 
  { href: '#contact', label: 'Kontak' },
];

interface Profile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

export function LandingHeader() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname(); 
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
      setIsMobileMenuOpen(false); 
      router.push("/"); 
    } else {
      toast({ variant: "destructive", title: "Logout Gagal", description: error });
    }
  };
  
  const displayName = userProfile?.username || userProfile?.full_name || authUser?.email || "Pengguna";
  const avatarInitial = displayName ? displayName.substring(0,1).toUpperCase() : "P";
  const shortDisplayName = userProfile?.username || (userProfile?.full_name ? userProfile.full_name.split(' ')[0] : (authUser?.email ? authUser.email.split('@')[0] : "Pengguna"));


  const handleHistoryClick = () => {
    setIsMobileMenuOpen(false);
    if (authUser) {
      router.push('/app/history');
    } else {
      toast({title: "Akses Ditolak", description: "Anda harus login untuk melihat riwayat.", duration: 3000});
      router.push('/login');
    }
  };
  
  const handleProfileClick = () => {
    setIsMobileMenuOpen(false);
    if (authUser) {
      router.push('/app/profile');
    } else {
      toast({title: "Akses Ditolak", description: "Anda harus login untuk melihat profil.", duration: 3000});
      router.push('/login');
    }
  };

  const handleNavLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === '/') {
      if (pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsMobileMenuOpen(false); 
      } else {
        setIsMobileMenuOpen(false); 
        router.push('/'); 
      }
    } else if (href === '/app/history') {
      e.preventDefault(); 
      handleHistoryClick();
    } else if (href === '/app/profile') {
      e.preventDefault();
      handleProfileClick();
    }
    else {
      setIsMobileMenuOpen(false); 
      // For other links like '#contact', allow default behavior or push to a page if it's a full path
      if (href.startsWith('#')) {
        // Handle hash links if needed, or let default behavior
      } else {
        router.push(href);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background shadow-sm">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group" onClick={(e) => handleNavLinkClick(e, '/')}>
           <Image src="/logo.png" alt="Patungan Logo" width={56} height={56} className="rounded-lg group-hover:opacity-90 transition-opacity" data-ai-hint="logo company"/>
           <span className="text-2xl font-bold text-foreground group-hover:text-foreground/80 transition-colors">Patungan</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={(e) => handleNavLinkClick(e, link.href)}
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
              <Button variant="default" asChild size="sm">
                <Link href="/app">
                  <FilePlus className="mr-2 h-4 w-4" /> Tagihan Baru
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1.5 sm:gap-2 rounded-md p-1 sm:p-1.5 h-auto">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                      <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} data-ai-hint="profile avatar"/>
                      <AvatarFallback>{avatarInitial}</AvatarFallback>
                    </Avatar>
                     <span className="hidden sm:inline text-xs sm:text-sm font-medium text-foreground truncate max-w-[70px] xs:max-w-[100px] md:max-w-[120px] group-hover:text-foreground/80 transition-colors">
                      {shortDisplayName}
                    </span>
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
                  <DropdownMenuItem onClick={handleHistoryClick}>
                    <HistoryIconLucide className="mr-2 h-4 w-4" />
                    <span>Riwayat Tagihan</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleProfileClick}>
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
                <Link href="/" className="flex items-center gap-2 mb-6" onClick={(e) => handleNavLinkClick(e, '/')}>
                   <Image src="/logo.png" alt="Patungan Logo" width={40} height={40} className="rounded-lg" data-ai-hint="logo company"/>
                   <span className="text-xl font-bold text-foreground">Patungan</span>
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors flex items-center"
                     onClick={(e) => handleNavLinkClick(e, link.href)}
                  >
                    {link.label === "Riwayat" && <HistoryIconLucide className="inline-block mr-2 h-5 w-5" />}
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
                           <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} data-ai-hint="profile avatar" />
                           <AvatarFallback>{avatarInitial}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{userProfile?.full_name || displayName}</p>
                          <p className="text-xs text-muted-foreground">{authUser.email}</p>
                        </div>
                      </div>
                      <Button variant="default" className="w-full" asChild onClick={() => {router.push('/app'); setIsMobileMenuOpen(false);}}>
                         <Link href="/app"><FilePlus className="mr-2 h-4 w-4"/> Tagihan Baru</Link>
                      </Button>
                      <Button variant="outline" className="w-full" onClick={handleProfileClick}>
                        <UserCircle className="mr-2 h-4 w-4" /> Profil
                      </Button>
                       <Button variant="outline" className="w-full" onClick={handleLogout}>
                         <LogOut className="mr-2 h-4 w-4" /> Keluar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full" asChild onClick={() => {router.push('/login'); setIsMobileMenuOpen(false);}}>
                         <Link href="/login">Masuk</Link>
                      </Button>
                      <Button variant="default" className="w-full" asChild onClick={() => {router.push('/signup'); setIsMobileMenuOpen(false);}}>
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
    

    
