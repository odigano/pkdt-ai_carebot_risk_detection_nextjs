'use client';

import React from 'react';
import type { DashboardSenior, RiskLevel } from '@/types';

interface Props {
  seniors: DashboardSenior[];
  selectedSeniorId: number | null;
  onSeniorSelect: (senior: DashboardSenior) => void;
  riskLevelLabel?: string; // 선택된 레벨
  currentLevel?: RiskLevel; // 카드 색상 기준
}

// 위험 레벨별 한글 라벨과 색상
const riskColors: Record<RiskLevel, { text: string; bg: string; border: string; label: string }> = {
  EMERGENCY: { text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '긴급' },
  CRITICAL: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: '위험' },
  DANGER: { text: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200', label: '주의' },
  POSITIVE: { text: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: '안전' },
};

// 성별 매핑
const sexMap: Record<string, string> = {
  MALE: '남',
  FEMALE: '여',
};

export default function RiskRankList({
  seniors,
  selectedSeniorId,
  onSeniorSelect,
  riskLevelLabel,
}: Props) {
  // 영어 또는 한글 레벨 이름을 한글로 매핑
  const labelToKorean: Record<string, string> = {
    EMERGENCY: '긴급',
    CRITICAL: '위험',
    DANGER: '주의',
    POSITIVE: '안전',
    긴급: '긴급',
    위험: '위험',
    주의: '주의',
    안전: '안전',
  };

  // 제목에 표시할 레벨
  const displayLevelLabel = riskLevelLabel
    ? labelToKorean[riskLevelLabel] ?? '긴급'
    : '긴급';

  // 글자색 결정
  const displayLevelColor: RiskLevel = (Object.keys(riskColors).find(
    key => riskColors[key as RiskLevel].label === displayLevelLabel
  ) as RiskLevel) ?? 'EMERGENCY';

  // 우선순위 정렬: EMERGENCY > CRITICAL > DANGER > POSITIVE
  const levelPriority: Record<RiskLevel, number> = {
    EMERGENCY: 0,
    CRITICAL: 1,
    DANGER: 2,
    POSITIVE: 3,
  };

  const filteredSeniors = seniors
    .filter(senior => {
      if (!riskLevelLabel) return true;
      const seniorLabel = senior.resolved_label ?? 'POSITIVE';
      return labelToKorean[seniorLabel] === displayLevelLabel;
    })
    .slice()
    .sort((a, b) => {
      const levelA = a.resolved_label ?? 'POSITIVE';
      const levelB = b.resolved_label ?? 'POSITIVE';
      if (levelPriority[levelA] !== levelPriority[levelB]) {
        return levelPriority[levelA] - levelPriority[levelB];
      }
      return new Date(b.last_state_changed_at).getTime() - new Date(a.last_state_changed_at).getTime();
    });

  return (
    <div className="w-full h-full max-h-[600px] overflow-y-auto border rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-3">
        {/* 제목: 선택된 상태가 있으면 해당 상태, 없으면 기본 '긴급' */}
        <h3 className={`text-lg font-bold ${riskColors[displayLevelColor].text}`}>
          {displayLevelLabel}
        </h3>
        <div className="text-sm text-gray-600">{filteredSeniors.length}건</div>
      </div>

      {filteredSeniors.length === 0 ? (
        <div className="text-center text-gray-500 py-10">표시할 데이터가 없습니다.</div>
      ) : (
        filteredSeniors.map((senior, idx) => {
          const isSelected = selectedSeniorId === senior.senior_id;
          const risk = senior.resolved_label ?? 'POSITIVE';
          const color = riskColors[risk];

          // 성별 한글 변환
          const sexInKorean = sexMap[senior.sex] ?? senior.sex;

          return (
            <article
              key={senior.latest_overall_result_id}
              onClick={() => onSeniorSelect(senior)}
              className={`cursor-pointer p-3 mb-3 rounded-lg border transition ${
                isSelected
                  ? 'border-blue-300 bg-blue-50'
                  : `${color.border} ${color.bg} hover:brightness-95`
              }`}
              role="button"
              aria-pressed={isSelected}
            >
              <header className="flex justify-between items-start">
                <div className="text-sm font-semibold text-gray-600">
                  #{idx + 1} {senior.name} ({senior.age}세 / {sexInKorean})
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(senior.last_state_changed_at).toLocaleString()}
                </div>
              </header>
              <div className="mt-1 text-sm text-gray-600">{senior.address}</div>
            </article>
          );
        })
      )}
    </div>
  );
}
