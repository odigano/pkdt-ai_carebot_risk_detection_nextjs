"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import api from "@/lib/api"; // (주석) lib/api.ts와 같은 API 클라이언트 모듈이 있다고 가정합니다.
import { Residence, SeniorSex } from "@/types"; // (주석) types/index.ts와 같은 타입 정의 파일이 있다고 가정합니다.

// Daum Postcode 타입 정의
interface DaumPostcodeData {
  zonecode: string;
  roadAddress: string;
  sigungu: string;
  bname: string;
}

// 분석 데이터 타입
interface Analysis {
  id: number;
  label: string;
  summary: string;
  timestamp: string;
}

// 컴포넌트 외부 상수 정의
const relationshipOptions = ["자녀", "배우자", "부모", "형제자매", "친척", "기타"];
const residenceOptions: { key: string; value: string }[] = [
  { key: "SINGLE_FAMILY_HOME", value: "단독주택" },
  { key: "MULTIPLEX_HOUSING", value: "다세대주택" },
  { key: "MULTI_FAMILY_HOUSING", value: "다가구주택" },
  { key: "APARTMENT", value: "아파트" },
];

// 유틸리티 함수
const isValidDate = (y: number, m: number, d: number) => {
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 시간 정보를 제거하여 날짜만 비교
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && date <= today;
};

