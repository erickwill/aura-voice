import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '10x - AI Coding Assistant',
  description: 'Code at 10x speed with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
