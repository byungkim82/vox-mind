import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vox Mind - AI Voice Memo",
  description: "침묵에 끊기지 않는 녹음과 지능적 인출을 제공하는 AI 기반 음성 지식 베이스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
