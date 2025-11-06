// src/contexts/AuthContext.tsx

'use client';

import { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Member } from '@/types';
import { AxiosError } from 'axios';

type User = Member;

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 처음엔 항상 로딩 상태
  const router = useRouter();

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('username');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
    router.push('/');
  }, [router]);

  // ✅ [핵심 수정] 앱 로드 시 토큰을 검증하는 로직
  useEffect(() => {
    const validateToken = async () => {
      const accessToken = localStorage.getItem('accessToken');
      const username = localStorage.getItem('username');

      if (!accessToken || !username) {
        // 토큰이 아예 없으면 로딩을 끝내고 로그아웃 상태로 확정한다.
        setIsLoading(false);
        return;
      }

      try {
        // 사용자 정보 조회를 시도한다. 이 과정에서 토큰이 만료되었다면
        // api.ts의 인터셉터가 자동으로 갱신을 시도할 것이다.
        const response = await api.get<User>(`/members/${username}`);
        setUser(response.data); // 갱신에 성공하고 유저 정보를 받으면 로그인 상태로 설정
      } catch (error) {
        // 인터셉터의 토큰 갱신까지 모두 실패하면 이 catch 블록으로 오게 된다.
        console.error("토큰 검증 또는 갱신 최종 실패:", error);
        logout(); // 어떤 에러든 발생하면 안전하게 로그아웃 처리
      } finally {
        // ✅ [가장 중요한 부분] 성공하든, 실패하든, 무조건 로딩 상태를 끝낸다.
        // 이것이 무한 로딩을 막고 로그인 페이지를 보여주는 핵심 코드입니다.
        setIsLoading(false);
      }
    };

    validateToken();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 이 로직은 앱이 처음 로드될 때 딱 한 번만 실행되어야 합니다.

  
  // `api.ts`에서 보낸 세션 만료 이벤트를 처리하는 리스너
  useEffect(() => {
    const handleSessionExpired = () => {
      alert("세션이 만료되었습니다. 다시 로그인해주세요.");
      logout();
    };
    window.addEventListener('sessionExpired', handleSessionExpired);
    return () => window.removeEventListener('sessionExpired', handleSessionExpired);
  }, [logout]);


  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/login', { username, password });
      const accessToken = response.headers.authorization?.split(' ')[1];
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('username', username);
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        
        const userResponse = await api.get<User>(`/members/${username}`);
        setUser(userResponse.data);
        
        router.push('/main');
      } else {
        throw new Error('Access Token을 찾을 수 없습니다.');
      }
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 401) {
        alert("아이디 또는 비밀번호가 일치하지 않습니다.");
      } else {
        alert("로그인 중 오류가 발생했습니다.");
      }
      throw error;
    }
  };

  const value = { isAuthenticated: !!user, user, isLoading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 반드시 AuthProvider 내에서 사용해야 합니다.');
  }
  return context;
};