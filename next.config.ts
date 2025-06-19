
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        // GANTI BAGIAN INI DENGAN ID PROYEK SUPABASE ANDA
        // Contoh: abcdefghijklmnop.supabase.co
        hostname: '<YOUR_SUPABASE_PROJECT_REF>.supabase.co', 
        port: '',
        pathname: '/storage/v1/object/public/avatars/**', // Sesuaikan jika path bucket atau file berbeda
      }
    ],
  },
};

export default nextConfig;
