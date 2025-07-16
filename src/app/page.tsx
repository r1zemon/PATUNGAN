
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LandingHeader } from '@/components/landing-header';
import { Footer } from '@/components/footer';
import { Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getCurrentUserAction } from '@/lib/actions';
import { LandingPageContent } from '@/components/landing-page-content'; // Komponen baru
import { DashboardClient } from '@/components/dashboard/dashboard-client'; // Komponen baru
import { useRouter } from 'next/navigation';
import type { UserProfileBasic } from '@/lib/types';


export default function HomePage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileBasic | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    setIsLoadingUser(true);
    const { user, profile } = await getCurrentUserAction();
    setAuthUser(user);
    setUserProfile(profile);

    // Role-based redirection logic
    if (user && profile?.role === 'admin') {
      router.replace('/admin');
    } else {
      setIsLoadingUser(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <LandingHeader />
      <main className="relative z-[1] flex-grow">
        {isLoadingUser ? (
          <div className="flex flex-col items-center justify-center flex-grow p-4 min-h-[calc(100vh-14rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg text-foreground">Memuat data pengguna...</p>
          </div>
        ) : authUser ? (
          <DashboardClient authUser={authUser} />
        ) : (
          <LandingPageContent />
        )}
      </main>
      <Footer />
    </div>
  );
}
