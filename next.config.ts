
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
        hostname: 'fehsxporwyhbdpmnxwgh.supabase.co', 
        port: '',
        // Pathname now reflects bucket 'avatars' and internal path 'public/avatars/...'
        pathname: '/storage/v1/object/public/avatars/public/avatars/**', 
      }
    ],
  },
};

export default nextConfig;

