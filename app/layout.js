import '../styles/globals.css';
import ClientProviders from './components/ClientProviders';
import StyledComponentsRegistry from './lib/StyledComponentsRegistry';
import TransitionProvider from './components/TransitionProvider';
import { Roboto, Open_Sans, Montserrat, Lato, Oswald } from 'next/font/google';

// Загружаем все доступные шрифты
const roboto = Roboto({ 
  weight: ['300', '400', '500', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-roboto',
  display: 'swap',
});

const openSans = Open_Sans({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-open-sans',
  display: 'swap',
});

const montserrat = Montserrat({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-montserrat',
  display: 'swap',
});

const lato = Lato({ 
  weight: ['300', '400', '700'],
  subsets: ['latin'],
  variable: '--font-lato',
  display: 'swap',
});

const oswald = Oswald({ 
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin', 'cyrillic'],
  variable: '--font-oswald',
  display: 'swap',
});

export const metadata = {
  title: 'Streamers Universe',
  description: 'Платформа для стримеров и зрителей',
};

export default function RootLayout({ children }) {
  return (
    <html className={`${roboto.variable} ${openSans.variable} ${montserrat.variable} ${lato.variable} ${oswald.variable}`}>
      <body>
        <StyledComponentsRegistry>
          <TransitionProvider>
            <ClientProviders>{children}</ClientProviders>
          </TransitionProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
} 

