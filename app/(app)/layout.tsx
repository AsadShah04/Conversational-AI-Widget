import { RootLayout } from '@/components/root-layout';

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function Layout({ children }: RootLayoutProps) {
  return (
    <RootLayout className="bg-background">
      <header className="fixed top-0 left-0 z-50 hidden w-full flex-row justify-between p-6 md:flex">
        <a
          target=""
          rel="noopener noreferrer"
          href=""
          className="scale-100 transition-transform duration-300 hover:scale-110"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Convoso Logo"
            className="block dark:hidden"
            style={{ width: '9rem' }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Convoso Logo"
            className="hidden dark:block"
            style={{ width: '9rem' }}
          />
        </a>
      </header>
      {children}
    </RootLayout>
  );
}
