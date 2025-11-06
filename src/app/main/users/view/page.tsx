"use client";

import { useState, useEffect, useMemo, ChangeEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
  PaginationState,
} from "@tanstack/react-table";
import api from "@/lib/api";
import { SeniorListView, PagedResponse } from "@/types";

// 구/동 데이터 (주신 전체 데이터 적용)
const guOptions: {
  [guName: string]: { gu_code: string; dong_list: { dong_code: string; dong_name: string }[] };
} = {
  "동구": { gu_code: "DONG_GU", dong_list: [
    "원동","정동","중동","소제동","신안동","인동","신흥동","효동","천동","가오동",
    "판암동","삼정동","용운동","대동","자양동","가양동","용전동","성남동","홍도동",
    "삼성동","추동","비룡동","주산동","용계동","마산동","효평동","직동","세천동",
    "신상동","신하동","신촌동","사성동","내탑동","오동","주촌동","낭월동","대별동",
    "이사동","대성동","장척동","소호동","구도동","삼괴동","상소동","하소동"
  ].map(d => ({ dong_code: d, dong_name: d }))},
  "중구": { gu_code: "JUNG_GU", dong_list: [
    "은행동","선화동","목동","중촌동","대흥동","문창동","석교동","옥계동","호동","대사동",
    "부사동","용두동","오류동","태평동","유천동","문화동","산성동","사정동","안영동",
    "구완동","무수동","침산동","목달동","정생동","어남동","금동"
  ].map(d => ({ dong_code: d, dong_name: d }))},
  "서구": { gu_code: "SEO_GU", dong_list: [
    "복수동","도마동","정림동","괴곡동","변동","용문동","탄방동","둔산동","괴정동",
    "가장동","내동","갈마동","월평동","만년동","가수원동","도안동","관저동","흑석동",
    "매노동","산직동","장안동","평촌동","오동","우명동","원정동","용촌동","봉곡동"
  ].map(d => ({ dong_code: d, dong_name: d }))},
  "유성구": { gu_code: "YUSEONG_GU", dong_list: [
    "성북동","세동","송정동","방동","원내동","교촌동","대정동","용계동","학하동","계산동",
    "덕명동","복용동","원신흥동","봉명동","상대동","구암동","장대동","죽동","궁동","어은동",
    "구성동","갑동","노은동","하기동","지족동","수남동","안산동","외삼동","반석동","신성동",
    "가정동","도룡동","장동","방현동","화암동","덕진동","추목동","자운동","신봉동","전민동",
    "문지동","원촌동","봉산동","송강동","금고동","대동","금탄동","신동","둔곡동","구룡동",
    "관평동","용산동","탑립동"
  ].map(d => ({ dong_code: d, dong_name: d }))},
  "대덕구": { gu_code: "DAEDEOK_GU", dong_list: [
    "오정동","대화동","읍내동","연축동","신대동","와동","장동","비래동","송촌동","중리동",
    "법동","신탄진동","삼정동","용호동","이현동","갈전동","부수동","황호동","미호동","석봉동",
    "덕암동","상서동","평촌동","목상동","문평동","신일동"
  ].map(d => ({ dong_code: d, dong_name: d }))}
};

// 상태 한글 매핑
const statusMap: Record<string, string> = {
  EMERGENCY: "긴급",
  CRITICAL: "위험",
  DANGER: "주의",
  POSITIVE: "안전",
};
const statusApiKeys = Object.keys(statusMap);

