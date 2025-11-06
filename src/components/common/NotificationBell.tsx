'use client';

import React from "react";
import { useRouter } from "next/navigation";
import { FaBell, FaTrashAlt, FaCheckDouble } from "react-icons/fa";
import { useNotificationContext } from "@/contexts/NotificationContext";
import type { Notification } from "@/types/notification";

const NotificationBell: React.FC = () => {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    isBellOpen,
    setIsBellOpen
  } = useNotificationContext();

  const handleToggle = () => setIsBellOpen(!isBellOpen);

  const handleClick = (notification: Notification): void => {
    if (!notification.is_read) markAsRead(notification.notification_id);

    switch (notification.type) {
      case "ANALYSIS_COMPLETE":
        router.push(`/main/analysis/${notification.resource_id}`);
        break;
      case "SENIOR_STATE_CHANGED":
        console.log(`Senior state changed for senior ID: ${notification.resource_id}. Navigation not implemented yet.`);
        break;
      default:
        console.log(`Navigation 미정: ${notification.type}`);
        break;
    }

    setIsBellOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleToggle}
        className="relative bg-transparent border-none cursor-pointer p-2 text-gray-800 hover:text-blue-600 transition-colors"
      >
        <FaBell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isBellOpen && (
        <div className="absolute top-[calc(100%+10px)] right-0 w-[360px] bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700">알림</h4>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
                  <FaCheckDouble size={12} /> 모두 읽음
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearNotifications} className="text-xs text-red-400 hover:underline flex items-center gap-1 cursor-pointer">
                  <FaTrashAlt size={12} /> 전체 삭제
                </button>
              )}
            </div>
          </div>

          {notifications.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n: Notification) => (
                <li
                  key={n.notification_id}
                  onClick={() => handleClick(n)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                    !n.is_read
                      ? n.type === "ANALYSIS_COMPLETE"
                        ? "bg-blue-50" // 연한 하늘색
                        : "bg-gray-100" // 다른 읽지 않은 알림
                      : "bg-white"
                  }`}
                >
                  <p className="text-gray-800 text-sm">{n.message}</p>
                  <small className="text-gray-500 text-xs">
                    {new Date(n.created_at).toLocaleString("ko-KR")}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">
              새로운 알림이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
