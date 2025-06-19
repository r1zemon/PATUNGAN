
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patungan - Aplikasi Pembagi Tagihan',
  description: 'Pindai struk dan bagi tagihan dengan mudah bersama teman-teman Anda.',
};

// Separate metadata for history page
export const historyPageMetadata: Metadata = {
  title: 'Riwayat Tagihan - Patungan',
  description: 'Lihat riwayat tagihan yang telah Anda buat sebelumnya.',
};

// Separate metadata for social page
export const socialPageMetadata: Metadata = {
  title: 'Teman - Patungan',
  description: 'Kelola daftar teman Anda dan temukan teman baru.',
};


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

    