export default function UsersViewPage() {
  const router = useRouter();
  const [data, setData] = useState<SeniorListView[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useState({
    name: "", phone: "", gu: "", dong: "", state: "", doll_id: "", age_group: "", sex: "", senior_id: ""
  });

  const [availableDongs, setAvailableDongs] = useState<{ dong_code: string; dong_name: string }[]>([]);

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  useEffect(() => {
    if (searchParams.gu && guOptions[searchParams.gu]) {
      setAvailableDongs(guOptions[searchParams.gu].dong_list);
    } else setAvailableDongs([]);
    setSearchParams(prev => ({ ...prev, dong: "" }));
  }, [searchParams.gu]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageIndex.toString(),
        size: pageSize.toString(),
        sort: "created_at,desc",
      });
      Object.entries(searchParams).forEach(([key, value]) => { if (value) queryParams.append(key, value); });

      const res = await api.get<PagedResponse<SeniorListView>>(`/seniors?${queryParams.toString()}`);
      setData(res.data.content);
      setPageCount(res.data.total_pages);
      setTotalElements(res.data.total_elements);
    } catch (err) {
      console.error("이용자 목록 불러오기 실패:", err);
      alert("이용자 목록을 불러오는 데 실패했습니다.");
    } finally { setLoading(false); }
  }, [pageIndex, pageSize, searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const columns = useMemo<ColumnDef<SeniorListView>[]>(() => [
    { id: "index", header: "순번", cell: info => pageIndex * pageSize + info.row.index + 1 },
    { accessorKey: "senior_id", header: "이용자 번호" },
    { accessorKey: "name", header: "이름", cell: info =>
      <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => router.push(`/main/users/view/${info.row.original.senior_id}`)}>
        {info.getValue() as string}
      </span>
    },
    { accessorKey: "age", header: "나이" },
    { accessorKey: "sex", header: "성별", cell: info => (info.getValue() === "MALE" ? "남" : "여") },
    { accessorKey: "gu", header: "자치구" },
    { accessorKey: "dong", header: "법정동", cell: info => {
      const guName = searchParams.gu; const dongCode = info.getValue() as string;
      const dong = guOptions[guName]?.dong_list.find(d => d.dong_code === dongCode);
      return dong?.dong_name || dongCode;
    }},
    { accessorKey: "state", header: "현재 상태", cell: info => statusMap[info.getValue() as string] || (info.getValue() as string) },
    { accessorKey: "doll_id", header: "인형 ID" },
    { accessorKey: "phone", header: "전화번호" },
    { accessorKey: "created_at", header: "등록일", cell: info => new Date(info.getValue() as string).toLocaleDateString() },
  ], [router, pageIndex, pageSize, searchParams.gu]);

  const table = useReactTable({
    data, columns, pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target; table.setPageIndex(0);
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };
  const handleSearch = () => fetchData();
  const handleReset = () => { setSearchParams({ name: "", phone: "", gu: "", dong: "", state: "", doll_id: "", age_group: "", sex: "", senior_id: "" }); table.setPageIndex(0); };
  const handleRegister = () => router.push("/main/users/register");

  return (
    <div className="p-2 space-y-2 text-black">
      <h2 className="text-2xl font-bold text-center">이용자 관리</h2>

      {/* 검색창 */}
      <div className="bg-white p-3 rounded-lg shadow-sm space-y-2">
        <div className="flex justify-end">
          <button onClick={handleRegister} className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-bold text-sm cursor-pointer">등록</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-x-6 gap-y-3 items-center text-sm">
          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">현재 상태</label>
            <select name="state" value={searchParams.state} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              {statusApiKeys.map(k => <option key={k} value={k}>{statusMap[k]}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">이용자 번호</label>
            <input name="senior_id" value={searchParams.senior_id} onChange={handleInputChange} placeholder="번호" className="w-full border rounded px-2 h-8" />
          </div>

          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">이름</label>
            <input name="name" value={searchParams.name} onChange={handleInputChange} placeholder="이름" className="w-full border rounded px-2 h-8" />
          </div>

          <div className="lg:col-span-4 flex items-center">
            <label className="w-40 font-medium text-gray-700 pr-2 text-right">휴대폰 번호</label>
            <input name="phone" value={searchParams.phone} onChange={handleInputChange} placeholder="'-' 없이 숫자" className="w-full border rounded px-2 h-8" />
          </div>

          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">연령대</label>
            <select name="age_group" value={searchParams.age_group} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              {[60,70,80,90,100].map(a => <option key={a} value={a}>{a===100?'100세 이상':`${a}대`}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">성별</label>
            <select name="sex" value={searchParams.sex} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              <option value="MALE">남</option>
              <option value="FEMALE">여</option>
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">자치구</label>
            <select name="gu" value={searchParams.gu} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              {Object.keys(guOptions).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">법정동</label>
            <select name="dong" value={searchParams.dong} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white" disabled={!searchParams.gu}>
              <option value="">전체</option>
              {availableDongs.map(d => <option key={d.dong_code} value={d.dong_code}>{d.dong_name}</option>)}
            </select>
          </div>

          <div className="lg:col-span-2 flex items-center">
            <label className="w-28 font-medium text-gray-700 pr-2 text-right">인형 ID</label>
            <input name="doll_id" value={searchParams.doll_id} onChange={handleInputChange} placeholder="인형 ID" className="w-full border rounded px-2 h-8" />
          </div>
        </div>

        <div className="flex justify-center gap-2 pt-1">
          <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-semibold text-sm cursor-pointer">검색</button>
          <button onClick={handleReset} className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400 font-semibold text-sm cursor-pointer">초기화</button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex justify-between items-center text-sm mb-3">
          <span>총 <strong>{totalElements}</strong>명</span>
          <select value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))} className="border rounded px-2 py-1 bg-white text-sm">
            {[10,20,30,50].map(s => <option key={s} value={s}>{s}개씩 보기</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm text-center">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>{hg.headers.map(h => <th key={h.id} className="border-b px-2 py-2 font-medium text-gray-600">{flexRender(h.column.columnDef.header,h.getContext())}</th>)}</tr>
              ))}
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={columns.length} className="text-center py-10">목록을 불러오는 중...</td></tr> :
              table.getRowModel().rows.length>0 ? table.getRowModel().rows.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 border-b">{r.getVisibleCells().map(c => <td key={c.id} className="px-2 py-2">{flexRender(c.column.columnDef.cell,c.getContext())}</td>)}</tr>
              )) : <tr><td colSpan={columns.length} className="text-center text-gray-500 py-10">검색 결과가 없습니다.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="flex justify-center items-center mt-2 space-x-2 text-sm cursor-pointer">
          <button onClick={()=>table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer">{'<<'}</button>
          <button onClick={()=>table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer">{'<'}</button>
          {Array.from({length: Math.min(5,pageCount-Math.floor(pageIndex/5)*5)},(_,i)=>{
            const pn = Math.floor(pageIndex/5)*5 + i;
            if(pn<pageCount) return <button key={pn} onClick={()=>table.setPageIndex(pn)} className={`px-3 py-1 rounded-md ${pn===pageIndex?'bg-blue-500 text-white font-bold':'text-black hover:underline'} cursor-pointer`}>{pn+1}</button>
          })}
          <button onClick={()=>table.nextPage()} disabled={!table.getCanNextPage()} className="px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer">{'>'}</button>
          <button onClick={()=>table.setPageIndex(pageCount-1)} disabled={!table.getCanNextPage()} className="px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer">{'>>'}</button>
        </div>
      </div>
    </div>
  );
}
