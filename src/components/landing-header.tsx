
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, LogOut, UserCircle, Settings, FilePlus, Home, Users, ListChecks } from 'lucide-react'; // Added ListChecks for Riwayat
import { useEffect, useState, useCallback } from 'react';
import { getCurrentUserAction, logoutUserAction } from '@/lib/actions';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
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
import { NotificationBell } from './notification-bell';

interface Profile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
}

// Updated navLinks
const navLinks = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/app/history', label: 'Riwayat', icon: ListChecks },
  { href: '/app/social', label: 'Teman', icon: Users }, // Replaced Kontak with Teman
];

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

  // This function handles the "Teman" link/button click from both main nav and dropdown
  const handleFriendsNavigation = () => {
    setIsMobileMenuOpen(false);
    if (authUser) {
      // router.push('/app/social'); // Future navigation
      toast({title: "Segera Hadir", description: "Fitur Teman & Sosial belum diimplementasikan."});
    } else {
      toast({title: "Akses Ditolak", description: "Anda harus login untuk mengakses fitur sosial.", duration: 3000});
      router.push('/login');
    }
  };


  const handleNavLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault(); // Prevent default for all nav links handled here
    setIsMobileMenuOpen(false);

    if (href === '/') {
      if (pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        router.push('/');
      }
    } else if (href === '/app/history') {
      handleHistoryClick();
    } else if (href === '/app/profile') { // Though profile is not in main nav, good to keep if used elsewhere
      handleProfileClick();
    } else if (href === '/app/social') { // Handling "Teman" link
      handleFriendsNavigation();
    }
    // Removed #contact handling
    else {
      // For any other unhandled links (if any were added to navLinks)
      if (href.startsWith('#')) {
        // Handle hash links if needed, or let default behavior by not preventing default
      } else {
        router.push(href);
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background shadow-sm">
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

        <div className="hidden md:flex items-center space-x-2">
          {isLoadingUser ? (
             <Button variant="ghost" disabled size="sm">Memuat...</Button>
          ) : authUser ? (
            <>
              <NotificationBell authUser={authUser} />
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
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleFriendsNavigation}> 
                    <Users className="mr-2 h-4 w-4" />
                    <span>Teman</span>
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

        <div className="md:hidden flex items-center gap-2">
          {authUser && <NotificationBell authUser={authUser} />}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6 text-foreground" />
                <span className="sr-only">Buka menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-background p-0">
              <SheetHeader className="p-4 pb-2 text-left border-b">
                 <SheetTitle className="flex items-center gap-2">
                   <Image src="/logo.png" alt="Patungan Logo" width={32} height={32} className="rounded-lg" data-ai-hint="logo company"/>
                   <span className="text-lg font-bold text-foreground">Patungan Menu</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-1 p-4 pt-2">
                {navLinks.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="text-base font-medium text-foreground hover:text-primary transition-colors flex items-center py-3 px-2 rounded-md hover:bg-muted"
                       onClick={(e) => handleNavLinkClick(e, link.href)}
                    >
                      <IconComponent className="inline-block mr-3 h-5 w-5 opacity-80" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="border-t border-border pt-4 mt-2 space-y-3">
                  {isLoadingUser ? (
                     <Button variant="outline" className="w-full justify-start py-6" disabled>
                       <UserCircle className="mr-3 h-5 w-5 opacity-80" />Memuat...
                     </Button>
                  ) : authUser ? (
                    <>
                      <div className="flex items-center gap-3 mb-2 px-2 py-2 border rounded-md bg-muted/30">
                        <Avatar className="h-10 w-10">
                           <AvatarImage src={userProfile?.avatar_url || undefined} alt={displayName} data-ai-hint="profile avatar" />
                           <AvatarFallback>{avatarInitial}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{userProfile?.full_name || displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">{authUser.email}</p>
                        </div>
                      </div>
                      <Button variant="default" className="w-full justify-start py-6 text-base" asChild onClick={() => {router.push('/app'); setIsMobileMenuOpen(false);}}>
                         <Link href="/app"><FilePlus className="mr-3 h-5 w-5 opacity-80"/> Tagihan Baru</Link>
                      </Button>
                      <Button variant="outline" className="w-full justify-start py-6 text-base" onClick={handleProfileClick}>
                        <UserCircle className="mr-3 h-5 w-5 opacity-80" /> Profil Akun
                      </Button>
                      {/* "Teman" is already in main navLinks, so no need to repeat here unless desired for logged-in specific access in mobile */}
                       <Button variant="outline" className="w-full justify-start py-6 text-base" onClick={handleLogout}>
                         <LogOut className="mr-3 h-5 w-5 opacity-80" /> Keluar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" className="w-full justify-start py-6 text-base" asChild onClick={() => {router.push('/login'); setIsMobileMenuOpen(false);}}>
                         <Link href="/login"><UserCircle className="mr-3 h-5 w-5 opacity-80"/>Masuk</Link>
                      </Button>
                      <Button variant="default" className="w-full justify-start py-6 text-base" asChild onClick={() => {router.push('/signup'); setIsMobileMenuOpen(false);}}>
                         <Link href="/signup"><FilePlus className="mr-3 h-5 w-5 opacity-80"/>Daftar Akun</Link>
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
