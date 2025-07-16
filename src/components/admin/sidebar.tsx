
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, Users, DollarSign, BarChart2, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { logoutUserAction } from "@/lib/actions"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Pengguna", icon: Users },
  { href: "/admin/revenue", label: "Keuntungan", icon: DollarSign },
  {
    href: "/admin/spending-analysis",
    label: "Analisis Pengeluaran",
    icon: BarChart2,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    const { success, error } = await logoutUserAction()
    if (success) {
      toast({ title: "Logout Berhasil" })
      // Force a full page reload to clear all client-side state
      window.location.href = "/login";
    } else {
      toast({ variant: "destructive", title: "Logout Gagal", description: error })
    }
  }

  const renderNavItem = (item: {
    href: string
    label: string
    icon: React.ElementType
  }) => {
    const Icon = item.icon
    const isActive = pathname === item.href
    return (
      <Link
        href={item.href}
        key={item.href}
        className={cn(
          "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100",
          isActive ? "bg-gray-200 text-gray-900" : "text-gray-600"
        )}
      >
        <Icon className="mr-3 h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="hidden md:flex flex-col w-64 bg-white border-r">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-gray-900">Patungan</h1>
        </div>
        <nav className="px-4 space-y-2">{navItems.map(renderNavItem)}</nav>
      </div>
      <div className="p-4 border-t">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:bg-gray-100"
        >
          <LogOut className="mr-3 h-5 w-5" />
          <span>Keluar</span>
        </Button>
      </div>
    </div>
  )
}
