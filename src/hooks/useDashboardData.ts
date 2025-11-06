import useSWR from 'swr';
import api from '@/lib/api';
// ✅ [수정됨] 더 이상 프론트엔드에서 데이터를 가공하지 않으므로, DashboardData 타입만 필요합니다.
import type { DashboardData } from '@/types';

// SWR에 사용할 fetcher 함수
const fetcher = (url: string) => api.get<DashboardData>(url).then(res => res.data);

// ✅ [수정됨] 훅의 반환 타입을 API 응답 타입인 DashboardData | undefined로 직접 사용합니다.
export function useDashboardData() {
  const { data, error, isLoading } = useSWR<DashboardData>('/dashboard', fetcher, {
    refreshInterval: 60000, // 60초마다 데이터 자동 갱신
  });

  // ✅ [수정됨] API 응답 구조가 이미 `seniors_by_state`로 그룹화되어 있으므로,
  // 클라이언트에서 복잡하게 데이터를 재가공하던 `useMemo` 훅이 더 이상 필요 없습니다.
  // SWR이 반환하는 `data`를 그대로 사용하면 됩니다.
  // 이로 인해 코드가 훨씬 간결해지고, 불필요한 연산을 줄여 성능이 향상됩니다.

  return {
    data, // SWR이 fetch한 데이터를 그대로 반환합니다.
    isLoading,
    isError: error,
  };
}