
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Database } from "@/lib/database.types"

type UserProfile = Database['public']['Tables']['profiles']['Row'];

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null;
}

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  if (!user) {
    return null
  }
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detail Pengguna</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || user.username} />
              <AvatarFallback>{(user.full_name || user.username)?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.full_name}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>
          <div className="mt-6 space-y-2 text-sm">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Phone:</strong> {user.phone_number || '-'}
            </p>
            <p>
              <strong>Status:</strong> <span className="capitalize">{user.status}</span>
            </p>
             <p>
              <strong>Role:</strong> <span className="capitalize">{user.role}</span>
            </p>
             <p>
              <strong>Terdaftar:</strong> {new Date(user.created_at).toLocaleString("id-ID")}
            </p>
             <p>
              <strong>Update Terakhir:</strong> {user.updated_at ? new Date(user.updated_at).toLocaleString("id-ID") : "-"}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
