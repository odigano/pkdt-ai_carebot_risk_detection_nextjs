'use client';

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { NotificationProvider } from "@/contexts/NotificationContext";
import KakaoMapContext from "@/contexts/KakaoMapContext";
import EmergencyToast from "@/components/common/EmergencyToast";

// 로딩 스켈레톤
function AppSkeleton() {
  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 flex-shrink-0 bg-white border-r flex flex-col shadow-sm">
        <div className="flex items-center border-b h-16 px-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="ml-2 h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
          </div>
        </header>
        <div className="flex-1 p-6">
          <div className="w-full h-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      </main>
    </div>
  );
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return <AppSkeleton />;

   // 인증된 사용자만 메인 레이아웃을 볼 수 있음
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ✅ [핵심 수정] username prop을 완전히 제거합니다. */}
        <Header /> 
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <EmergencyToast />
          {children}
        </div>
      </main>
    </div>
  );
}