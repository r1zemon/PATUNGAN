
"use client";

import { useState, useEffect, useCallback } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Notification, BillInvitation } from "@/lib/types";
import { getPendingInvitationsAction, respondToBillInvitationAction } from "@/lib/actions";
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
import { Bell, UserPlus, FileText, Info, CircleOff, MailQuestion, Check, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from 'date-fns';
import { id as IndonesianLocale } from 'date-fns/locale';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


interface NotificationBellProps {
  authUser: SupabaseUser | null;
}

export function NotificationBell({ authUser }: NotificationBellProps) {
  const [invitations, setInvitations] = useState<BillInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // participantId
  const { toast } = useToast();
  const router = useRouter();


  const fetchInvitations = useCallback(async () => {
    if (!authUser) {
      setIsLoading(false);
      setInvitations([]);
      return;
    }
    setIsLoading(true);
    const result = await getPendingInvitationsAction();
    if (result.success && result.invitations) {
      setInvitations(result.invitations);
    } else if (result.error) {
      console.error("Failed to fetch notifications:", result.error);
    }
    setIsLoading(false);
  }, [authUser]);

  useEffect(() => {
    if(isOpen) {
        fetchInvitations();
    }
  }, [isOpen, fetchInvitations]);

  const handleResponse = async (invitation: BillInvitation, response: 'accept' | 'decline') => {
    setActionLoading(invitation.participantId);
    const result = await respondToBillInvitationAction(invitation.participantId, response);
    if (result.success) {
      toast({
        title: `Undangan ${response === 'accept' ? 'Diterima' : 'Ditolak'}`,
        description: `Anda berhasil ${response === 'accept' ? 'bergabung dengan' : 'menolak'} tagihan.`,
      });
      
      setInvitations(prev => prev.filter(inv => inv.participantId !== invitation.participantId));
      if (response === 'accept' && invitation.billId) {
        router.push(`/app?billId=${invitation.billId}`);
        setIsOpen(false);
      }
    } else {
      toast({
        variant: 'destructive',
        title: `Gagal ${response === 'accept' ? 'Menerima' : 'Menolak'} Undangan`,
        description: result.error || "Terjadi kesalahan.",
      });
    }
    setActionLoading(null);
  }

  const unreadCount = invitations.length;

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
          <span>Undangan Tagihan</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <DropdownMenuItem disabled className="justify-center">
            <Loader2 className="h-4 w-4 animate-spin mr-2"/>Memuat undangan...
          </DropdownMenuItem>
        ) : invitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <CircleOff className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Tidak Ada Undangan</p>
            <p className="text-sm text-muted-foreground">Anda tidak memiliki undangan tagihan yang pending.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px] sm:max-h-[400px]">
            {invitations.map((invitation) => {
              const isLoadingThis = actionLoading === invitation.participantId;
              return (
                <div key={invitation.participantId} className="p-3 border-b last:border-b-0">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8 mt-0.5 flex-shrink-0">
                        <AvatarFallback><FileText className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">{invitation.inviterName}</span> mengundang Anda ke tagihan <span className="font-semibold text-primary">"{invitation.billName || 'tanpa nama'}"</span>.
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">
                        {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true, locale: IndonesianLocale })}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="outline" onClick={() => handleResponse(invitation, 'decline')} disabled={isLoadingThis}>
                          {isLoadingThis ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4"/>}
                          <span className="ml-1.5">Tolak</span>
                      </Button>
                      <Button size="sm" onClick={() => handleResponse(invitation, 'accept')} disabled={isLoadingThis}>
                           {isLoadingThis ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}
                          <span className="ml-1.5">Terima</span>
                      </Button>
                  </div>
                </div>
              );
            })}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
