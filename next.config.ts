import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/api/seniors/photos/**', // 이 경로의 이미지만 허용
      },
      // 만약 배포 서버의 주소가 다르다면, 여기에 추가로 설정할 수 있습니다.
      // {
      //   protocol: 'https',
      //   hostname: 'api.my-service.com',
      //   port: '',
      //   pathname: '/api/seniors/photos/**',
      // },
      ],
  }, output: 'standalone'
};

export default nextConfig;