const calculateAge = (birthDate: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // --- 상태 관리 ---
  const [isEditing, setIsEditing] = useState(false); // 수정 모드 여부 상태

  const initialFormState = {
    doll_id: "", name: "", birth_date: "", sex: "" as SeniorSex | "",
    phone: "", zip_code: "", address: "", address_detail: "",
    gu: "", dong: "", residence: "" as Residence | "",
    status: "정상", diseases: "", medications: "", disease_note: "",
    guardian_name: "", relationship: "", guardian_phone: "", guardian_note: "", note: "",
  };

  const [form, setForm] = useState(initialFormState);
  const [originalForm, setOriginalForm] = useState(initialFormState); // '취소'를 위한 원본 데이터 상태

  const [birth, setBirth] = useState({ year: "", month: "", day: "" });
  const [age, setAge] = useState<number | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null); // '취소'를 위한 원본 사진 상태

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const addressDetailRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // --- useEffect 훅 ---

  // Daum Postcode 스크립트 로드
  useEffect(() => {
    const scriptUrl = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
      const script = document.createElement("script");
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => setIsScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsScriptLoaded(true);
    }
  }, []);

  // 초기 데이터 로딩
  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        const { data } = await api.get(`/seniors/${id}`);
        console.log(data)
        const fetchedData = {
          doll_id: data.doll_id ?? "", name: data.name ?? "",
          birth_date: data.birth_date ?? "", sex: data.sex ?? "",
          phone: data.phone ?? "", zip_code: data.zip_code ?? "",
          address: data.address ?? "", address_detail: data.address_detail ?? "",
          gu: data.gu ?? "", dong: data.dong ?? "",
          residence: data.residence ?? "", status: data.state ?? "안전",
          diseases: data.diseases ?? "", medications: data.medications ?? "",
          disease_note: data.disease_note ?? "", guardian_name: data.guardian_name ?? "",
          relationship: data.relationship ?? "", guardian_phone: data.guardian_phone ?? "",
          guardian_note: data.guardian_note ?? "", note: data.note ?? "",
        };

        setForm(fetchedData);
        setOriginalForm(fetchedData);

        setBirth({
          year: data.birth_date?.slice(0, 4) ?? "",
          month: data.birth_date?.slice(5, 7) ?? "",
          day: data.birth_date?.slice(8, 10) ?? "",
        });

        setAge(calculateAge(data.birth_date ?? ""));
        setPhotoPreview(data.photo_url ? process.env.NEXT_PUBLIC_API_BASE_URL + "/" + data.photo_url : null);
        setOriginalPhoto(data.photo_url ?? null);

        // ✅ 최근 분석 최대 5개만 저장
        setAnalyses((data.recent_overall_results ?? []).slice(0, 5));
      } catch {
        alert("데이터를 불러오는 데 실패했습니다.");
      }
    };
    fetchData();
  }, [id]);


  // 생년월일 변경 시 나이 및 form.birth_date 업데이트
  useEffect(() => {
    const { year, month, day } = birth;
    if (year.length === 4 && month.length > 0 && day.length > 0) {
      const y = parseInt(year), m = parseInt(month), d = parseInt(day);
      if (isValidDate(y, m, d)) {
        const fullDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        setForm(prev => ({ ...prev, birth_date: fullDate }));
        setAge(calculateAge(fullDate));
      } else {
        setForm(prev => ({ ...prev, birth_date: "" }));
        setAge(null);
      }
    } else {
      setForm(prev => ({ ...prev, birth_date: "" }));
      setAge(null);
    }
  }, [birth]);

  // --- 이벤트 핸들러 ---

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleBirthChange = (e: ChangeEvent<HTMLInputElement>) => {
    setBirth(prev => ({ ...prev, [e.target.name]: e.target.value.replace(/\D/g, "") }));
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = value.replace(/\D/g, "").replace(/(\d{3})(\d{1,4})?(\d{1,4})?/, "$1-$2-$3").slice(0, 13);
    setForm(prev => ({ ...prev, [name]: formatted }));
  };

  const handleZipSearch = () => {
    if (isScriptLoaded && window.daum?.Postcode) {
      new window.daum.Postcode({
        oncomplete: (data: DaumPostcodeData) => {
          setForm(prev => ({
            ...prev,
            zip_code: data.zonecode ?? "",
            address: data.roadAddress ?? "",
            gu: data.sigungu ?? "",
            dong: data.bname ?? ""
          }));
          addressDetailRef.current?.focus();
        }
      }).open();
    }
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await api.post(`/seniors/${id}/photo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      // 실제 저장된 URL로 다시 한번 업데이트하여 일관성 유지
      setPhotoPreview(res.data.photo_url);
    } catch {
      alert("사진 업로드에 실패했습니다.");
      setPhotoPreview(originalPhoto); // 실패 시 원본 사진으로 복구
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm("사진을 삭제하시겠습니까?")) return;
    if (!id) return;
    try {
      await api.delete(`/seniors/${id}/photo`);
      setPhotoPreview(null);
      alert("사진이 삭제되었습니다.");
    } catch {
      alert("사진 삭제에 실패했습니다.");
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      // '취소' 시: 원본 데이터로 모든 상태를 복구
      setForm(originalForm);
      setPhotoPreview(originalPhoto);
      setBirth({
        year: originalForm.birth_date.slice(0, 4),
        month: originalForm.birth_date.slice(5, 7),
        day: originalForm.birth_date.slice(8, 10),
      });
    }
    setIsEditing(prev => !prev);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await api.put(`/seniors/${id}`, form);
      alert("성공적으로 저장되었습니다.");
      setOriginalForm(form); // 저장 후, 현재 폼 상태를 새로운 원본으로 지정
      setOriginalPhoto(photoPreview);
      setIsEditing(false); // 보기 모드로 전환
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("이 이용자의 모든 정보를 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      await api.delete(`/seniors/${id}`);
      alert("삭제되었습니다.");
      router.push("/main/users/view"); // 삭제 후 목록 페이지로 이동
    } catch {
      alert("삭제에 실패했습니다.");
    }
  };

  // --- 스타일 클래스 정의 ---
  const sectionTitleClass = "text-lg font-semibold text-gray-800 mb-1.5";
  const tableBorderClass = "border-gray-400";
  const tableClass = `w-full border-collapse text-sm border ${tableBorderClass}`;
  const thClass = `border ${tableBorderClass} bg-gray-50 font-medium p-2 text-center align-middle whitespace-nowrap`;
  const tdClass = `border ${tableBorderClass} p-2 align-middle`;
  const inputClass = "border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm read-only:bg-gray-100 read-only:cursor-default disabled:bg-gray-100 disabled:cursor-not-allowed";
  const requiredLabel = <span className="text-red-500 ml-1">*</span>;

  // --- JSX 렌더링 ---
  return (
    <div className="p-5 bg-white rounded-lg shadow-md max-w-5xl mx-auto text-black">
      <h1 className="text-2xl font-bold mb-4 text-center">
        {isEditing ? "이용자 정보 수정" : "이용자 상세 정보"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ----------------- 기본정보 ----------------- */}
        <section>
          <h2 className={sectionTitleClass}>■ 기본정보</h2>
          <table className={tableClass}>
            <colgroup><col className="w-34" /><col className="w-28" /><col className="w-45" /><col className="w-35" /><col className="w-auto" /></colgroup>
            <tbody>
              <tr>
                <td className={tdClass} rowSpan={5}>
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="relative w-28 h-36 border border-dashed rounded-md flex items-center justify-center bg-gray-50 overflow-hidden">
                      {photoPreview ? (
                        <Image src={photoPreview} alt="사진 미리보기" fill style={{ objectFit: "cover" }} />
                      ) : (
                        <span className="text-gray-400 text-sm">사진</span>
                      )}
                      {isUploading && <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-sm">업로드 중...</span>}
                    </div>
                    {isEditing && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => photoInputRef.current?.click()} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">사진 첨부</button>
                        {photoPreview && (
                          <button type="button" onClick={handlePhotoDelete} className="text-sm bg-red-200 px-3 py-1 rounded hover:bg-red-300">삭제</button>
                        )}
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handlePhotoChange} ref={photoInputRef} className="hidden" disabled={!isEditing} />
                  </div>
                </td>
                <th className={thClass}>이름{requiredLabel}</th>
                <td className={tdClass}>
                  <input name="name" value={form.name} onChange={handleChange} className={`${inputClass} w-full`} readOnly={!isEditing} required />
                </td>
                <th className={thClass}>생년월일 (나이){requiredLabel}</th>
                <td className={tdClass}>
                  <div className="flex items-center gap-1 flex-wrap">
                    <input name="year" value={birth.year} onChange={handleBirthChange} className={`${inputClass} w-20 text-center`} placeholder="YYYY" maxLength={4} readOnly={!isEditing} required />
                    <span className="mr-2">년</span>
                    <input name="month" value={birth.month} onChange={handleBirthChange} className={`${inputClass} w-14 text-center`} placeholder="MM" maxLength={2} readOnly={!isEditing} required />
                    <span className="mr-2">월</span>
                    <input name="day" value={birth.day} onChange={handleBirthChange} className={`${inputClass} w-14 text-center`} placeholder="DD" maxLength={2} readOnly={!isEditing} required />
                    <span className="mr-2">일</span>
                    <span>(만</span>
                    <input readOnly value={age ?? ""} className={`${inputClass} w-12 text-center mx-1 bg-gray-100`} />
                    <span>세)</span>
                  </div>
                </td>
              </tr>
              <tr>
                <th className={thClass}>성별{requiredLabel}</th>
                <td className={tdClass}>
                  <select name="sex" value={form.sex} onChange={handleChange} className={`${inputClass} w-full`} disabled={!isEditing} required>
                    <option value="">선택</option>
                    <option value="MALE">남</option>
                    <option value="FEMALE">여</option>
                  </select>
                </td>
                <th className={thClass}>연락처{requiredLabel}</th>
                <td className={tdClass}>
                  <input name="phone" value={form.phone} onChange={handlePhoneChange} className={`${inputClass} w-full`} placeholder="010-1234-5678" readOnly={!isEditing} required />
                </td>
              </tr>
              <tr>
                <th className={thClass}>현재 상태</th>
                <td className={tdClass}>
                  <input
                    readOnly
                    value={
                      {
                        emergency: "긴급",
                        critical: "위험",
                        danger: "주의",
                        positive: "안전",
                        normal: "정상",
                      }[form.status?.toLowerCase()] || form.status
                    }
                    className={`${inputClass} w-full text-center ${{
                        emergency: "text-red-600",
                        critical: "text-orange-500",
                        danger: "text-yellow-500",
                        positive: "text-green-600",
                        normal: "text-gray-600",
                      }[form.status?.toLowerCase()] || "text-gray-600"
                      }`}
                  />
                </td>
                <th className={thClass}>인형 ID{requiredLabel}</th>
                <td className={tdClass}><input name="doll_id" value={form.doll_id} onChange={handleChange} className={`${inputClass} w-full`} readOnly={!isEditing} required /></td>
              </tr>
              <tr>
                <th className={thClass}>주소{requiredLabel}</th>
                <td className={tdClass} colSpan={3}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input name="zip_code" value={form.zip_code} readOnly placeholder="우편번호" className={`${inputClass} w-24 bg-gray-100`} />
                      {isEditing && (
                        <button type="button" onClick={handleZipSearch} disabled={!isScriptLoaded} className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-400">
                          {isScriptLoaded ? "우편번호 검색" : "로딩 중"}
                        </button>
                      )}
                      <input name="address" value={form.address} readOnly placeholder="주소" className={`${inputClass} bg-gray-100 flex-grow`} />
                    </div>
                    <input name="address_detail" ref={addressDetailRef} value={form.address_detail} onChange={handleChange} placeholder="상세주소" className={`${inputClass} w-full`} readOnly={!isEditing} />
                  </div>
                </td>
              </tr>
              <tr>
                <th className={thClass}>거주 형태{requiredLabel}</th>
                <td className={tdClass} colSpan={3}>
                  <div className="flex items-center gap-4 flex-wrap py-1">
                    {residenceOptions.map((res, index) => (
                      <label key={res.key} className={`flex items-center gap-1.5 ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}>
                        <input
                          type="radio"
                          name="residence"
                          value={res.key}
                          checked={form.residence === res.key}
                          onChange={handleChange}
                          className="w-4 h-4"
                          disabled={!isEditing}
                          required={index === 0}
                        /> {res.value}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ----------------- 건강상태 ----------------- */}
        <section>
          <h2 className={sectionTitleClass}>■ 건강상태</h2>
          <table className={tableClass}>
            <colgroup><col className="w-34" /><col className="w-73" /><col className="w-35" /><col className="w-auto" /></colgroup>
            <tbody>
              <tr>
                <th className={thClass}>질병</th>
                <td className={tdClass}><input name="diseases" value={form.diseases} onChange={handleChange} className={`${inputClass} w-full`} readOnly={!isEditing} /></td>
                <th className={thClass}>복용 약물</th>
                <td className={tdClass}><input name="medications" value={form.medications} onChange={handleChange} className={`${inputClass} w-full`} readOnly={!isEditing} /></td>
              </tr>
              <tr>
                <th className={thClass}>상세 증상</th>
                <td className={tdClass} colSpan={3}><textarea name="disease_note" value={form.disease_note} onChange={handleChange} rows={3} className={`${inputClass} w-full`} readOnly={!isEditing} /></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ----------------- 보호자 ----------------- */}
        <section>
          <h2 className={sectionTitleClass}>■ 보호자</h2>
          <table className={tableClass}>
            <colgroup><col className="w-34" /><col className="w-73" /><col className="w-35" /><col className="w-auto" /></colgroup>
            <tbody>
              <tr>
                <th className={thClass}>이름{requiredLabel}</th>
                <td className={tdClass}><input name="guardian_name" value={form.guardian_name} onChange={handleChange} className={`${inputClass} w-full`} readOnly={!isEditing} required /></td>
                <th className={thClass}>연락처</th>
                <td className={tdClass}><input name="guardian_phone" value={form.guardian_phone} onChange={handlePhoneChange} className={`${inputClass} w-full`} placeholder="010-1234-5678" readOnly={!isEditing} /></td>
              </tr>
              <tr>
                <th className={thClass}>이용자와의 관계{requiredLabel}</th>
                <td className={tdClass}>
                  <select name="relationship" value={form.relationship} onChange={handleChange} className={`${inputClass} w-full`} disabled={!isEditing} required>
                    <option value="">선택</option>
                    {relationshipOptions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <th className={thClass}>비고</th>
                <td className={tdClass}><input name="guardian_note" value={form.guardian_note} onChange={handleChange} className={`${inputClass} w-full`} readOnly={!isEditing} /></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ----------------- 참고사항 ----------------- */}
        <section>
          <h2 className={sectionTitleClass}>■ 이외 참고사항</h2>
          <textarea name="note" value={form.note} onChange={handleChange} rows={3} className={`${inputClass} w-full`} readOnly={!isEditing} />
        </section>

        {/* ----------------- 최근 분석 ----------------- */}
        <section>
          <h2 className={sectionTitleClass}>■ 최근 분석 목록 (최대 5개까지)</h2>
          {analyses.length > 0 ? (
            <table className={tableClass}>
              <thead className="bg-gray-50">
                <tr>
                  <th className={thClass}>분석 내용</th>
                  <th className={thClass}>결과</th>
                  <th className={thClass}>날짜</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map(a => {
                  const labelMap: Record<string, { text: string; color: string }> = {
                    emergency: { text: "긴급", color: "text-red-600" },
                    critical: { text: "위험", color: "text-orange-500" },
                    danger: { text: "주의", color: "text-yellow-500" },
                    positive: { text: "안전", color: "text-green-600" },
                  };

                  const key = a.label.toLowerCase();
                  const { text: labelText, color: labelColor } = labelMap[key] || { text: a.label, color: "text-gray-600" };

                  return (
                    <tr
                      key={a.id}
                      className="cursor-pointer hover:bg-blue-50 transition-colors duration-150"
                      onClick={() => router.push(`/main/analysis/${a.id}`)}
                    >
                      <td className={tdClass}>{a.summary}</td>
                      <td className={`${tdClass} text-center ${labelColor} font-semibold`}>{labelText}</td>
                      <td className={`${tdClass} text-center`}>{new Date(a.timestamp).toLocaleString("ko-KR")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">최근 분석 기록이 없습니다.</p>
          )}
        </section>



        {/* ----------------- 버튼 영역 ----------------- */}
        <div className="flex justify-center gap-4 pt-4">
          {isEditing ? (
            <>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
                저장
              </button>
              <button type="button" onClick={handleToggleEdit} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                취소
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => router.push(`/main/users/edit/${id}`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
              >
                수정
              </button>

              <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer">
                삭제
              </button>
              <button type="button" onClick={() => router.push("/main/users/view")} className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300 cursor-pointer">
                목록으로
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}