
"use client";

import { useState, useEffect } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Bell, UserPlus, FileText, Info, CircleOff, MailQuestion } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface NotificationBellProps {
  authUser: SupabaseUser | null;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "friend_request",
    title: "Permintaan Teman Baru",
    description: "Budi mengirimi Anda permintaan pertemanan.",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    read: false,
    icon: UserPlus,
    sender: { name: "Budi", avatarUrl: "https://placehold.co/40x40.png?text=B" },
  },
  {
    id: "2",
    type: "bill_invite",
    title: "Undangan Tagihan",
    description: "Anda diundang ke tagihan 'Makan Malam Tim'.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
    icon: FileText,
    link: "/app", // Example link
  },
  {
    id: "3",
    type: "info",
    title: "Fitur Baru!",
    description: "Sekarang Anda dapat menjadwalkan tagihan untuk nanti.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: true,
    icon: Info,
  },
];


export function NotificationBell({ authUser }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching notifications
    if (authUser) {
      setIsLoading(true);
      setTimeout(() => {
        setNotifications(mockNotifications); // Use mock data
        setIsLoading(false);
      }, 500);
    } else {
      setNotifications([]);
      setIsLoading(false);
    }
  }, [authUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read (locally for now)
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );
    // If there's a link, navigate or show toast
    if (notification.link) {
      // router.push(notification.link); // Would need useRouter
      toast({ title: "Navigasi", description: `Mengarahkan ke: ${notification.title}`});
    } else {
      toast({ title: notification.title, description: notification.description || "Notifikasi dilihat."});
    }
    // setIsOpen(false); // Optionally close dropdown on click
  };
  
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({ title: "Notifikasi", description: "Semua notifikasi telah ditandai sebagai dibaca." });
  };

  const getIconForType = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request': return UserPlus;
      case 'bill_invite': return FileText;
      case 'info': return Info;
      default: return MailQuestion;
    }
  };


  if (!authUser) {
    return null; // Don't show the bell if user is not logged in
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 min-w-[1.25rem] p-0 flex items-center justify-center rounded-full text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Buka notifikasi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifikasi</span>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleMarkAllAsRead}>
              Tandai semua dibaca
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled className="justify-center">Memuat notifikasi...</DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CircleOff className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Tidak Ada Notifikasi</p>
            <p className="text-sm text-muted-foreground">Anda belum memiliki notifikasi baru.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] sm:max-h-[400px]">
            {notifications.map((notification) => {
              const IconComponent = notification.icon || getIconForType(notification.type);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-muted/50 ${!notification.read ? "bg-primary/5" : ""}`}
                >
                  {notification.sender?.avatarUrl || IconComponent ? (
                     <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                       {notification.sender?.avatarUrl ? (
                         <AvatarImage src={notification.sender.avatarUrl} alt={notification.sender.name} data-ai-hint="sender avatar"/>
                       ) : (
                         IconComponent && <div className="flex items-center justify-center h-full w-full bg-muted rounded-full"><IconComponent className="h-4 w-4 text-muted-foreground" /></div>
                       )}
                       <AvatarFallback>
                         {notification.sender ? notification.sender.name.substring(0,1) : <IconComponent className="h-4 w-4" />}
                       </AvatarFallback>
                     </Avatar>
                  ) : <div className="w-8 h-8 flex-shrink-0"></div>}
                  <div className="flex-grow min-w-0">
                    <p className={`text-sm font-medium text-foreground truncate ${!notification.read ? "font-semibold" : ""}`}>
                      {notification.title}
                    </p>
                    {notification.description && (
                      <p className="text-xs text-muted-foreground truncate group-hover:text-foreground/80">
                        {notification.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/80 mt-0.5">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: IndonesianLocale })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="h-2.5 w-2.5 bg-primary rounded-full self-center flex-shrink-0 ml-2" title="Belum dibaca"></div>
                  )}
                </DropdownMenuItem>
              );
            })}
          </ScrollArea>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => toast({title: "Info", description: "Halaman semua notifikasi belum tersedia."})}
          className="justify-center text-sm text-primary hover:underline"
        >
          Lihat Semua Notifikasi
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
