'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import type { DashboardSenior, RiskLevel } from '@/types';

interface RiskRankMapProps {
  seniors: DashboardSenior[];
  selectedSenior: DashboardSenior | null;
  mapCenter: { lat: number; lng: number };
  level: number;
  onMarkerClick: (senior: DashboardSenior) => void;
  onInfoWindowClick: (senior: DashboardSenior) => void;
  currentLevel: RiskLevel;
  isDashboardView?: boolean;
}

const stateColors: Record<RiskLevel, string> = {
  EMERGENCY: '#FF4C4C',
  CRITICAL: '#FF9900',
  DANGER: '#FFD700',
  POSITIVE: '#4CAF50',
};

export default function RiskRankMap({
  seniors,
  selectedSenior,
  mapCenter,
  level,
  onMarkerClick,
  onInfoWindowClick,
  currentLevel,
  isDashboardView = false,
}: RiskRankMapProps) {
  const [zoomLevel, setZoomLevel] = useState(level);
  const [center, setCenter] = useState(mapCenter);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const router = useRouter();

  useEffect(() => setZoomLevel(level), [level]);

  // 화면 크기 추적
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 카드 클릭 시 중앙 이동
  useEffect(() => {
    if (
      selectedSenior?.latitude !== undefined &&
      selectedSenior?.longitude !== undefined
    ) {
      setCenter({
        lat: Number(selectedSenior.latitude),
        lng: Number(selectedSenior.longitude),
      });
      setZoomLevel((prev) => Math.max(prev, 6));
    } else {
      setCenter(mapCenter);
    }
  }, [selectedSenior?.senior_id, mapCenter.lat, mapCenter.lng]);

  const shouldShowInfoWindow =
    !isDashboardView &&
    selectedSenior?.latitude !== undefined &&
    selectedSenior?.longitude !== undefined;

  const getMarkerSize = () => Math.min(24 + (zoomLevel - 5) * 2, 40);
  const getFontSize = () => Math.min(12 + Math.floor((zoomLevel - 5) / 2), 16);
  const getTopOffset = () => {
    const base = getMarkerSize() + 4;
    if (windowSize.height < 500) return base + 6;
    if (windowSize.height < 800) return base + 4;
    return base;
  };

  const emergencySeniors = seniors.filter(
    (s) => s.resolved_label === 'EMERGENCY'
  );

  // 겹침 방지: 같은 위치 근처면 위로 살짝 이동
  const getAdjustedTop = (senior: DashboardSenior, idx: number) => {
    const sameLatLngCount = emergencySeniors.filter(
      (s, i) =>
        i < idx &&
        s.latitude === senior.latitude &&
        s.longitude === senior.longitude
    ).length;
    return getTopOffset() + sameLatLngCount * 12; // 마커 겹침 간격
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden shadow-xl relative">
      <Map
        center={center}
        style={{ width: '100%', height: '100%' }}
        level={zoomLevel}
        isPanto
        onZoomChanged={(map) => setZoomLevel(map.getLevel())}
      >
        {seniors.map((senior, idx) => {
          if (
            senior.latitude === undefined ||
            senior.longitude === undefined
          )
            return null;

          const isSelected = selectedSenior?.senior_id === senior.senior_id;
          const circleSize = getMarkerSize();
          const fontSize = getFontSize();

          let indexNumber = 0;
          if (isDashboardView && senior.resolved_label === 'EMERGENCY') {
            indexNumber =
              emergencySeniors.findIndex(
                (s) => s.senior_id === senior.senior_id
              ) + 1;
          }

          return (
            <MapMarker
              key={senior.latest_overall_result_id}
              position={{
                lat: Number(senior.latitude),
                lng: Number(senior.longitude),
              }}
              zIndex={isSelected ? 100 : idx}
              onClick={() => {
                if (!isDashboardView) onMarkerClick(senior);
              }}
            >
              {indexNumber > 0 && (
                <div
                  style={{
                    width: `${circleSize}px`,
                    height: `${circleSize}px`,
                    borderRadius: '50%',
                    backgroundColor: stateColors.EMERGENCY,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: `${fontSize}px`,
                    position: 'absolute',
                    top: `-${getAdjustedTop(senior, idx)}px`,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    userSelect: 'none',
                    border: '1px solid #fff',
                  }}
                >
                  {indexNumber}
                </div>
              )}
            </MapMarker>
          );
        })}

        {shouldShowInfoWindow && (
          <CustomOverlayMap
            position={{
              lat: Number(selectedSenior.latitude),
              lng: Number(selectedSenior.longitude),
            }}
            yAnchor={1.35}
            xAnchor={0.5}
          >
            <div
              onClick={() =>
                router.push(`/main/analysis/${selectedSenior.latest_overall_result_id}`)
              }
              className="bg-white rounded-lg shadow-lg border-2 border-blue-500 cursor-pointer hover:shadow-2xl transition-shadow"
              style={{
                display: 'inline-block',
                padding: '4px 8px',
                whiteSpace: 'pre-line',
                wordBreak: 'keep-all',
                minWidth: '400px',
                maxWidth: '90vw',
              }}
            >
              <div className="font-bold text-base mb-1 text-blue-700">
                {`${selectedSenior.name} (${selectedSenior.age}세)`}
              </div>
              <div className="space-y-1 text-xs text-gray-800">
                <div>
                  <span className="font-semibold">· 요약 : </span>
                  <span>{selectedSenior.summary ?? '정보없음'}</span>
                </div>
                <div>
                  <span className="font-semibold">· 대처방안 : </span>
                  <span style={{ whiteSpace: 'pre-line' }}>
                    {selectedSenior.treatment_plan ?? '정보없음'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="font-semibold">· 조치 여부 : </span>
                  {selectedSenior.is_resolved ? (
                    <span className="px-2 py-0.5 font-semibold text-white bg-green-500 rounded-full">
                      조치 완료
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 font-semibold text-white bg-red-500 rounded-full">
                      확인 필요
                    </span>
                  )}

                  {/* 상태 표시와 화살표 */}
                  {(() => {
                    const riskColors: Record<
                      RiskLevel,
                      { text: string; bg: string; border: string; label: string }
                    > = {
                      EMERGENCY: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '긴급' },
                      CRITICAL: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: '위험' },
                      DANGER: { text: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', label: '주의' },
                      POSITIVE: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: '안전' },
                    };

                    const currentLabel = selectedSenior.resolved_label ?? 'POSITIVE';
                    const previousLabel = selectedSenior.pre_resolved_label ?? currentLabel;

                    const currentColor = riskColors[currentLabel];
                    const previousColor = riskColors[previousLabel];

                    return (
                      <>
                        {/* 이전 상태 */}
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${previousColor.text} ${previousColor.border}`}
                        >
                          {previousColor.label}
                        </span>

                        {/* 화살표 */}
                        <span className="text-xs text-gray-500">→</span>

                        {/* 현재 상태 */}
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${currentColor.text} ${currentColor.border}`}
                        >
                          {currentColor.label}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CustomOverlayMap>
        )}
      </Map>
    </div>
  );
}