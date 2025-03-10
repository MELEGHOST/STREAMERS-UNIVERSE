export const metadata = {
  title: 'Настройки пользователя | Streamers Universe',
  description: 'Управление настройками профиля - темы, язык, шрифты и часовой пояс',
};

export default function SettingsLayout({ children }) {
  return (
    <section className="settings-layout">
      {children}
    </section>
  );
} 