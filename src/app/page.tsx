'use client';

import Image from "next/image";
import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.push("/main");
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch {
      setError("아이디 또는 비밀번호가 틀렸습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.id === "username") setUsername(e.target.value);
    if (e.target.id === "password") setPassword(e.target.value);
  };

  if (isLoading || isAuthenticated) {
    return <div className="flex justify-center items-center min-h-screen">로딩 중...</div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="text-center -translate-y-10">
        <div className="flex items-center justify-center mb-2">
          <Image src="/img/grandparents.png" alt="조부모 이모지" width={30} height={30} className="w-14 h-auto mr-5"/>
          <h2 className="text-3xl font-bold text-black">시니어 돌봄 관제시스템</h2>
        </div>
        <p className="text-xl text-gray-500 mb-5">Senior Care Control System</p>

        <form onSubmit={handleSubmit} className="border-2 border-black rounded-xl p-8 w-72 mx-auto shadow-lg">
          <h3 className="text-xl font-medium text-black mb-6">관리자 로그인</h3>
          {error && <p className="text-red-500 mb-4">{error}</p>}

          <input
            id="username"
            type="text"
            placeholder="ID"
            value={username}
            onChange={handleChange}
            className="w-full border-2 border-gray-800 rounded-lg p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-600"
            disabled={isSubmitting}
            autoComplete="username"
          />
          <input
            id="password"
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={handleChange}
            className="w-full border-2 border-gray-800 rounded-md p-2 mb-7 focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-600"
            disabled={isSubmitting}
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-1/2 py-2 font-semibold bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
          >
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}