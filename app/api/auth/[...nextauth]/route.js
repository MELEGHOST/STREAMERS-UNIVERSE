import NextAuth from 'next-auth';
import TwitchProvider from 'next-auth/providers/twitch';

const handler = NextAuth({
  providers: [
    TwitchProvider({
      clientId: process.env.TWITCH_CLIENT_ID || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
      clientSecret: process.env.TWITCH_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'user:read:email user:read:follows channel:read:subscriptions offline_access',
          force_verify: true
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Сохраняем токены доступа и обновления в JWT
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        
        if (profile) {
          token.profile = profile;
        }
      }
      
      // Проверяем, не истек ли токен
      if (token.expiresAt && Date.now() > token.expiresAt * 1000 - 5 * 60 * 1000) {
        try {
          // Обновляем токен
          const response = await fetch('https://id.twitch.tv/oauth2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.TWITCH_CLIENT_ID || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID,
              client_secret: process.env.TWITCH_CLIENT_SECRET,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Обновляем токены в JWT
            token.accessToken = data.access_token;
            token.refreshToken = data.refresh_token || token.refreshToken;
            token.expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
          } else {
            // Если не удалось обновить токен, очищаем его
            console.error('Ошибка при обновлении токена в NextAuth:', await response.text());
            delete token.accessToken;
            delete token.refreshToken;
            delete token.expiresAt;
          }
        } catch (error) {
          console.error('Ошибка при обновлении токена в NextAuth:', error);
          // В случае ошибки сохраняем текущий токен
        }
      }
      
      return token;
    },
    
    async session({ session, token }) {
      // Добавляем токены в сессию
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;
      
      // Добавляем данные профиля в сессию
      if (token.profile) {
        session.user = {
          ...session.user,
          id: token.profile.id,
          login: token.profile.login,
          profile_image_url: token.profile.profile_image_url || token.profile.image,
        };
      }
      
      return session;
    },
    
    async signIn({ account, profile }) {
      // Проверяем, что получены все необходимые данные
      if (!account || !profile) {
        console.error('Ошибка при входе: отсутствуют данные аккаунта или профиля');
        return false;
      }
      
      // Проверяем, что получены токены
      if (!account.access_token || !account.refresh_token) {
        console.error('Ошибка при входе: отсутствуют токены доступа или обновления');
        return false;
      }
      
      return true;
    }
  },
  pages: {
    signIn: '/auth',
    signOut: '/auth',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  debug: process.env.NODE_ENV !== 'production',
});

export { handler as GET, handler as POST }; 