import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'AI Data Policy Compliance Agent',
  description: 'Enterprise-grade policy compliance and violation detection powered by AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn(
        inter.variable,
        outfit.variable,
        "font-sans selection:bg-primary/20 selection:text-primary"
      )}>
        <main className="relative min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
