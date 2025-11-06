// src/types/notification.ts

// SSE 이벤트의 타입을 명확히 하기 위해 MessageEvent를 확장합니다.
export interface SseEvent extends MessageEvent {
    data: string; // MessageEvent의 data는 any 타입이므로 string으로 명시
}

export interface Notification {
  notification_id: number;
  type: 'ANALYSIS_COMPLETE' | 'SENIOR_STATE_CHANGED';
  message: string; 
  summary: string;
  is_read: boolean;
  created_at: string;
  resource_id: string;
  link: string;
}