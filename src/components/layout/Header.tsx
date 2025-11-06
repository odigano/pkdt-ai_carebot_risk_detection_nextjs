// src/components/layout/Header.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/common/NotificationBell";
import Image from "next/image";


export default function Header() {
  const { user, logout, isLoading } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading || !user) {
    return (
      <header className="flex items-center justify-end h-16 px-6 bg-white border-b border-gray-200">
        <div className="h-8 w-32 bg-gray-200 rounded-md animate-pulse"></div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
      <div></div>
      <div ref={dropdownRef} className="relative flex items-center space-x-2">
        <NotificationBell />
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center space-x-2 border border-gray-300 rounded-lg px-3 py-2 font-medium text-black hover:bg-gray-50 transition cursor-pointer"
        >
          <Image
            src="/img/login.png"
            alt="로그인 사용자"
            width={24}
            height={24}
            className="w-6 h-6 rounded-full"
          />
          <span>{user.username}</span>
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-xl z-10">
            <button
              onClick={logout}
              className="block w-full text-center px-4 py-2 text-sm text-red-600 hover:bg-gray-50 rounded-lg font-medium cursor-pointer"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </header>
  );
}