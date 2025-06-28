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
};

export default nextConfig; 