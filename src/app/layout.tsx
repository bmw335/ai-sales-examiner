import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI销售模拟考官',
  description: '幼师口袋销售团队暑期考核工具',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
