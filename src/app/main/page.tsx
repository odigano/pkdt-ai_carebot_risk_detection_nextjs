'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import StatusSummary from '@/components/common/StatusSummary';
import RiskRankMap from '@/components/common/RiskRankMap';
import RiskRankList from '@/components/common/RiskRankList';
import type { DashboardData, DashboardSenior, RiskLevel } from '@/types';

const DEFAULT_MAP_CENTER = { lat: 36.3504, lng: 127.3845 };
const DEFAULT_MAP_LEVEL = 7;
const ZOOM_ON_SELECT = 4;

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<RiskLevel>('EMERGENCY'); 
  const [selectedSenior, setSelectedSenior] = useState<DashboardSenior | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [mapLevel, setMapLevel] = useState(DEFAULT_MAP_LEVEL);

  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get<DashboardData>('/dashboard');
      setData(resp.data);
    } catch (err) {
      console.error(err);
      setError('대시보드 데이터를 불러오는 데 실패했습니다.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // --- SSE 연결 ---
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const url = token
      ? `/api/notifications/subscribe?access_token=${encodeURIComponent(token)}`
      : '/api/notifications/subscribe';
    const es = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = es;

    es.onopen = () => console.log('SSE 연결 열림');
    es.onerror = (err) => console.error('SSE 오류', err);
    es.addEventListener('notification', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { type: string };
        if (payload.type === 'ANALYSIS_COMPLETE' || payload.type === 'SENIOR_STATE_CHANGED') {
          fetchDashboardData();
        }
      } catch (err) { console.error('SSE 파싱 오류', err); }
    });

    return () => { if (es) es.close(); eventSourceRef.current = null; };
  }, [fetchDashboardData]);

  // --- 상태별 필터 + 최신순 정렬 ---
  const filteredSeniors = useMemo(() => {
    if (!data?.seniors_by_state) return [];
    const key = selectedLevel.toLowerCase() as keyof typeof data.seniors_by_state;
    const arr = data.seniors_by_state[key] ?? [];
    return arr.filter(s => s.latitude && s.longitude)
              .sort((a, b) => new Date(b.last_state_changed_at).getTime() - new Date(a.last_state_changed_at).getTime());
  }, [data, selectedLevel]);

  useEffect(() => {
    if (selectedSenior?.latitude && selectedSenior?.longitude) {
      setMapCenter({ lat: selectedSenior.latitude, lng: selectedSenior.longitude });
      setMapLevel(ZOOM_ON_SELECT);
    } else if (filteredSeniors.length > 0) {
      setMapCenter({ lat: filteredSeniors[0].latitude!, lng: filteredSeniors[0].longitude! });
      setMapLevel(DEFAULT_MAP_LEVEL);
    } else {
      setMapCenter(DEFAULT_MAP_CENTER);
      setMapLevel(DEFAULT_MAP_LEVEL);
    }
  }, [selectedSenior, filteredSeniors]);

  const handleLevelSelect = (level: RiskLevel) => { setSelectedLevel(level); setSelectedSenior(null); setMapLevel(DEFAULT_MAP_LEVEL); };
  const handleSeniorSelect = (senior: DashboardSenior) => { setSelectedSenior(senior); };
  const handleInfoWindowClick = (senior?: DashboardSenior) => {
    if (senior?.latest_overall_result_id) {
      router.push(`/analysis/${senior.latest_overall_result_id}/page?senior_id=${senior.senior_id}`);
    }
  };

  if (error) return <p className="text-center mt-10 text-red-600">{error}</p>;
  if (loading && !data) return <div>Loading...</div>;
  if (!data) return <p className="text-center mt-10 text-gray-600">표시할 데이터가 없습니다.</p>;

  return (
    <div className="container mx-auto space-y-6 p-4">
      <StatusSummary
        counts={data.state_count}
        selectedLevel={selectedLevel}
        onSelectLevel={handleLevelSelect}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
        <div className="md:col-span-2">
          <RiskRankMap
            seniors={filteredSeniors}
            selectedSenior={selectedSenior}
            mapCenter={mapCenter}
            level={mapLevel}
            onMarkerClick={handleSeniorSelect}
            onInfoWindowClick={handleInfoWindowClick}
            currentLevel={selectedLevel}
          />
        </div>
        <div className="md:col-span-1">
          <RiskRankList
            seniors={filteredSeniors}
            selectedSeniorId={selectedSenior?.senior_id ?? null}
            onSeniorSelect={handleSeniorSelect}
            riskLevelLabel={selectedLevel}
          />
        </div>
      </div>
    </div>
  );
}
