// app/register/page.tsx
'use client';

import { useState, useEffect, useRef, ChangeEvent, FormEvent, FocusEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import api from "@/lib/api";
import { Residence, SeniorSex } from "@/types";
import { geocodeAddress } from "@/utils/geocode";

const isValidDate = (y: number, m: number, d: number): boolean => {
  const date = new Date(y, m - 1, d);
  const today = new Date();
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d && date <= today;
};

const calculateAge = (birthDate: string): number | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const relationshipOptions = ["자녀", "배우자", "부모", "형제자매", "친척", "기타"];
const residenceOptions: { key: string; value: string }[] = [
  { key: "SINGLE_FAMILY_HOME", value: "단독주택" },
  { key: "MULTIPLEX_HOUSING", value: "다세대주택" },
  { key: "MULTI_FAMILY_HOUSING", value: "다가구주택" },
  { key: "APARTMENT", value: "아파트" },
];

interface FormState {
  doll_id: string;
  name: string;
  birth_date: string;
  sex: SeniorSex | "";
  phone: string;
  zip_code: string;
  address: string;
  address_detail: string;
  gu: string;
  dong: string;
  residence: Residence | "";
  status: string;
  diseases: string;
  medications: string;
  disease_note: string;
  guardian_name: string;
  relationship: string;
  guardian_phone: string;
  guardian_note: string;
  note: string;
  lat: number;
  lng: number;
}

export default function UserRegisterPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const [form, setForm] = useState<FormState>({
    doll_id: "",
    name: "",
    birth_date: "",
    sex: "",
    phone: "",
    zip_code: "",
    address: "",
    address_detail: "",
    gu: "",
    dong: "",
    residence: "",
    status: "정상",
    diseases: "",
    medications: "",
    disease_note: "",
    guardian_name: "",
    relationship: "",
    guardian_phone: "",
    guardian_note: "",
    note: "",
    lat: 0,
    lng: 0,
  });

  const [birth, setBirth] = useState({ year: "", month: "", day: "" });
  const [age, setAge] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const addressDetailRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // --- 다음 우편번호 스크립트 로드 ---
  useEffect(() => {
    const scriptUrl = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      setIsScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  // --- 생년월일 → 나이 계산 ---
  useEffect(() => {
    const { year, month, day } = birth;
    if (year.length === 4 && month.length > 0 && day.length > 0) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);
      if (isValidDate(y, m, d)) {
        const full = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        setForm((prev) => ({ ...prev, birth_date: full }));
        setAge(calculateAge(full));
      } else {
        setForm((prev) => ({ ...prev, birth_date: "" }));
        setAge(null);
      }
    } else {
      setForm((prev) => ({ ...prev, birth_date: "" }));
      setAge(null);
    }
  }, [birth]);

  // --- 폼 change handler ---
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleBirthChange = (e: ChangeEvent<HTMLInputElement>) =>
    setBirth((prev) => ({ ...prev, [e.target.name]: e.target.value.replace(/\D/g, "") }));

  const handleBirthBlur = (e: FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (!value) return;
    const num = parseInt(value, 10);
    let newValue = value;
    if (name === "month") newValue = String(Math.max(1, Math.min(12, num))).padStart(2, "0");
    if (name === "day") newValue = String(Math.max(1, Math.min(31, num))).padStart(2, "0");
    if (newValue !== value) setBirth((prev) => ({ ...prev, [name]: newValue }));
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = value.replace(/\D/g, "").replace(/(\d{3})(\d{1,4})?(\d{1,4})?/, "$1-$2-$3").slice(0, 13);
    setForm((prev) => ({ ...prev, [name]: formatted }));
  };

  // --- 주소 검색 & 좌표 변환 ---
  const handleZipSearch = () => {
    if (!isScriptLoaded || !window.daum?.Postcode) {
      alert("주소 검색 스크립트가 아직 로드되지 않았습니다.");
      return;
    }
    const Postcode = window.daum.Postcode;

    new Postcode({
      oncomplete: async (data: {
        zonecode: string;
        roadAddress: string;
        sigungu: string;
        bname: string;
      }) => {
        setForm((prev) => ({
          ...prev,
          zip_code: data.zonecode || "",
          address: data.roadAddress || "",
          gu: data.sigungu || "",
          dong: data.bname || "",
        }));
        addressDetailRef.current?.focus();

        const coords = await geocodeAddress(data.roadAddress || "");
        if (coords) setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
      },
    }).open();
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // --- 제출 handler ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const required = [
      form.doll_id,
      form.name,
      form.birth_date,
      form.sex,
      form.phone,
      form.address,
      form.gu,
      form.dong,
      form.residence,
      form.guardian_name,
      form.guardian_phone,
      form.relationship,
    ];
    if (required.some((v) => !v)) {
      alert("필수 항목(*)을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const dollRes = await api.get(`/dolls/${form.doll_id.trim()}`);
      if (!dollRes.data) {
        alert("해당 인형이 존재하지 않습니다.");
        setIsSubmitting(false);
        return;
      }

      if (dollRes.data.senior_assigned) {
        alert(`해당 인형(ID: ${form.doll_id})은 이미 "${dollRes.data.senior_name}" 이용자에게 배정되어 있습니다.`);
        setIsSubmitting(false);
        return;
      }

      const seniorPayload = { ...form };
      const formData = new FormData();
      formData.append("senior", new Blob([JSON.stringify(seniorPayload)], { type: "application/json" }));
      if (photoFile) formData.append("photo", photoFile);

      await api.post("/seniors", formData, { headers: { "Content-Type": "multipart/form-data" } });
      alert("이용자 등록 완료!");
      router.push("/main/users/view");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const serverMsg = err.response?.data?.message;
        if (status === 400) alert(`요청 형식이 올바르지 않습니다.\n${serverMsg || ""}`);
        else if (status === 401) alert("인증이 만료되었습니다. 다시 로그인 해주세요.");
        else if (status === 403) alert("수정 권한이 없습니다.");
        else if (status === 404) alert("이용자 정보를 찾을 수 없습니다.");
        else if (status === 409) alert("이미 등록된 인형 또는 중복 데이터가 존재합니다.");
        else if (status === 500) alert("서버 내부 오류가 발생했습니다.");
        else alert(serverMsg || "알 수 없는 오류가 발생했습니다.");
      } else {
        alert("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitleClass = "text-lg font-semibold text-gray-800 mb-1.5";
  const tableBorderClass = "border-gray-400";
  const tableClass = `w-full border-collapse text-sm border ${tableBorderClass}`;
  const thClass = `border ${tableBorderClass} bg-gray-50 font-medium p-2 text-center`;
  const tdClass = `border ${tableBorderClass} p-2`;
  const inputClass = "border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm";
  const requiredLabel = <span className="text-red-500 ml-1">*</span>;

  return (
    <div className="p-5 bg-white rounded-lg shadow-md max-w-5xl mx-auto text-black space-y-6">
      <h1 className="text-2xl font-bold mb-4 text-center">이용자 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 기본정보 섹션 */}
        <section>
          <h2 className={sectionTitleClass}>■ 기본정보</h2>
          <table className={tableClass}>
            <tbody>
              <tr>
                <td rowSpan={5} className={tdClass}>
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <div className="relative w-28 h-36 border border-dashed rounded-md flex items-center justify-center bg-gray-50 overflow-hidden">
                      {photoPreview ? (
                        <Image src={photoPreview} alt="사진 미리보기" fill style={{ objectFit: "cover" }} />
                      ) : <span className="text-gray-400 text-sm">사진</span>}
                    </div>
                    <input type="file" accept="image/*" onChange={handlePhotoChange} ref={photoInputRef} className="hidden" />
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">사진 첨부</button>
                  </div>
                </td>
                <th className={thClass}>이름{requiredLabel}</th>
                <td className={tdClass}><input name="name" value={form.name} onChange={handleChange} className={`${inputClass} w-full`} required /></td>
                <th className={thClass}>생년월일 (나이){requiredLabel}</th>
                <td className={tdClass}>
                  <div className="flex items-center gap-1">
                    <input name="year" value={birth.year} onChange={handleBirthChange} onBlur={handleBirthBlur} className={`${inputClass} w-20 text-center`} placeholder="YYYY" maxLength={4} required />
                    <span className="mr-2">년</span>
                    <input name="month" value={birth.month} onChange={handleBirthChange} onBlur={handleBirthBlur} className={`${inputClass} w-14 text-center`} placeholder="MM" maxLength={2} required />
                    <span className="mr-2">월</span>
                    <input name="day" value={birth.day} onChange={handleBirthChange} onBlur={handleBirthBlur} className={`${inputClass} w-14 text-center`} placeholder="DD" maxLength={2} required />
                    <span className="mr-2">일</span>
                    <span>(만</span>
                    <input readOnly value={age ?? ""} className={`${inputClass} w-15 text-center mx-1 bg-gray-100`} />
                    <span>세)</span>
                  </div>
                </td>
              </tr>

              <tr>
                <th className={thClass}>성별{requiredLabel}</th>
                <td className={tdClass}>
                  <select name="sex" value={form.sex} onChange={handleChange} className={`${inputClass} w-full bg-white`} required>
                    <option value="">선택</option>
                    <option value="MALE">남</option>
                    <option value="FEMALE">여</option>
                  </select>
                </td>
                <th className={thClass}>연락처{requiredLabel}</th>
                <td className={tdClass}>
                  <input name="phone" value={form.phone} onChange={handlePhoneChange} className={`${inputClass} w-full bg-white`} placeholder="010-1234-5678" required />
                </td>
              </tr>

              <tr>
                <th className={thClass}>주소{requiredLabel}</th>
                <td className={tdClass} colSpan={3}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input name="zip_code" value={form.zip_code} readOnly placeholder="우편번호" className={`${inputClass} w-30 bg-gray-100`} />
                      <button type="button" onClick={handleZipSearch} disabled={!isScriptLoaded} className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-sm hover:bg-blue-600 disabled:bg-gray-400 cursor-pointer">
                        {isScriptLoaded ? "우편번호 검색" : "로딩 중"}
                      </button>
                      <input name="address" value={form.address} readOnly placeholder="주소" className={`${inputClass} bg-gray-100 flex-grow`} />
                    </div>
                    <input name="address_detail" ref={addressDetailRef} value={form.address_detail} onChange={handleChange} placeholder="상세주소" className={`${inputClass} w-full`} />
                  </div>
                </td>
              </tr>

              <tr>
                <th className={thClass}>거주 형태{requiredLabel}</th>
                <td className={tdClass} colSpan={3}>
                  <div className="flex items-center gap-4 flex-wrap py-1">
                    {residenceOptions.map((res, index) => (
                      <label key={res.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input type="radio" name="residence" value={res.key} checked={form.residence === res.key} onChange={handleChange} className="w-4 h-4" required={index === 0} />
                        {res.value}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 건강 상태 */}
        <section>
          <h2 className={sectionTitleClass}>■ 건강상태</h2>
          <table className={tableClass}>
            <tbody>
              <tr>
                <th className={thClass}>질병</th>
                <td className={tdClass}><input name="diseases" value={form.diseases} onChange={handleChange} className={`${inputClass} w-full bg-white`} /></td>
                <th className={thClass}>복용 약물</th>
                <td className={tdClass}><input name="medications" value={form.medications} onChange={handleChange} className={`${inputClass} w-full bg-white`} /></td>
              </tr>
              <tr>
                <th className={thClass}>상세 증상</th>
                <td className={tdClass} colSpan={3}><textarea name="disease_note" value={form.disease_note} onChange={handleChange} rows={3} className={`${inputClass} w-full bg-white`} /></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 보호자 정보 */}
        <section>
          <h2 className={sectionTitleClass}>■ 보호자</h2>
          <table className={tableClass}>
            <tbody>
              <tr>
                <th className={thClass}>이름{requiredLabel}</th>
                <td className={tdClass}><input name="guardian_name" value={form.guardian_name} onChange={handleChange} className={`${inputClass} w-full bg-white`} required /></td>
                <th className={thClass}>연락처{requiredLabel}</th>
                <td className={tdClass}><input name="guardian_phone" value={form.guardian_phone} onChange={handlePhoneChange} className={`${inputClass} w-full bg-white`} placeholder="010-1234-5678" required /></td>
              </tr>
              <tr>
                <th className={thClass}>이용자와의 관계{requiredLabel}</th>
                <td className={tdClass}>
                  <select name="relationship" value={form.relationship} onChange={handleChange} className={`${inputClass} w-full bg-white`} required>
                    <option value="">선택</option>
                    {relationshipOptions.map((option) => (<option key={option} value={option}>{option}</option>))}
                  </select>
                </td>
                <th className={thClass}>참고사항</th>
                <td className={tdClass}><input name="guardian_note" value={form.guardian_note} onChange={handleChange} className={`${inputClass} w-full bg-white`} /></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 이외 참고사항 */}
        <section>
          <h2 className={sectionTitleClass}>■ 이외 참고사항</h2>
          <table className={tableClass}>
            <tbody>
              <tr>
                <th className={thClass}>참고사항</th>
                <td className={tdClass}><textarea name="note" value={form.note} onChange={handleChange} rows={3} className={`${inputClass} w-full bg-white`} /></td>
              </tr>
            </tbody>
          </table>
        </section>

        <div className="flex justify-center pt-2">
          <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 cursor-pointer">
            저장
          </button>
        </div>
      </form>
    </div>
  );
}