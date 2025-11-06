'use client';

import { useEffect } from 'react';

const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

export default function useKakaoMapScript() {
  useEffect(() => {
    // 'declare global' 부분이 완전히 삭제되었습니다.
    // 타입 정의가 설치되어 이제 window.kakao를 직접 인식합니다.
    if (window.kakao && window.kakao.maps) {
      return;
    }

    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_APP_KEY}&libraries=services&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        console.log('Kakao Map script loaded successfully.');
      });
    };

    script.onerror = () => {
      console.error('Failed to load the Kakao Map script.');
    };

    document.head.appendChild(script);

  }, []);
}