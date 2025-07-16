import type {Metadata} from 'next';
import { Inter as FontSans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { cn } from '@/lib/utils';

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'Patungan - Split Bills Easily',
  description: 'Patungan is the simple way to split bills among friends. Keep your group spending fair and stress-free!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={cn("min-h-screen bg-background font-sans antialiased", fontSans.variable)} suppressHydrationWarning={true}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
