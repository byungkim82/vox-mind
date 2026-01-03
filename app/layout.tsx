import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Vox Mind - AI Voice Memo",
  description: "침묵에 끊기지 않는 녹음과 지능적 인출을 제공하는 AI 기반 음성 지식 베이스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-background-dark text-white font-display">
        <Navbar />
        <main className="pt-4 pb-20 md:pt-20 md:pb-8 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
