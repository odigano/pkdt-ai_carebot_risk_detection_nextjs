// src/components/common/StatusSummary.tsx
'use client';

import { RiskLevel } from '@/types';

interface StatusSummaryProps {
  counts: {
    total: number;
    positive: number;
    danger: number;
    critical: number;
    emergency: number;
    [key: string]: number;
  };
  selectedLevel: RiskLevel;
  onSelectLevel: (level: RiskLevel) => void;
}

// 상태별 색상 정의 (주의색상 밝게 유지)
const levelConfig: Record<RiskLevel, { label: string; colors: string }> = {
  EMERGENCY: { label: '긴급', colors: 'border-red-500 bg-red-50 text-red-600' },
  CRITICAL: { label: '위험', colors: 'border-orange-500 bg-orange-50 text-orange-600' },
  DANGER: { label: '주의', colors: 'border-yellow-500 bg-yellow-50 text-yellow-500' },
  POSITIVE: { label: '안전', colors: 'border-green-500 bg-green-50 text-green-600' },
};

export default function StatusSummary({
  counts,
  selectedLevel,
  onSelectLevel,
}: StatusSummaryProps) {
  // 순서: 총 이용자 수 → 긴급 → 위험 → 주의 → 안전
  const orderedLevels: (RiskLevel | 'TOTAL')[] = [
    'TOTAL',
    'EMERGENCY',
    'CRITICAL',
    'DANGER',
    'POSITIVE',
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {/* 제목 */}
      <div className="flex justify-center items-center px-2 mb-2">
        <h2 className="text-2xl font-bold text-gray-800 text-center flex-1">
          전체 현황
        </h2>
      </div>

      {/* 상태 카드 */}
      <div className="grid grid-cols-5 md:grid-cols-5 gap-4 mt-2">
        {orderedLevels.map((level) => {
          if (level === 'TOTAL') {
            return (
              <div
                key="TOTAL"
                className="p-2 rounded-lg border-2 border-gray-400 bg-gray-50 text-gray-700 text-center flex flex-col items-center justify-center"
              >
                <p className="font-semibold text-xl">총 이용자</p>
                <p className="text-3xl font-bold mt-1">
                  {counts.total}
                  <span className="text-xl ml-1">명</span>
                </p>
              </div>
            );
          }

          const countKey = level.toLowerCase();
          return (
            <div
              key={level}
              onClick={() => onSelectLevel(level)}
              className={`rounded-lg border-2 cursor-pointer text-center flex flex-col items-center justify-center transition-transform duration-200 ${levelConfig[level].colors} ${
                selectedLevel === level
                  ? 'ring-4 ring-offset-1 ring-blue-400 transform scale-105 shadow-lg'
                  : 'hover:shadow-md hover:-translate-y-1'
              }`}
            >
              <p className="font-semibold text-xl">{levelConfig[level].label}</p>
              <p className="text-4xl font-bold mt-1">
                {counts[countKey] || 0}
                <span className="text-xl ml-1">명</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
