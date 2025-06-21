
"use client";

import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

import { getCurrentUserAction, updateUserProfileAction, removeAvatarAction } from "@/lib/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { UserCircle, Save, Edit3, Shield, AlertTriangle, FileImage, Loader2, Phone, AtSign, UserSquare2, Trash2, Crop, Check, X, Undo2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import ReactCrop, { type Crop, centerCrop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import { cn } from "@/lib/utils";
import { LandingHeader } from "@/components/landing-header";
import { Database } from "@/lib/database.types";


type Profile = Database['public']['Tables']['profiles']['Row'];


function dataURLtoFile(dataurl: string, filename: string): File | null {
  const arr = dataurl.split(',');
  if (arr.length < 2) {
    return null;
  }
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch || mimeMatch.length < 2) {
    return null;
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}


export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  
  // Header related states are now managed by LandingHeader
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    phoneNumber: "",
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null); 
  
  const [imgSrcForCropper, setImgSrcForCropper] = useState<string>('');
  const [crop, setCrop] = useState<Crop | undefined>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [showCropperDialog, setShowCropperDialog] = useState(false);
  const [croppedAvatarPreview, setCroppedAvatarPreview] = useState<string | null>(null); 

  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);


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
      const typedProfile = profile as Profile;
      setUserProfile(typedProfile); 
      setFormData({
        fullName: typedProfile.full_name || "",
        username: typedProfile.username || "",
        phoneNumber: typedProfile.phone_number ? String(typedProfile.phone_number) : "",
      });
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
  
  const handleAvatarFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        toast({ variant: "destructive", title: "Jenis File Tidak Valid", description: "Hanya file JPG, PNG, WEBP, GIF yang diizinkan."});
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        return;
      }
      if (file.size > maxSize) {
        toast({ variant: "destructive", title: "Ukuran File Terlalu Besar", description: "Ukuran file maksimal 5MB."});
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        return;
      }
      
      setCrop(undefined); 
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrcForCropper(reader.result?.toString() || '');
        setShowCropperDialog(true);
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = ""; 
      });
      reader.readAsDataURL(file);
      setAvatarFile(null); 
      setCroppedAvatarPreview(null); 
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: imgWidth, naturalHeight: imgHeight } = e.currentTarget;

    if (imgRef.current && imgWidth > 0 && imgHeight > 0) {
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90, 
                },
                1 / 1, 
                imgWidth,
                imgHeight
            ),
            imgWidth,
            imgHeight
        );
        setCrop(initialCrop);
    }
  }

  async function handleConfirmCrop() {
    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    if (!image || !canvas || !completedCrop) {
      toast({ variant: "destructive", title: "Gagal Memotong", description: "Data gambar atau area potong tidak lengkap."});
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast({ variant: "destructive", title: "Gagal Memotong", description: "Tidak dapat mengakses konteks canvas."});
      return;
    }

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;
    
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      completedCrop.width * scaleX, 
      completedCrop.height * scaleY
    );
    
    const base64Image = canvas.toDataURL('image/png'); 
    setCroppedAvatarPreview(base64Image); 

    const croppedFile = dataURLtoFile(base64Image, 'avatar.png');
    if (croppedFile) {
      setAvatarFile(croppedFile); 
    } else {
      toast({ variant: "destructive", title: "Gagal Membuat File", description: "Tidak dapat mengonversi gambar yang dipotong."});
    }
    setShowCropperDialog(false);
  }

  const handleCancelAvatarChanges = () => {
    setCroppedAvatarPreview(null);
    setAvatarFile(null);
    setImgSrcForCropper('');
    if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = "";
    }
    toast({ title: "Perubahan Avatar Dibatalkan", description: "Foto profil kembali ke versi tersimpan."});
  };

  const handleSaveChanges = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!authUser || !userProfile) return;
    setIsSaving(true);

    try {
      const profileUpdates: Partial<Omit<Profile, 'id' | 'email' | 'updated_at'>> = {};
      let hasChanges = false;
      const errorMessages: string[] = [];

      const trimmedFullName = formData.fullName.trim();
      if (!trimmedFullName) {
        toast({ variant: "destructive", title: "Validasi Gagal", description: "Nama lengkap tidak boleh kosong."});
        setIsSaving(false);
        return;
      }
      if (trimmedFullName !== (userProfile.full_name || "")) {
        profileUpdates.full_name = trimmedFullName;
        hasChanges = true;
      }

      const trimmedUsername = formData.username.trim();
      if (!trimmedUsername) {
          toast({ variant: "destructive", title: "Validasi Gagal", description: "Username tidak boleh kosong."});
          setIsSaving(false);
          return;
      }
      if (trimmedUsername !== (userProfile.username || "")) {
        profileUpdates.username = trimmedUsername;
        hasChanges = true;
      }
      
      let processedPhoneNumber: string | null = null;
      if (typeof formData.phoneNumber === 'string' && formData.phoneNumber.trim() !== '') {
          processedPhoneNumber = formData.phoneNumber.trim();
      } else if (typeof formData.phoneNumber === 'string' && formData.phoneNumber.trim() === '' && userProfile.phone_number) {
          processedPhoneNumber = null; 
      }

      if (processedPhoneNumber !== (userProfile.phone_number ? String(userProfile.phone_number) : null)) {
        profileUpdates.phone_number = processedPhoneNumber;
        hasChanges = true;
      }

      if (avatarFile) {
          hasChanges = true; 
      }

      if (!hasChanges) {
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
        const typedUpdatedProfile = updatedProfileData as Profile;
        setUserProfile(prevProfile => ({...(prevProfile || {} as Profile), ...typedUpdatedProfile})); 
        
        setFormData(prev => ({
            ...prev,
            fullName: typedUpdatedProfile.full_name || "",
            username: typedUpdatedProfile.username || "",
            phoneNumber: typedUpdatedProfile.phone_number ? String(typedUpdatedProfile.phone_number) : "",
        }));
        setCroppedAvatarPreview(null); 
        setAvatarFile(null); 
        if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
        
        await getCurrentUserAction(); 
        router.refresh(); 
        
      } else {
        const errorMessagesToShow = Array.isArray(updateError) ? updateError.join('; ') : updateError;
        toast({ variant: "destructive", title: "Gagal Menyimpan", description: errorMessagesToShow || "Tidak dapat memperbarui profil." });
      }
    } catch (e: any) {
        console.error("Client-side unhandled exception in handleSaveChanges:", e);
        toast({ variant: "destructive", title: "Kesalahan Tak Terduga", description: e.message || "Terjadi kesalahan yang tidak terduga pada klien." });
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleRemoveAvatar = async () => {
    if (!authUser || !userProfile || !userProfile.avatar_url) {
        toast({ variant: "destructive", title: "Gagal", description: "Tidak ada foto profil untuk dihapus."});
        return;
    }
    setIsRemovingAvatar(true);
    try {
        const { success, data, error } = await removeAvatarAction(authUser.id);
        if (success) {
            toast({ title: "Foto Profil Dihapus", description: "Foto profil Anda berhasil dihapus." });
            
            const updatedProfile = { ...userProfile, avatar_url: null };
            setUserProfile(updatedProfile);
            setCroppedAvatarPreview(null);
            setAvatarFile(null);
            if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";

            await getCurrentUserAction();
            router.refresh();
        } else {
            toast({ variant: "destructive", title: "Gagal Menghapus Foto", description: error || "Tidak dapat menghapus foto profil." });
        }
    } catch (e:any) {
        console.error("Client-side unhandled exception in handleRemoveAvatar:", e);
        toast({ variant: "destructive", title: "Kesalahan Tak Terduga", description: e.message || "Terjadi kesalahan yang tidak terduga pada klien saat menghapus avatar." });
    } finally {
        setIsRemovingAvatar(false);
    }
  };

  const formAvatarDisplayUrl = croppedAvatarPreview || userProfile?.avatar_url;
  const formDisplayFullName = formData.fullName || formData.username || authUser?.email || "Pengguna";
  const formAvatarDisplayInitial = formDisplayFullName ? formDisplayFullName.substring(0,1).toUpperCase() : "P";

  const hasAvatarChangesPending = croppedAvatarPreview !== null;


  if (isLoadingUser || !authUser || !userProfile) {
    return (
      <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
        <LandingHeader />
        <main className="relative z-10 container mx-auto px-4 py-8 md:px-6 md:py-12 flex-grow">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-foreground">Memuat profil pengguna...</p>
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
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center relative z-[1]">
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
                    <Avatar className="h-24 w-24 rounded-full">
                        <AvatarImage src={formAvatarDisplayUrl || undefined} alt={formDisplayFullName} className="rounded-full" data-ai-hint="user avatar large"/>
                        <AvatarFallback className="text-3xl rounded-full">{formAvatarDisplayInitial}</AvatarFallback>
                    </Avatar>
                    <div className="grid w-full max-w-sm items-center gap-1.5">
                        <Label htmlFor="avatarFile" className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer w-full")}>
                           <FileImage className="mr-2 h-4 w-4" />
                           Ubah Foto Profil
                        </Label>
                        <Input 
                            id="avatarFile" 
                            type="file" 
                            accept="image/jpeg,image/png,image/webp,image/gif" 
                            onChange={handleAvatarFileSelect} 
                            ref={avatarFileInputRef}
                            className="hidden"
                        />
                        <p className="text-xs text-muted-foreground text-center">Pilih file untuk dipotong dan diunggah.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {userProfile.avatar_url && !croppedAvatarPreview && !avatarFile && ( 
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/50"
                                        disabled={isRemovingAvatar || isSaving}
                                    >
                                        {isRemovingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                                        Hapus Foto Tersimpan
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Anda yakin ingin menghapus foto profil tersimpan?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tindakan ini akan menghapus foto profil Anda secara permanen dari server dan database.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleRemoveAvatar} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        Ya, Hapus Foto
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {hasAvatarChangesPending && (
                             <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCancelAvatarChanges}
                                disabled={isSaving || isRemovingAvatar}
                            >
                                <Undo2 className="mr-2 h-4 w-4" /> Batalkan Perubahan Avatar
                            </Button>
                        )}
                    </div>
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
                    <Input id="username" name="username" placeholder="Username unik Anda" value={formData.username} onChange={handleInputChange} required className="pl-10"/>
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
                <Button type="submit" disabled={isSaving || isRemovingAvatar || showCropperDialog} className="w-full sm:w-auto">
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan Akun"}
                </Button>
              </CardFooter>
            </Card>
          </form>

          <canvas ref={previewCanvasRef} style={{ display: 'none', border: '1px solid black', objectFit: 'contain', width: 150, height: 150 }}/>

          <Dialog open={showCropperDialog} onOpenChange={(open) => {
            if (!open) { 
                setImgSrcForCropper(''); 
                if (avatarFileInputRef.current) avatarFileInputRef.current.value = ""; 
            }
            setShowCropperDialog(open);
           }}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center"><Crop className="mr-2"/> Potong Foto Profil</DialogTitle>
                <DialogDescription>
                  Pilih area foto yang ingin Anda jadikan foto profil. Hasilnya akan berbentuk lingkaran.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 flex justify-center items-center overflow-hidden">
                {imgSrcForCropper && (
                  <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    circularCrop
                    minWidth={50}
                    minHeight={50}
                  >
                    <img
                      ref={imgRef}
                      alt="Crop me"
                      src={imgSrcForCropper}
                      onLoad={onImageLoad}
                      style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: 'calc(60vh - 80px)', 
                        objectFit: 'contain',
                      }}
                    />
                  </ReactCrop>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowCropperDialog(false);
                  setImgSrcForCropper('');
                  if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
                }}>
                  <X className="mr-2 h-4 w-4"/> Batal
                </Button>
                <Button onClick={handleConfirmCrop} disabled={!completedCrop || !imgRef.current}>
                  <Check className="mr-2 h-4 w-4"/> Set Foto Profil
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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

      <footer className="relative z-10 mt-auto pt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Patungan. Hak cipta dilindungi.</p>
        <p>Ditenagai oleh Next.js, Shadcn/UI, Genkit, dan Supabase.</p>
      </footer>
    </div>
  );
}
