
"use client"

import { useState, useEffect, FormEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { adminCreateUserAction, adminUpdateUserAction } from "@/lib/actions"
import type { Database } from "@/lib/database.types"
import { Loader2 } from "lucide-react"

type UserProfile = Database['public']['Tables']['profiles']['Row'];

interface UserFormModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null
  onSave: () => void
}

export function UserFormModal({ isOpen, onClose, user, onSave }: UserFormModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const isEditMode = !!user

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    
    const result = isEditMode
      ? await adminUpdateUserAction(user.id, formData)
      : await adminCreateUserAction(formData)

    if (result.success) {
      toast({ title: `Pengguna berhasil ${isEditMode ? 'diperbarui' : 'dibuat'}.` })
      onSave()
    } else {
      toast({ variant: "destructive", title: "Operasi Gagal", description: result.error })
    }
    setIsLoading(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Perbarui detail untuk pengguna ini.' : 'Isi formulir untuk membuat akun pengguna baru.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Nama Lengkap
              </Label>
              <Input id="fullName" name="fullName" defaultValue={user?.full_name || ''} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input id="username" name="username" defaultValue={user?.username || ''} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input id="email" name="email" type="email" defaultValue={user?.email || ''} className="col-span-3" required disabled={isEditMode} />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                No. Telepon
              </Label>
              <Input id="phoneNumber" name="phoneNumber" defaultValue={user?.phone_number || ''} className="col-span-3" />
            </div>
            {!isEditMode && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input id="password" name="password" type="password" className="col-span-3" required />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
