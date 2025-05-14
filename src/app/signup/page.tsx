// src/app/signup/page.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Mail, Lock, Eye, EyeOff, CalendarDays, Phone, ArrowLeft, UserCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id as IndonesianLocale } from "date-fns/locale";


export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4 selection:bg-primary/40 selection:text-primary-foreground">
      <Link href="/" className="absolute top-4 left-4 flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Beranda
      </Link>
      <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto bg-muted-foreground/20 rounded-full p-3 w-fit mb-4">
            <UserCircle className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Daftar Akun</CardTitle>
          <CardDescription>Buat akun untuk melanjutkan dan mulai berbagi tagihan dengan mudah.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="fullName">Nama Lengkap</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="fullName" placeholder="Nama Lengkap Anda" className="pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="username">Nama Pengguna</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="username" placeholder="Username unik Anda" className="pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="email" type="email" placeholder="contoh@email.com" className="pl-10" />
            </div>
          </div>
           <div className="space-y-1">
            <Label htmlFor="dob">Tanggal Lahir</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={`w-full justify-start text-left font-normal pl-10 ${!dateOfBirth && "text-muted-foreground"}`}
                >
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  {dateOfBirth ? format(dateOfBirth, "PPP", { locale: IndonesianLocale }) : <span>Pilih tanggal lahir</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateOfBirth}
                  onSelect={setDateOfBirth}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={1950}
                  toYear={new Date().getFullYear() - 10} // Must be at least 10 years old
                  locale={IndonesianLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Nomor Telepon</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input id="phone" type="tel" placeholder="08123456789" className="pl-10" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Kata Sandi</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Buat kata sandi yang kuat"
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Ulangi kata sandi Anda"
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full text-lg py-6 mt-2">
            Daftar Akun
          </Button>
        </CardContent>
        <CardFooter>
          <p className="w-full text-center text-sm text-muted-foreground">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk di sini
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
