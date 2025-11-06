'use client';

import { useState, useEffect } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import type { Notification } from '@/types/notification';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const useNotifications = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toastNotifications, setToastNotifications] = useState<Notification[]>([]);

  // useEffect는 한 번만 사용하여 모든 로직을 관리합니다.
  useEffect(() => {
    // 1. 인증 로딩이 끝나고, 로그인된 상태가 아니면 아무것도 하지 않고 종료합니다.
    if (isLoading || !isAuthenticated) {
      return;
    }

    if (!API_BASE_URL) {
      console.error("환경 변수 'NEXT_PUBLIC_API_BASE_URL'가 설정되지 않았습니다.");
      return;
    }

    const controller = new AbortController();
    const SSE_URL = `${API_BASE_URL}/notifications/subscribe`;
    

    // 2. SSE 연결을 시작합니다.
    fetchEventSource(SSE_URL, {
      signal: controller.signal,

      // ✅ [핵심 최종 수정] headers를 정적 객체가 아닌 '함수'로 전달합니다.
      // 이렇게 하면 자동 재연결을 포함한 모든 요청 시점에 이 함수가 새로 호출되어,
      // 항상 localStorage에서 '최신' Access Token을 가져와 사용하게 됩니다.
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')?.replace(/"/g, '') || ''}`,
      },

      // 연결 성공 시 호출되는 함수
      onopen: async (res) => {
        if (res.ok) {
          console.log("SSE connection established successfully.");
          // 최초 연결 성공 시, 실제 알림 목록을 가져와 상태를 동기화합니다.
          try {
            const response = await api.get<Notification[]>('/notifications');
            const data = response.data;
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
          } catch (e) {
            console.error("SSE 연결 후 초기 알림 목록 동기화 실패:", e);
          }
          return;
        }
        
        // 401, 403 등 인증/권한 오류가 발생하면, 재시도하지 않고 연결을 중단합니다.
        if (res.status === 401 || res.status === 403) {
            console.error(`SSE Auth Error: Status ${res.status}. Stopping retries.`);
            controller.abort(); // 컨트롤러를 중단시켜 자동 재연결을 막습니다.
        } else {
            console.error(`SSE connection failed: Status ${res.status}, URL: ${SSE_URL}`);
        }
      },

      // 메시지 수신 시
      onmessage: (event) => {
        if (event.event === 'notification') {
          try {
            const newNotification: Notification = JSON.parse(event.data);
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
            if (newNotification.message.toUpperCase().includes("EMERGENCY")) {
              setToastNotifications(prev => [...prev, newNotification]);
            }
          } catch (e) {
            console.error("Failed to parse SSE message data:", event.data);
          }
        }
      },

      // 에러 발생 시
      onerror: (err) => {
        // AbortError는 우리가 의도적으로 연결을 끊은 것이므로, 에러로 처리하지 않습니다.
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        console.error("SSE stream error. The library will attempt to reconnect.", err);
        // 여기서 에러를 다시 throw하면 재연결을 멈춥니다.
        // throw err;
      },
    });

    // 3. 컴포넌트가 언마운트되면 SSE 연결을 정리합니다.
    return () => {
      controller.abort();
    };
  }, [isLoading, isAuthenticated]); // ✅ 의존성 배열을 최대한 단순하게 유지합니다.

  
  // --- 이하 markAsRead, clearToast 함수는 수정할 필요가 없습니다 ---

  const markAsRead = async (notificationId: number) => {
    const target = notifications.find(n => n.notification_id === notificationId);
    if (!target || target.is_read) return;
    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("알림 읽음 처리 실패:", error);
    }
  };

  const clearToast = (notificationId: number) => {
    setToastNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
  };
  
  return { notifications, unreadCount, markAsRead, toastNotifications, clearToast };
};