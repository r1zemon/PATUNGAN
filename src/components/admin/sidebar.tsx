"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, DollarSign, BarChart2, Settings, LifeBuoy } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/revenue", label: "Revenue", icon: DollarSign },
  {
    href: "/admin/spending-analysis",
    label: "Spending Analysis",
    icon: BarChart2,
  },
]

const bottomNavItems = [
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
]

export function Sidebar() {
  const pathname = usePathname()

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
        <nav className="space-y-2">{bottomNavItems.map(renderNavItem)}</nav>
      </div>
    </div>
  )
}
