import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <header>Добро пожаловать!</header>
          <main>{children}</main>
        </div>
      ) : (
        <div>Пожалуйста, авторизуйтесь</div>
      )}
    </div>
  );
}
