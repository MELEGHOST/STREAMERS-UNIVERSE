/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
        // Можно добавить pathname: '/jtv_user_pictures/**', если нужно точнее
      },
      // Можно добавить сюда хост Supabase, если будешь хранить аватары там
      // {
      //   protocol: 'https',
      //   hostname: 'xxxxxx.supabase.co',
      // },
    ],
  },
  // Явно указываем переменные окружения для Edge Runtime
  env: {
    NEXT_PUBLIC_bd_SUPABASE_URL: process.env.NEXT_PUBLIC_bd_SUPABASE_URL,
    NEXT_PUBLIC_bd_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_bd_SUPABASE_ANON_KEY,
  },
};

export default nextConfig; 