"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Users,
  UserCheck,
  UserPlus,
  Users2,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Ban,
  MoreHorizontal,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UserGrowthChart } from "@/components/user-growth-chart"
import { UserActivityChart } from "@/components/user-activity-chart"
import { UserStatusChart } from "@/components/user-status-chart"
import { getAllUsersAction } from "@/lib/actions"
import { ProfileModal } from "@/components/admin/profile-modal"

const userMetrics = [
  {
    title: "Total Pengguna",
    value: "247",
    change: "+12.5%",
    icon: Users,
    description: "Semua akun terdaftar",
  },
  {
    title: "Pengguna Aktif",
    value: "165",
    change: "+8.2%",
    icon: UserCheck,
    description: "Aktif 30 hari terakhir",
  },
  {
    title: "Pengguna Baru",
    value: "23",
    change: "+15.8%",
    icon: UserPlus,
    description: "Minggu ini",
  },
  {
    title: "Total Grup Dibuat",
    value: "89",
    change: "+22.1%",
    icon: Users2,
    description: "Sesi patungan dibuat",
  },
]

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-800">Aktif</Badge>
    case "pending":
      return <Badge className="bg-gray-200 text-gray-800">Belum Verifikasi</Badge>
    case "blocked":
      return <Badge className="bg-red-100 text-red-800">Diblokir</Badge>
    default:
      return <Badge>Unknown</Badge>
  }
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true)
      const res = await getAllUsersAction()
      if (res.success && res.users) {
        setUsers(res.users)
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      (user.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleExportData = () => {
    console.log("Exporting user data...")
  }

  const handleShowDetail = (user: any) => {
    setSelectedUser(user)
    setModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <ProfileModal isOpen={modalOpen} onClose={() => setModalOpen(false)} user={{
        full_name: selectedUser?.full_name,
        username: selectedUser?.username,
        email: selectedUser?.email || '-',
        phone_number: selectedUser?.phone_number || '-',
        avatar_url: selectedUser?.avatar_url
      }} />
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-800">Daftar Pengguna</CardTitle>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Cari nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white text-slate-800 border border-slate-300 placeholder:text-slate-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-white text-slate-800 border border-slate-300">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="pending">Belum Verifikasi</SelectItem>
                <SelectItem value="blocked">Diblokir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-slate-500">Memuat data pengguna...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-slate-800">Pengguna</TableHead>
                  <TableHead className="text-slate-800">ID</TableHead>
                  <TableHead className="text-slate-800">Terakhir Update</TableHead>
                  <TableHead className="text-slate-800">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-[#FAFAF9] hover:text-slate-800"
                  >
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.full_name || user.username || "-"} />
                          <AvatarFallback>{(user.full_name || user.username || "-").charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-800">{user.full_name || user.username || "-"}</p>
                          <p className="text-sm text-slate-500">{user.username ? `@${user.username}` : "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{user.id}</TableCell>
                    <TableCell>{user.updated_at ? new Date(user.updated_at).toLocaleString("id-ID") : "-"}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleShowDetail(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Pengguna
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-white-600">
                            <Ban className="mr-2 h-4 w-4" />
                            Block/Unblock Pengguna
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end mt-4">
        <Button onClick={handleExportData} className="flex items-center gap-2 bg-gray-100 text-gray-900 border border-gray-300 hover:bg-gray-200">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>
    </div>
  )
} 