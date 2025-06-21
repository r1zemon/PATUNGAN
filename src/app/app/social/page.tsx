
"use client";

import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { UserProfileBasic, FriendRequestDisplay, FriendDisplay } from "@/lib/types";

import {
  getCurrentUserAction,
  searchUsersAction,
  sendFriendRequestAction,
  getFriendRequestsAction,
  getFriendsAction,
  acceptFriendRequestAction,
  declineOrCancelFriendRequestAction,
  removeFriendAction,
} from "@/lib/actions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, Search, Check, X, MailWarning, MessageSquarePlus, UserSearch, ListFilter, Loader2, EllipsisVertical, UserX, Send, UserCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import { LandingHeader } from "@/components/landing-header";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from '@/lib/supabaseClient'; // Import client-side Supabase

export default function SocialPage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfileBasic[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [friendsList, setFriendsList] = useState<FriendDisplay[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(true);

  const [friendRequests, setFriendRequests] = useState<FriendRequestDisplay[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);

  const { toast } = useToast();
  const router = useRouter();

  const fetchInitialData = useCallback(async (currentUser: SupabaseUser) => {
    setIsLoadingFriends(true);
    setIsLoadingRequests(true);

    const [friendsResult, requestsResult] = await Promise.all([
      getFriendsAction(),
      getFriendRequestsAction()
    ]);

    if (friendsResult.success && friendsResult.friends) {
      setFriendsList(friendsResult.friends);
    } else {
      toast({ variant: "destructive", title: "Gagal Memuat Teman", description: friendsResult.error });
    }
    setIsLoadingFriends(false);

    if (requestsResult.success && requestsResult.requests) {
      setFriendRequests(requestsResult.requests);
    } else {
      toast({ variant: "destructive", title: "Gagal Memuat Permintaan", description: requestsResult.error });
    }
    setIsLoadingRequests(false);
  }, [toast]);


  useEffect(() => {
    const init = async () => {
        setIsLoadingUser(true);
        const { user } = await getCurrentUserAction();
        if (!user) {
            toast({ variant: "destructive", title: "Akses Ditolak", description: "Anda harus login." });
            router.push("/login");
            return;
        }
        setAuthUser(user);
        setIsLoadingUser(false);
        await fetchInitialData(user);
    };
    init();
  }, [router, toast, fetchInitialData]);

  useEffect(() => {
    if (!authUser) return;

    const channel = supabase
      .channel('friend-requests-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'friend_requests',
        },
        (payload) => {
          console.log('Realtime friend_requests change received!', payload);
          
          const record = payload.new || payload.old;
          const isRelevant = record && (
              ('requester_id' in record && record.requester_id === authUser.id) ||
              ('receiver_id' in record && record.receiver_id === authUser.id)
          );

          if (isRelevant) {
            console.log('Change is relevant, refetching data.');
            if (payload.eventType === 'INSERT' && (payload.new as any).receiver_id === authUser.id) {
              toast({ 
                title: "Permintaan Pertemanan Baru", 
                description: "Anda menerima permintaan pertemanan baru. Periksa tab permintaan.",
                duration: 5000 
              });
            } else if (payload.eventType === 'UPDATE') {
               const updatedRecord = payload.new as any;
               if (updatedRecord.status === 'accepted' && updatedRecord.requester_id === authUser.id) {
                 toast({ title: "Pertemanan Diterima", description: "Permintaan pertemanan Anda telah diterima."});
               }
            }
            fetchInitialData(authUser);
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to friend_requests changes!');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Realtime subscription error or timeout:', err);
          toast({variant: "destructive", title: "Koneksi Realtime Gagal", description: "Gagal terhubung untuk pembaruan langsung. Coba segarkan halaman."})
        }
      });

    return () => {
      supabase.removeChannel(channel);
      console.log('Unsubscribed from friend_requests changes.');
    };
  }, [authUser, fetchInitialData, toast]);

  useEffect(() => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchTimer = setTimeout(async () => {
      const result = await searchUsersAction(searchUsername);
      if (result.success && result.users) {
        setSearchResults(result.users);
      } else {
        toast({ variant: "destructive", title: "Pencarian Gagal", description: result.error });
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimer);
  }, [searchUsername, toast]);


  const handleSendFriendRequest = async (receiverId: string) => {
    const result = await sendFriendRequestAction(receiverId);
    if (result.success) {
      toast({ title: "Permintaan Terkirim", description: "Permintaan pertemanan telah dikirim." });
      setSearchResults(prev => prev.filter(u => u.id !== receiverId));
    } else {
      toast({ variant: "destructive", title: "Gagal Mengirim Permintaan", description: result.error });
    }
  };

  const handleAcceptRequest = async (requestId: string, username: string) => {
    const result = await acceptFriendRequestAction(requestId);
    if (result.success) {
      toast({ title: "Permintaan Diterima", description: `Anda sekarang berteman dengan ${username}.` });
      fetchInitialData(authUser!); // Refresh lists
    } else {
      toast({ variant: "destructive", title: "Gagal Menerima", description: result.error });
    }
  };

  const handleDeclineRequest = async (requestId: string, username: string) => {
    const result = await declineOrCancelFriendRequestAction(requestId, 'decline');
    if (result.success) {
      toast({ title: "Permintaan Ditolak", description: `Permintaan dari ${username} ditolak.` });
      fetchInitialData(authUser!); // Refresh lists
    } else {
      toast({ variant: "destructive", title: "Gagal Menolak", description: result.error });
    }
  };

  const handleRemoveFriend = async (friendshipId: string, username: string) => {
    const result = await removeFriendAction(friendshipId);
    if (result.success) {
      toast({ title: "Teman Dihapus", description: `Anda tidak lagi berteman dengan ${username}.` });
      fetchInitialData(authUser!); // Refresh lists
    } else {
      toast({ variant: "destructive", title: "Gagal Menghapus Teman", description: result.error });
    }
  };


  if (isLoadingUser || !authUser) {
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
                {!isLoadingFriends && <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">{friendsList.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2">
                <MailWarning className="h-4 w-4"/> Permintaan
                {!isLoadingRequests && friendRequests.length > 0 && <Badge variant="destructive" className="ml-1 hidden sm:inline-flex">{friendRequests.filter(r => r.status === 'pending').length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="add" className="flex items-center gap-2">
                <UserSearch className="h-4 w-4"/> Tambah Teman
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar Teman ({isLoadingFriends ? "Memuat..." : friendsList.length})</CardTitle>
                  <CardDescription>Orang-orang yang sudah terhubung dengan Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingFriends ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
                    </div>
                  ) : friendsList.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">Anda belum memiliki teman. Cari dan tambahkan teman baru!</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-3">
                        {friendsList.map(friend => (
                          <Card key={friend.id} className="shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex items-center space-x-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={friend.avatar_url || undefined} alt={friend.username || friend.full_name || "F"} data-ai-hint="friend avatar"/>
                                <AvatarFallback>{(friend.full_name || friend.username || "F").substring(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-grow min-w-0">
                                <p className="font-semibold text-foreground truncate">{friend.full_name || friend.username}</p>
                                <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                              </div>
                               <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted/50 h-8 w-8 flex-shrink-0">
                                    <EllipsisVertical className="h-4 w-4"/>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleRemoveFriend(friend.friendshipId, friend.username || friend.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <UserX className="mr-2 h-4 w-4"/> Hapus Teman
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Permintaan Pertemanan ({isLoadingRequests ? "Memuat..." : friendRequests.filter(r => r.status === 'pending').length})</CardTitle>
                  <CardDescription>Permintaan pertemanan yang menunggu persetujuan Anda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingRequests ? (
                     <div className="space-y-3">
                        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
                    </div>
                  ) : friendRequests.filter(r => r.status === 'pending').length === 0 ? (
                     <p className="text-muted-foreground text-center py-4">Tidak ada permintaan pertemanan saat ini.</p>
                  ) : (
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-4 pr-3">
                        {friendRequests.filter(r => r.status === 'pending').map(request => (
                        <Card key={request.requestId} className="shadow-sm">
                            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex items-center space-x-3 flex-grow min-w-0">
                                    <Avatar className="h-12 w-12">
                                    <AvatarImage src={request.avatar_url || undefined} alt={request.username || "R"} data-ai-hint="request sender avatar"/>
                                    <AvatarFallback>{(request.full_name || request.username || "R").substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">{request.full_name || request.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">@{request.username}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true, locale: IndonesianLocale })}
                                    </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2 mt-2 sm:mt-0 flex-shrink-0">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAcceptRequest(request.requestId, request.username || request.id)}>
                                    <UserCheck className="mr-1.5 h-4 w-4" /> Terima
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-500/10 hover:text-red-700" onClick={() => handleDeclineRequest(request.requestId, request.username || request.id)}>
                                    <X className="mr-1.5 h-4 w-4" /> Tolak
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                        ))}
                        </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tambah Teman Baru</CardTitle>
                  <CardDescription>Cari pengguna berdasarkan username atau nama lengkap mereka.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Cari username atau nama..."
                            value={searchUsername}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setSearchUsername(e.target.value);
                            }}
                            className="pl-10"
                        />
                    </div>
                  </div>
                  {isSearching ? (
                    <div className="text-center py-4">
                        <Loader2 className="h-6 w-6 mx-auto animate-spin text-primary mb-2"/>
                        <p className="text-sm text-muted-foreground">Mencari pengguna...</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <ScrollArea className="h-[300px] mt-4">
                        <div className="space-y-3 pr-3">
                        {searchResults.map(user => (
                            <Card key={user.id} className="shadow-sm">
                                <CardContent className="p-3 flex items-center justify-between gap-2">
                                    <div className="flex items-center space-x-3 min-w-0">
                                        <Avatar className="h-10 w-10">
                                        <AvatarImage src={user.avatar_url || undefined} alt={user.username || "U"} data-ai-hint="user search result avatar"/>
                                        <AvatarFallback>{(user.full_name || user.username || "U").substring(0,2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                        <p className="font-semibold text-sm text-foreground truncate">{user.full_name || user.username}</p>
                                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => handleSendFriendRequest(user.id)}>
                                        <Send className="mr-1.5 h-4 w-4"/> Tambah
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                        </div>
                    </ScrollArea>
                  ) : searchUsername.trim() && !isSearching ? (
                    <div className="text-center py-4">
                        <UserSearch className="h-10 w-10 mx-auto text-muted-foreground mb-2"/>
                        <p className="text-sm text-muted-foreground">Tidak ada pengguna ditemukan dengan kueri "{searchUsername}".</p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                        <ListFilter className="h-10 w-10 mx-auto text-muted-foreground mb-2"/>
                        <p className="text-sm text-muted-foreground">Ketik untuk mulai mencari teman.</p>
                    </div>
                  )}
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
