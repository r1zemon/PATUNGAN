
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { getCurrentUserAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Search, Check, X, MailWarning, MessageSquarePlus, UserSearch, ListFilter, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import { LandingHeader } from "@/components/landing-header";

interface Profile {
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string; 
}

interface DummyUser {
  id: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
}

interface DummyFriendRequest extends DummyUser {
  requestId: string;
  requestedAt: Date;
}

const dummyFriendsData: DummyUser[] = [
  { id: 'friend1', username: 'BudiPintar', fullName: 'Budi Hartono', avatarUrl: 'https://placehold.co/80x80.png?text=BH', isOnline: true },
  { id: 'friend2', username: 'CitraCeria', fullName: 'Citra Melati', avatarUrl: 'https://placehold.co/80x80.png?text=CM', isOnline: false },
  { id: 'friend3', username: 'DewiKreatif', fullName: 'Dewi Lestari', avatarUrl: 'https://placehold.co/80x80.png?text=DL', isOnline: true },
  { id: 'friend4', username: 'AgusGamer', fullName: 'Agus Setiawan', avatarUrl: 'https://placehold.co/80x80.png?text=AS' },
];

const dummyFriendRequestsData: DummyFriendRequest[] = [
  { id: 'reqUser1', requestId: 'req101', username: 'EkoTraveler', fullName: 'Eko Wibowo', avatarUrl: 'https://placehold.co/80x80.png?text=EW', requestedAt: new Date(Date.now() - 1000 * 60 * 30) }, // 30 mins ago
  { id: 'reqUser2', requestId: 'req102', username: 'FitriCoder', fullName: 'Fitriani S.', avatarUrl: 'https://placehold.co/80x80.png?text=FS', requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 3) }, // 3 hours ago
];


