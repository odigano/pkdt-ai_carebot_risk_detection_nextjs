// src/app/api/notifications/subscribe/route.ts

// Next.js에서 GET 요청을 처리하기 위한 핸들러
export async function GET(request: Request) {
  // SSE는 스트리밍 방식으로 응답을 계속 보내야 하므로 ReadableStream을 사용합니다.
  const stream = new ReadableStream({
    start(controller) {
      // 1. 클라이언트가 연결되었을 때 실행될 로직
      console.log('[SSE] 클라이언트 연결 시작');

      // (중요) 실제 프로젝트에서는 이곳에 메시지 큐(Redis 등) 구독 로직이나
      // 데이터베이스 변경 감지 로직을 추가하여 의미있는 데이터를 보내야 합니다.

      // 2. 연결 테스트를 위해 10초마다 'heartbeat' 메시지를 보내는 예시
      //    이것이 없으면 특정 프록시 환경에서 연결이 타임아웃으로 끊어질 수 있습니다.
      const intervalId = setInterval(() => {
        const message = `data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() })}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      }, 10000);

      // 3. 클라이언트가 연결을 끊었을 때(예: 브라우저 창 닫기) 실행될 로직
      request.signal.addEventListener('abort', () => {
        console.log('[SSE] 클라이언트 연결 종료');
        clearInterval(intervalId); // 불필요한 인터벌 정리
        controller.close();
      });
    },
  });

  // 4. SSE 통신을 위한 필수 헤더와 함께 스트림 응답을 반환합니다.
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream', // SSE 공식 MIME 타입
      'Connection': 'keep-alive',
      'Cache-Control': 'no-cache',
    },
  });
}