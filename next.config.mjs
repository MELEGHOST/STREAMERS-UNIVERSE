/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Можно добавить другие настройки позже, если нужно
  // Например, настройки изображений:
  // images: {
  //   remotePatterns: [
  //     {
  //       protocol: 'https',
  //       hostname: 'static-cdn.jtvnw.net',
  //     },
  //     {
  //       protocol: 'https',
  //       // hostname для аватаров Supabase (если будешь хранить их там)
  //       // hostname: 'xxxxxx.supabase.co', 
  //     },
  //   ],
  // },
};

export default nextConfig; 