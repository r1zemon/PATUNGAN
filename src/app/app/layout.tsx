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


export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Note: To apply historyPageMetadata, you'd typically do it
  // on the history page itself if using generateMetadata.
  // Here, it's just exported for potential use elsewhere or if structure changes.
  return <>{children}</>;
}