export default function SocialPage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  // Profile state no longer needed here
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [searchUsername, setSearchUsername] = useState("");

  const [friendsList, setFriendsList] = useState<DummyUser[]>(dummyFriendsData);
  const [friendRequests, setFriendRequests] = useState<DummyFriendRequest[]>(dummyFriendRequestsData);

  const { toast } = useToast();
  const router = useRouter();

  const fetchUserAndProfile = useCallback(async () => {
    setIsLoadingUser(true);
    const { user, error: userError } = await getCurrentUserAction(); // Removed profile
    
    if (userError || !user) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: userError || "Anda harus login untuk mengakses halaman sosial." });
      router.push("/login");
      return;
    }
    setAuthUser(user);
    setIsLoadingUser(false);
  }, [router, toast]);

  useEffect(() => {
    fetchUserAndProfile();
  }, [fetchUserAndProfile]);

  const handleSendFriendRequest = () => {
    if (!searchUsername.trim()) {
      toast({ variant: "destructive", title: "Username Kosong", description: "Masukkan username yang ingin Anda tambahkan." });
      return;
    }
    toast({ title: "Permintaan Terkirim (Dummy)", description: `Permintaan pertemanan telah dikirim ke ${searchUsername}.` });
    setSearchUsername("");
  };

  const handleAcceptRequest = (requestId: string, username: string) => {
    setFriendRequests(prev => prev.filter(req => req.requestId !== requestId));
    // Add to friends list (dummy)
    const newFriend = dummyFriendRequestsData.find(req => req.requestId === requestId);
    if (newFriend) {
       setFriendsList(prev => [...prev, {id: newFriend.id, username: newFriend.username, fullName: newFriend.fullName, avatarUrl: newFriend.avatarUrl, isOnline: Math.random() > 0.5 }]);
    }
    toast({ title: "Permintaan Diterima (Dummy)", description: `Anda sekarang berteman dengan ${username}.` });
  };
  
  const handleDeclineRequest = (requestId: string, username: string) => {
    setFriendRequests(prev => prev.filter(req => req.requestId !== requestId));
    toast({ title: "Permintaan Ditolak (Dummy)", description: `Permintaan pertemanan dari ${username} telah ditolak.` });
  };

  const handleRemoveFriend = (friendId: string, username: string) => {
    setFriendsList(prev => prev.filter(friend => friend.id !== friendId));
    toast({ title: "Pertemanan Dihapus (Dummy)", description: `Anda telah menghapus ${username} dari daftar teman.` });
  };
  
  if (isLoadingUser || !authUser) { // Removed !userProfile check
    return (
      <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
        <LandingHeader />
        <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-foreground">Memuat halaman sosial...</p>
          </div>
        </main>
         <footer className="relative z-10 mt-auto pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <LandingHeader />
      <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground flex items-center justify-center sm:justify-start">
              <Users className="mr-3 h-8 w-8 text-primary" />
              Jaringan Pertemanan Anda
            </h2>
            <p className="text-muted-foreground mt-1">Kelola daftar teman, permintaan, dan cari teman baru.</p>
          </div>

          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4"/> Teman Saya
                <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">{friendsList.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <MailWarning className="h-4 w-4"/> Permintaan
                {friendRequests.length > 0 && <Badge variant="destructive" className="ml-1 hidden sm:inline-flex">{friendRequests.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="add" className="flex items-center gap-2">
                <UserSearch className="h-4 w-4"/> Tambah Teman
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Teman ({friendsList.length})</CardTitle>
                  <CardDescription>Orang-orang yang sudah terhubung dengan Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {friendsList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Anda belum memiliki teman. Cari dan tambahkan teman baru!</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {friendsList.map(friend => (
                        <Card key={friend.id} className="shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-4 flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={friend.avatarUrl} alt={friend.username} data-ai-hint="friend avatar"/>
                              <AvatarFallback>{friend.username.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow min-w-0">
                              <p className="font-semibold text-foreground truncate">{friend.fullName || friend.username}</p>
                              <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                              {friend.isOnline && <Badge variant="outline" className="mt-1 text-xs border-green-500 text-green-600">Online</Badge>}
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8" onClick={() => handleRemoveFriend(friend.id, friend.username)}>
                                <X className="h-4 w-4"/>
                                <span className="sr-only">Hapus {friend.username}</span>
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Permintaan Pertemanan ({friendRequests.length})</CardTitle>
                  <CardDescription>Permintaan pertemanan yang menunggu persetujuan Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {friendRequests.length === 0 ? (
                     <p className="text-muted-foreground text-center py-4">Tidak ada permintaan pertemanan saat ini.</p>
                  ) : (
                    friendRequests.map(request => (
                      <Card key={request.requestId} className="shadow-sm">
                        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 flex-grow min-w-0">
                                <Avatar className="h-12 w-12">
                                <AvatarImage src={request.avatarUrl} alt={request.username} data-ai-hint="request sender avatar"/>
                                <AvatarFallback>{request.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{request.fullName || request.username}</p>
                                <p className="text-xs text-muted-foreground truncate">@{request.username}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {formatDistanceToNow(request.requestedAt, { addSuffix: true, locale: IndonesianLocale })}
                                </p>
                                </div>
                            </div>
                            <div className="flex space-x-2 mt-2 sm:mt-0 flex-shrink-0">
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-500/10 hover:text-green-700" onClick={() => handleAcceptRequest(request.requestId, request.username)}>
                                <Check className="mr-1.5 h-4 w-4" /> Terima
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-500/10 hover:text-red-700" onClick={() => handleDeclineRequest(request.requestId, request.username)}>
                                <X className="mr-1.5 h-4 w-4" /> Tolak
                                </Button>
                            </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tambah Teman Baru</CardTitle>
                  <CardDescription>Cari pengguna berdasarkan username mereka untuk mengirim permintaan pertemanan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            type="text" 
                            placeholder="Masukkan username teman..." 
                            value={searchUsername}
                            onChange={(e) => setSearchUsername(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button onClick={handleSendFriendRequest} className="w-full sm:w-auto">
                        <MessageSquarePlus className="mr-2 h-4 w-4" /> Kirim Permintaan
                    </Button>
                  </div>
                  {/* Potensial: Tampilkan hasil pencarian di sini nanti */}
                  <div className="text-center py-4">
                      <ListFilter className="h-10 w-10 mx-auto text-muted-foreground mb-2"/>
                      <p className="text-sm text-muted-foreground">Hasil pencarian akan muncul di sini (fitur belum aktif).</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        </div>
      </main>

      <footer className="relative z-10 mt-auto pt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}

    