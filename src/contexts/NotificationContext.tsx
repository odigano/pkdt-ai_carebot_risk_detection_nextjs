'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { Notification } from '@/types/notification';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  isBellOpen: boolean;
  setIsBellOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const sseControllerRef = useRef<AbortController | null>(null);

  // SSE 연결 함수
  const connectSSE = () => {
    if (!API_BASE_URL) return console.error("환경 변수 NEXT_PUBLIC_API_BASE_URL 없음");

    const accessTokenRaw = localStorage.getItem('accessToken');
    if (!accessTokenRaw) return console.error("AccessToken 없음");
    const accessToken = accessTokenRaw.replace(/"/g, '');
    if (!accessToken) return console.error("잘못된 AccessToken");

    const controller = new AbortController();
    sseControllerRef.current = controller;

    fetchEventSource(`${API_BASE_URL}/notifications/subscribe`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',

      onopen: async (res) => {
        if (res.status === 401) {
          console.error("❌ SSE 인증 실패: 토큰이 만료되었거나 유효하지 않음");
          controller.abort();
          return;
        }

        if (res.ok) {
          try {
            const response = await api.get<Notification[]>('/notifications');
            setNotifications(response.data);
            setUnreadCount(response.data.filter(n => !n.is_read).length);
          } catch (err) {
            console.error("❌ 초기 알림 불러오기 실패:", err);
          }
        }
      },

      onmessage: (event) => {
        if (event.event === 'notification') {
          const newNotification: Notification = JSON.parse(event.data);
          setNotifications(prev => [newNotification, ...prev]);
          if (!newNotification.is_read) setUnreadCount(prev => prev + 1);
        }
      },

      onerror: (err) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log("🟡 SSE 연결 종료 (Abort)");
        } else {
          console.error("❗ SSE 스트림 오류 발생:", err);
          // 401이 아니면 3초 후 재연결
          setTimeout(() => {
            if (!sseControllerRef.current) connectSSE();
          }, 3000);
        }
      }
    });
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated || sseControllerRef.current) return;
    connectSSE();

    return () => {
      if (sseControllerRef.current) {
        sseControllerRef.current.abort();
        sseControllerRef.current = null;
      }
    };
  }, [isLoading, isAuthenticated]);

  // 개별 읽음 처리
  const markAsRead = async (id: number) => {
    const target = notifications.find(n => n.notification_id === id);
    if (!target || target.is_read) return;
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("❌ 알림 읽음 처리 실패:", err);
    }
  };

  // 전체 읽음 처리
  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("❌ 전체 읽음 처리 실패:", err);
    }
  };

  // 전체 삭제
  const clearNotifications = async () => {
    try {
      await api.delete('/notifications');
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("❌ 알림 전체 삭제 실패:", err);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      isBellOpen,
      setIsBellOpen,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationContext must be used within a NotificationProvider');
  return context;
};
