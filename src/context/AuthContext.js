"use client";

const React = require('react');
const { useSession, signOut } = require('next-auth/react');
const { useRouter } = require('next/router');

const AuthContext = React.createContext();

function AuthProvider({ children }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (status === 'loading') return;
    if (session) {
      setUser(session.user);
      setIsAuthenticated(true);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setLoading(false);
  }, [session, status]);

  const loginWithTwitch = async () => {
    try {
      await signIn('twitch', { callbackUrl: '/profile' });
    } catch (error) {
      console.error('Ошибка входа через Twitch:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut({ redirect: true, callbackUrl: '/auth' });
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    loginWithTwitch,
    logout,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

module.exports = {
  AuthProvider,
  useAuth: () => {
    const context = React.useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    console.log('useAuth: Context value - isAuthenticated:', context.isAuthenticated);
    return context;
  }
};
