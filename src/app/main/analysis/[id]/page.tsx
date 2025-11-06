"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import * as XLSX from "xlsx";

// --- 타입 정의 ---

// API 응답에 senior_id가 없더라도 타입 정의는 유지합니다.
// handleStateSave 함수에서는 이 타입을 더 이상 참조하지 않습니다.
interface DetailData {
  senior_id: number;
  senior_name: string;
  diseases: string;
  age: number;
  doll_id: string;
  label: string;
  summary: string;
  treatment_plan: string;
  reasons: string[];
  confidence_scores: {
    positive: number;
    danger: number;
    critical: number;
    emergency: number;
  };
  dialogues: Dialogue[];
  is_editable: boolean;
  is_resolved: boolean;
  resolved_label: string;
}

interface Dialogue {
  id: number;
  text: string;
  uttered_at: string;
  label: string;
  confidence_scores: {
    positive: number;
    danger: number;
    critical: number;
    emergency: number;
  };
}

// --- 상수 및 매핑 객체 ---

const statusMap: Record<string, { text: string; color: string; textColor: string }> = {
  EMERGENCY: { text: "긴급", color: "bg-red-600", textColor: "text-red-600" },
  CRITICAL: { text: "위험", color: "bg-orange-600", textColor: "text-orange-600" },
  DANGER: { text: "주의", color: "bg-yellow-500", textColor: "text-yellow-500" },
  POSITIVE: { text: "안전", color: "bg-green-600", textColor: "text-green-600" },
};

type ActionState = "CRITICAL" | "DANGER" | "POSITIVE";

