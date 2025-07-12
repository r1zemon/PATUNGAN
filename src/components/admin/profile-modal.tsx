"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    full_name: string
    username: string
    email: string
    phone_number: string
    avatar_url: string
  }
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
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{user.full_name}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Phone:</strong> {user.phone_number}
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
