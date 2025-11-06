// src/components/common/EmergencyToast.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaBell } from 'react-icons/fa';
import { useNotificationContext } from '@/contexts/NotificationContext';
import type { Notification } from '@/types/notification';

interface ToastInfo {
  notification_id: number;
  analysis_id: string; // 명확하게 분석 ID임을 나타냅니다.
  message: string;
}

export default function EmergencyToast() {
  const router = useRouter();
  const { notifications } = useNotificationContext();
  const [activeToasts, setActiveToasts] = useState<ToastInfo[]>([]);
  
  // 이미 화면에 표시했거나 처리한 알림의 ID를 저장하는 Ref
  const processedNotificationIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    // 1. 새롭고, 처리되지 않았으며, '긴급' 분석 완료 알림만 필터링
    const newEmergencyNotifications = notifications.filter((notification: Notification) => {
      const isEmergencyAnalysis = 
        notification.type === 'ANALYSIS_COMPLETE' && // 타입이 '분석 완료'이고
        notification.message.includes('EMERGENCY');   // 메시지에 '긴급'이 포함될 때

      const isAlreadyProcessed = processedNotificationIds.current.has(notification.notification_id);

      return isEmergencyAnalysis && !isAlreadyProcessed;
    });

    if (newEmergencyNotifications.length > 0) {
      const newToasts: ToastInfo[] = newEmergencyNotifications.map(n => {
        // 처리된 알림 ID 목록에 추가하여 중복 표시를 방지
        processedNotificationIds.current.add(n.notification_id);
        return {
          notification_id: n.notification_id,
          analysis_id: n.resource_id, // resource_id가 분석 결과 ID입니다.
          message: n.message, 
        };
      });

      // 기존 토스트 목록에 새로운 토스트를 추가
      setActiveToasts(prevToasts => [...prevToasts, ...newToasts]);
    }
  }, [notifications]); // notifications가 업데이트 될 때마다 검사

  const handleClick = (toastToDismiss: ToastInfo) => {
    // 클릭 시, 해당 분석 결과 상세 페이지로 이동
    router.push(`/main/analysis/${toastToDismiss.analysis_id}`);
    
    // 클릭된 토스트는 화면에서 즉시 제거 (상태 업데이트)
    setActiveToasts(currentToasts =>
      currentToasts.filter(toast => toast.notification_id !== toastToDismiss.notification_id)
    );
  };

  if (activeToasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col items-end space-y-2 w-full max-w-sm">
      {activeToasts.map(toast => (
        <button 
          key={toast.notification_id} 
          onClick={() => handleClick(toast)}
          className="w-full flex items-start p-4 rounded-lg shadow-xl bg-red-100 border border-red-300 cursor-pointer text-left transition-transform transform hover:scale-105 animate-pulse"
        >
          <div className="flex-shrink-0 mr-4 mt-1 text-red-600">
            <FaBell size={20} />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800">긴급 상황 발생</p>
            <p className="text-sm text-red-700">{`[긴급] ${toast.message} 즉각적인 확인이 필요합니다.`}</p>
          </div>
        </button>
      ))}
    </div>
  );
}