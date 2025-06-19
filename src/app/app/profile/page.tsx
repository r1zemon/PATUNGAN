
"use client";

import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { getCurrentUserAction, logoutUserAction, updateUserProfileAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Home, LogOut, Settings, UserCircle, Save, Edit3, Shield, BarChart2, Bell, AlertTriangle, FileImage, Loader2, History as HistoryIconLucide, Phone, AtSign, UserSquare2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    phoneNumber: "",
    avatarUrl: "", // For manual URL input
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null); // For form preview only


  const { toast } = useToast();
  const router = useRouter();

  const fetchUserAndProfile = useCallback(async () => {
    setIsLoadingUser(true);
    const { user, profile, error: userError } = await getCurrentUserAction();
    
    if (userError || !user) {
      toast({ variant: "destructive", title: "Akses Ditolak", description: userError || "Anda harus login untuk melihat profil." });
      router.push("/login");
      return;
    }

    setAuthUser(user);
    if (profile) {
      setUserProfile(profile as Profile); 
      setFormData({
        fullName: profile.full_name || "",
        username: profile.username || "",
        phoneNumber: profile.phone_number || "",
        avatarUrl: profile.avatar_url || "", 
      });
      setAvatarPreview(profile.avatar_url || null); // Set initial form preview from DB
    }
    setIsLoadingUser(false);
  }, [router, toast]);

  useEffect(() => {
    fetchUserAndProfile();
  }, [fetchUserAndProfile]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast({ variant: "destructive", title: "Jenis File Tidak Valid", description: "Hanya file JPG, PNG, WEBP, GIF yang diizinkan."});
        setAvatarFile(null); 
        if (e.target) e.target.value = ""; 
        return;
      }
      if (file.size > maxSize) {
        toast({ variant: "destructive", title: "Ukuran File Terlalu Besar", description: "Ukuran file maksimal 5MB."});
        setAvatarFile(null); 
        if (e.target) e.target.value = ""; 
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string); // Update only form preview
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarFile(null);
      // If file selection is cleared, revert form preview to DB avatar_url or initial if no DB URL
      setAvatarPreview(userProfile?.avatar_url || null);
    }
  };


  const handleSaveChanges = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!authUser || !userProfile) return;
    setIsSaving(true);

    const profileUpdates: Partial<Profile> = {};
    let hasChanges = false;

    const trimmedFullName = formData.fullName.trim();
    if (trimmedFullName && trimmedFullName !== (userProfile.full_name || "")) {
      profileUpdates.full_name = trimmedFullName;
      hasChanges = true;
    } else if (!trimmedFullName && userProfile.full_name) { 
      profileUpdates.full_name = null; 
      hasChanges = true;
    }
    if (!trimmedFullName) {
       toast({ variant: "destructive", title: "Validasi Gagal", description: "Nama lengkap tidak boleh kosong."});
       setIsSaving(false);
       return;
    }

    const trimmedUsername = formData.username.trim();
     if (trimmedUsername && trimmedUsername !== (userProfile.username || "")) {
      profileUpdates.username = trimmedUsername;
      hasChanges = true;
    } else if (!trimmedUsername && userProfile.username) {
       profileUpdates.username = null;
       hasChanges = true;
    }
     if (!trimmedUsername) {
        toast({ variant: "destructive", title: "Validasi Gagal", description: "Username tidak boleh kosong."});
        setIsSaving(false);
        return;
    }
    
    let processedPhoneNumber: string | null = null;
    if (typeof formData.phoneNumber === 'string' && formData.phoneNumber.trim() !== '') {
        processedPhoneNumber = formData.phoneNumber.trim();
    } else if (typeof formData.phoneNumber === 'string' && formData.phoneNumber.trim() === '' && userProfile.phone_number) {
        // User cleared the phone number
        processedPhoneNumber = null;
    }


    if (processedPhoneNumber !== (userProfile.phone_number || null)) {
      profileUpdates.phone_number = processedPhoneNumber;
      hasChanges = true;
    }

    if (!avatarFile && formData.avatarUrl.trim() !== (userProfile.avatar_url || "")) {
        profileUpdates.avatar_url = formData.avatarUrl.trim() || null; 
        hasChanges = true;
    } else if (avatarFile) {
        hasChanges = true; 
    }


    if (!hasChanges && !avatarFile) {
        toast({ title: "Tidak Ada Perubahan", description: "Tidak ada informasi yang diubah untuk disimpan." });
        setIsSaving(false);
        return;
    }
    
    const { success, data: updatedProfileData, error: updateError } = await updateUserProfileAction(
        authUser.id, 
        profileUpdates,
        avatarFile 
    );

    if (success && updatedProfileData) {
      toast({ title: "Profil Diperbarui", description: "Informasi akun Anda berhasil disimpan." });
      // Update userProfile state with the newly saved data. This will update the header avatar.
      setUserProfile(prevProfile => ({...(prevProfile || {}), ...updatedProfileData} as Profile) ); 
      
      // Update formData to reflect saved data
      setFormData(prev => ({
          ...prev,
          fullName: updatedProfileData.full_name || "",
          username: updatedProfileData.username || "",
          phoneNumber: updatedProfileData.phone_number || "",
          avatarUrl: updatedProfileData.avatar_url || "", 
      }));
      // Reset form's avatar preview to the saved one
      setAvatarPreview(updatedProfileData.avatar_url || null);
      setAvatarFile(null); 
      if (document.getElementById('avatarFile')) {
        (document.getElementById('avatarFile') as HTMLInputElement).value = ""; 
      }
      router.refresh(); 
    } else {
      const errorMessages = Array.isArray(updateError) ? updateError.join('; ') : updateError;
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: errorMessages || "Tidak dapat memperbarui profil." });
    }
    setIsSaving(false);
  };
  
  const handleLogout = async () => {
    const { success, error: logoutErr } = await logoutUserAction();
    if (success) {
      toast({ title: "Logout Berhasil" });
      router.push("/"); 
    } else {
      toast({ variant: "destructive", title: "Logout Gagal", description: logoutErr });
    }
  };
  
  // For header avatar - uses the saved userProfile state
  const headerDisplayName = userProfile?.full_name || userProfile?.username || authUser?.email || "Pengguna";
  const headerAvatarInitial = headerDisplayName ? headerDisplayName.substring(0,1).toUpperCase() : "P";
  const headerAvatarUrl = userProfile?.avatar_url;

  // For form preview avatar - uses avatarPreview state
  const formPreviewDisplayName = formData.fullName || formData.username || authUser?.email || "Pengguna";
  const formPreviewAvatarInitial = formPreviewDisplayName ? formPreviewDisplayName.substring(0,1).toUpperCase() : "P";


  if (isLoadingUser || !authUser || !userProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/10 to-background p-4">
        <header className="relative z-[1] py-4 px-4 sm:px-6 md:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-md">
          <div className="container mx-auto flex items-center justify-between h-20"> 
            <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <Image src="/logo.png" alt="Patungan Logo" width={56} height={56} className="rounded-lg shadow-sm" data-ai-hint="logo company"/>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Patungan</h1>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
               <Skeleton className="h-9 w-28 hidden sm:block" />
               <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </header>
        <main className="relative z-[1] container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-foreground">Memuat profil pengguna...</p>
          </div>
        </main>
         <footer className="relative z-[1] mt-auto pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-secondary/10 to-background">
      <header className="relative z-[1] py-4 px-4 sm:px-6 md:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-20"> 
          <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <Image src="/logo.png" alt="Patungan Logo" width={56} height={56} className="rounded-lg shadow-sm" data-ai-hint="logo company"/>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Patungan
            </h1>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" passHref> {/* Changed from /app to / */}
              <Button variant="ghost" size="icon" aria-label="Kembali ke Beranda">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={headerAvatarUrl || `https://placehold.co/40x40.png?text=${headerAvatarInitial}`} alt={headerDisplayName} data-ai-hint="profile avatar"/>
                    <AvatarFallback>{headerAvatarInitial}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.full_name || headerDisplayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {authUser.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/app/history')}>
                  <HistoryIconLucide className="mr-2 h-4 w-4" />
                  <span>Riwayat Tagihan</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/app/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast({title: "Info", description: "Pengaturan belum diimplementasikan."})}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Pengaturan</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground flex items-center justify-center">
              <UserSquare2 className="mr-3 h-8 w-8 text-primary" />
              Profil Pengguna
            </h2>
            <p className="text-muted-foreground mt-1">Kelola informasi akun dan preferensi Anda.</p>
          </div>

          <form onSubmit={handleSaveChanges}>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center"><Edit3 className="mr-2 h-5 w-5 text-primary"/> Informasi Akun</CardTitle>
                <CardDescription>Perbarui detail pribadi Anda. Email tidak dapat diubah.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-3">
                    <Avatar className="h-24 w-24">
                        {/* Avatar for form preview uses avatarPreview state */}
                        <AvatarImage src={avatarPreview || `https://placehold.co/96x96.png?text=${formPreviewAvatarInitial}`} alt={formData.fullName || formPreviewDisplayName} data-ai-hint="user avatar large"/>
                        <AvatarFallback className="text-3xl">{formPreviewAvatarInitial}</AvatarFallback>
                    </Avatar>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="avatarFile">Ubah Foto Profil (Opsional)</Label>
                        <Input id="avatarFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarFileChange} />
                        <p className="text-xs text-muted-foreground">Pilih file untuk diunggah, atau masukkan URL di bawah.</p>
                    </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatarUrl">URL Foto Profil (Alternatif)</Label>
                  <div className="relative">
                    <FileImage className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="avatarUrl" name="avatarUrl" type="url" placeholder="https://example.com/avatar.png" value={formData.avatarUrl} onChange={handleInputChange} className="pl-10"/>
                  </div>
                   <p className="text-xs text-muted-foreground">Jika Anda tidak mengunggah file, URL ini akan digunakan.</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nama Lengkap</Label>
                   <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="fullName" name="fullName" placeholder="Nama Lengkap Anda" value={formData.fullName} onChange={handleInputChange} required className="pl-10"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="username" name="username" placeholder="Username Anda" value={formData.username} onChange={handleInputChange} required className="pl-10"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Tidak Dapat Diubah)</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="email" type="email" value={authUser.email || ""} disabled className="pl-10"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Nomor Telepon (Opsional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="08123456789" value={formData.phoneNumber} onChange={handleInputChange} className="pl-10"/>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan Akun"}
                </Button>
              </CardFooter>
            </Card>
          </form>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-primary"/> Ringkasan Finansial</CardTitle>
              <CardDescription>Statistik penggunaan aplikasi Patungan Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Total Pengeluaran Bulan Ini:</h4>
                <p className="text-muted-foreground">Segera hadir! (Fitur grafik pengeluaran bulanan sedang dikembangkan).</p>
              </div>
              <div>
                <h4 className="font-medium">Total Tagihan Dibuat:</h4>
                <p className="text-muted-foreground">Segera hadir! (Jumlah tagihan yang pernah Anda inisiasi).</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary"/> Keamanan Akun</CardTitle>
              <CardDescription>Kelola pengaturan keamanan akun Anda.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => toast({title: "Info", description: "Fitur ubah kata sandi belum diimplementasikan."})} className="w-full sm:w-auto">
                Ubah Kata Sandi
              </Button>
            </CardContent>
          </Card>
          
          <Separator />

          <Card className="shadow-lg border-destructive/50">
             <CardHeader>
                <CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5"/> Zona Berbahaya</CardTitle>
             </CardHeader>
             <CardContent>
                <Button variant="destructive" onClick={() => toast({title: "Info", description: "Fitur hapus akun belum diimplementasikan."})} className="w-full sm:w-auto">
                    Hapus Akun Saya
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Tindakan ini tidak dapat diurungkan. Semua data Anda akan dihapus secara permanen.</p>
             </CardContent>
          </Card>

        </div>
      </main>

      <footer className="mt-auto pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}
    

    