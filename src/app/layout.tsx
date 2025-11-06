// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import KakaoMapContext from "@/contexts/KakaoMapContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "시니어케어 돌봄로봇",
  description: "실시간 시니어 현황 모니터링 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {/* ✅ 가장 바깥쪽에 Provider들을 위치시킵니다. */}
        <AuthProvider>
          <NotificationProvider>
            <KakaoMapContext>
              {children} {/* 자식 레이아웃이나 페이지가 이곳에 렌더링됩니다. */}
            </KakaoMapContext>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}