export default function DetailedAnalysisPage() {
  const router = useRouter();
  const { id } = useParams();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [selectedState, setSelectedState] = useState<ActionState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/analyze/${id}`);
        console.log(res.data)
        setData(res.data || null);
      } catch (error) {
        console.error("Failed to fetch detail:", error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  // ✅ 3. [핵심 수정] 이용자 상태 변경 및 저장 핸들러
  const handleStateSave = async () => {
    if (!selectedState) {
      alert("변경할 상태를 먼저 선택해주세요.");
      return;
    }

    // ✅ [핵심 디버깅 코드] API 요청에 사용될 데이터를 객체로 만듭니다.
    const requestBody = {
      overall_result_id: parseInt(id as string, 10),
      new_state: selectedState,
      reason: `관리자가 분석 결과(ID: ${id})를 확인 후 상태를 수동으로 변경했습니다.`
    };

    // ✅ API를 호출하기 직전에, URL과 보낼 데이터를 콘솔에 출력합니다.
    console.log(`[API 요청 데이터 확인]`);
    console.log(`요청 URL: POST /seniors/${data?.senior_id}/state`);
    console.log(`요청 본문 (Body):`, requestBody);

    setIsSubmitting(true);
    try {
      await api.post(`/seniors/${data?.senior_id}/state`, {
        overall_result_id: parseInt(id as string, 10),
        new_state: selectedState,
        reason: `관리자가 분석 결과(ID: ${id})를 확인 후 상태를 수동으로 변경했습니다.`
      });
      alert(`이용자의 상태가 '${statusMap[selectedState].text}'(으)로 성공적으로 변경되었습니다.`);
      const res = await api.get(`/analyze/${id}`);
      console.log(res.data)
      setData(res.data || null);
      // router.push('/main');
      // router.refresh();
    } catch (err) {
      console.error("상태 변경 API 호출 실패:", err);
      alert("상태 변경 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await api.delete(`/analyze/${id}`);
      alert("삭제되었습니다.");
      router.push("/main/analysis");
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제 실패!");
    }
  };

  const handleExcelDownload = () => {
    if (!data) return;
    setDownloading(true);

    try {
      const wb = XLSX.utils.book_new();
      const rows: (string | number)[][] = [];

      // 기본 정보
      rows.push(["분석 대상자 정보"]);
      rows.push(["항목", "내용"]);
      rows.push(["이름", data.senior_name]);
      rows.push(["질병", data.diseases]);
      rows.push(["나이", data.age]);
      rows.push(["인형 ID", data.doll_id]);
      rows.push([]);

      // 분석 결과
      rows.push(["분석 결과"]);
      rows.push(["항목", "내용"]);
      rows.push(["분석 결과", statusMap[data.label]?.text || data.label]);
      rows.push(["요약", data.summary]);
      rows.push(["대처방안", data.treatment_plan || "정보 없음"]);
      rows.push(["근거", (data.reasons || []).join(", ")]);
      rows.push([]);

      // confidence scores
      rows.push(["Confidence Scores"]);
      rows.push(["항목", "퍼센트"]);
      rows.push(["긴급", data.confidence_scores.emergency]);
      rows.push(["위험", data.confidence_scores.critical]);
      rows.push(["주의", data.confidence_scores.danger]);
      rows.push(["안전", data.confidence_scores.positive]);
      rows.push([]);

      // 대화 목록
      rows.push(["대화 목록"]);
      rows.push(["순번", "내용", "결과", "긴급", "위험", "주의", "안전", "시간"]);
      (data.dialogues || []).forEach((dlg, idx) => {
        rows.push([
          idx + 1,
          dlg.text,
          statusMap[dlg.label]?.text || dlg.label,
          dlg.confidence_scores.emergency,
          dlg.confidence_scores.critical,
          dlg.confidence_scores.danger,
          dlg.confidence_scores.positive,
          new Date(dlg.uttered_at).toLocaleString("ko-KR"),
        ]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(rows);

      XLSX.utils.book_append_sheet(wb, sheet, "분석 상세");
      XLSX.writeFile(
        wb,
        `분석_상세_${data.senior_name}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (error) {
      console.error("Excel 다운로드 실패:", error);
    } finally {
      setDownloading(false);
    }
  };

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
        <div className="bg-white rounded-lg p-6 shadow-lg font-medium text-lg">
          분석 결과 불러오는 중...
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="p-8 text-center text-red-600 text-lg">
        데이터를 찾을 수 없습니다.
      </div>
    );

  return (
    <div className="p-6 space-y-4 text-black">
      <h2 className="text-3xl font-bold text-center">전체 분석 결과</h2>
      <div className="flex justify-end -mt-1">
        <button
          onClick={handleExcelDownload}
          disabled={downloading}
          className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-bold text-sm cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {downloading ? "다운로드 중..." : "엑셀 다운로드"}
        </button>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50 flex flex-wrap gap-2 space-x-6">
        <div className="font-bold w-full text-xl">이용자 정보</div>
        <span>· 이름 : {data.senior_name}</span>
        <span>· 질병 : {data.diseases || "-"}</span>
        <span>· 나이 : {data.age}세</span>
        <span>· 인형 ID : {data.doll_id}</span>
      </div>

      <div className="border rounded-lg p-4 bg-white shadow-sm space-y-4">
        <div className="flex gap-x-3">
          <div className="flex items-center">
            <div
              className={`inline-block text-xl font-bold px-3 py-1.5 rounded-lg ${statusMap[data.label]?.color || "bg-gray-300"
                } text-white`}
            >
              분석 결과 : {statusMap[data.label]?.text || data.label}
            </div>
          </div>

          {/* 화살표 */}
          {data.is_resolved && <span className="flex items-center gap-x-4 text-3xl text-gray-700">➜</span>}

          {data.is_resolved && <div className="flex items-center">
            <div
              className={`inline-block text-xl font-bold px-3 py-1.5 rounded-lg ${statusMap[data.resolved_label]?.color || "bg-gray-300"
                } text-white`}
            >
              조치 결과 : {statusMap[data.resolved_label]?.text || data.resolved_label}
            </div>
          </div>}
        </div>

        <div className="space-y-2">
          <div className="flex">
            <span className="font-bold mr-2 w-12 shrink-0">· 요약 :</span>
            <span>{data.summary}</span>
          </div>

          <div className="flex">
            <span className="font-bold mr-2 w-21 shrink-0">· 대처 방안 :</span>
            <span>{data.treatment_plan?.trim() || "대처 방안 정보가 없습니다."}</span>
          </div>

          <div className="flex">
            <span className="font-bold mr-2 w-12 shrink-0">· 근거 :</span>
            <ul className="space-y-1">
              {(data.reasons || []).map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-2">
          {[
            { label: "긴급", value: data.confidence_scores.emergency, color: "bg-red-600" },
            { label: "위험", value: data.confidence_scores.critical, color: "bg-orange-600" },
            { label: "주의", value: data.confidence_scores.danger, color: "bg-yellow-500" },
            { label: "안전", value: data.confidence_scores.positive, color: "bg-green-600" },
          ].map((score) => (
            <div key={score.label} className="flex flex-col items-start">
              <span>{score.label}: {(score.value * 100).toFixed(1)}%</span>
              <div className="w-32 h-4 bg-gray-200 rounded-full mt-1">
                <div
                  className={`h-4 ${score.color} rounded-full`}
                  style={{ width: `${score.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="font-bold text-xl mb-2">대화 목록</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse border text-center">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-1.5 w-8">순번</th>
                <th className="border p-1.5 w-1/2">내용</th>
                <th className="border p-1.5 w-16">결과</th>
                <th className="border p-1.5 w-16">긴급</th>
                <th className="border p-1.5 w-16">위험</th>
                <th className="border p-1.5 w-16">주의</th>
                <th className="border p-1.5 w-16">안전</th>
                <th className="border p-1.5 w-40">시간</th>
              </tr>
            </thead>
            <tbody>
              {(data.dialogues || []).map((dlg, i) => {
                const time = new Date(dlg.uttered_at).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                return (
                  <tr key={dlg.id} className="bg-white hover:bg-gray-50">
                    <td className="border p-1.5 text-black">{i + 1}</td>
                    <td className="border p-1.5 text-black text-left">{dlg.text}</td>
                    <td className="border p-1.5 font-semibold">
                      <span className={statusMap[dlg.label]?.textColor}>
                        {statusMap[dlg.label]?.text || dlg.label}
                      </span>
                    </td>
                    <td className="border p-1.5 text-black">
                      {(dlg.confidence_scores.emergency * 100).toFixed(1)}%
                    </td>
                    <td className="border p-1.5 text-black">
                      {(dlg.confidence_scores.critical * 100).toFixed(1)}%
                    </td>
                    <td className="border p-1.5 text-black">
                      {(dlg.confidence_scores.danger * 100).toFixed(1)}%
                    </td>
                    <td className="border p-1.5 text-black">
                      {(dlg.confidence_scores.positive * 100).toFixed(1)}%
                    </td>
                    <td className="border p-1.5 text-black text-xs">{time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data?.is_editable && <div className="border rounded-lg p-4 bg-white shadow-sm">
        <h3 className="text-xl font-bold mb-4">조치 완료 결과</h3>
        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-md">
          <p className="font-semibold text-gray-800">· 이용자 상태 변경 :</p>
          <div className="flex gap-4">
            {(["CRITICAL", "DANGER", "POSITIVE"] as ActionState[]).map(stateKey => (
              <button
                key={stateKey}
                onClick={() => setSelectedState(stateKey)}
                className={`px-4 py-2 rounded-lg font-bold transition-all
                  ${selectedState === stateKey
                    ? `${statusMap[stateKey].color} text-white ring-2 ring-offset-2 ${statusMap[stateKey].color.replace('bg-', 'ring-')}`
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"}
                `}
              >
                {statusMap[stateKey].text}
              </button>
            ))}
          </div>
          <button
            onClick={handleStateSave}
            disabled={!selectedState || isSubmitting}
            className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </div>}

      <div className="flex justify-center gap-4 mt-3">
        <button
          onClick={handleDelete}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-bold cursor-pointer"
        >
          삭제
        </button>
        <button
          onClick={() => router.back()}
          className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-200 transition font-bold cursor-pointer"
        >
          목록으로
        </button>
      </div>
    </div>
  );
}