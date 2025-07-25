
// src/app/login/page.tsx
"use client";

import Link from "next/link";
import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, UserCircle, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { FacebookIcon } from "@/components/icons/facebook-icon";
import { AppleIcon } from "@/components/icons/apple-icon";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { loginUserAction } from "@/lib/actions";
import { LandingHeader } from "@/components/landing-header";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await loginUserAction(formData);

      if (result.success && result.user) {
        toast({
          title: "Login Berhasil!",
          description: "Anda akan diarahkan ke halaman beranda.",
        });
        router.refresh(); 

        // Role-based redirection logic
        if (result.role === 'admin') {
          router.push("/admin");
        } else {
          router.push("/");
        }

      } else {
        toast({
          variant: "destructive",
          title: "Login Gagal",
          description: result.error || "Email atau kata sandi salah.",
        });
      }
    } catch (error) {
      console.error("Login failed unexpectedly:", error);
      toast({
        variant: "destructive",
        title: "Login Gagal",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col min-h-screen bg-background bg-money-pattern bg-[length:120px_auto] before:content-[''] before:absolute before:inset-0 before:bg-white/[.90] before:dark:bg-black/[.90] before:z-0">
      <LandingHeader />
      <div className="relative z-[1] flex flex-col items-center justify-center flex-grow p-4">
        {/* Link "Kembali ke Beranda" dihilangkan karena LandingHeader sudah menyediakan navigasi "Beranda" */}
        <Card className="w-full max-w-md shadow-2xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto bg-muted-foreground/20 rounded-full p-3 w-fit mb-4">
              <UserCircle className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold">Masuk</CardTitle>
            <CardDescription>Masukkan email dan kata sandi Anda untuk masuk.</CardDescription>
          </CardHeader>
          {isClient ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="email" name="email" type="email" placeholder="contoh@email.com" className="pl-10" required/>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      required
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember-me" name="rememberMe" />
                    <Label htmlFor="remember-me" className="text-sm font-normal">Ingat Saya</Label>
                  </div>
                  <Link href="#" className="text-sm text-primary hover:underline">
                    Lupa Kata Sandi?
                  </Link>
                </div>
                <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  {isLoading ? "Memproses..." : "Masuk"}
                </Button>
              </CardContent>
            </form>
          ) : (
            <CardContent className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          )}
          <CardFooter className="flex flex-col space-y-4">
            <p className="text-center text-sm text-muted-foreground pt-4 border-t w-full">
              Belum punya akun?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Daftar di sini
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    
