import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Patungan - Bill Splitting App',
  description: 'Scan receipts and split bills easily with your friends.',
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
