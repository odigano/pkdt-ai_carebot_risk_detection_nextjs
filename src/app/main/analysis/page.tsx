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
import { PagedResponse } from "@/types";
import * as XLSX from "xlsx";

interface AnalysisResultView {
  overall_result_id: number;
  label: "POSITIVE" | "DANGER" | "CRITICAL" | "EMERGENCY";
  summary: string;
  timestamp: string;
  doll_id: string;
  senior_id: number;
  name: string;
  age: number;
  sex: "MALE" | "FEMALE";
  gu: string;
  dong: string;
}

interface Dong {
  dong_code: string;
  dong_name: string;
}
interface Gu {
  gu_code: string;
  gu_name: string;
  dong_list: Dong[];
}

const labelMap: Record<string, string> = {
  EMERGENCY: "긴급",
  CRITICAL: "위험",
  DANGER: "주의",
  POSITIVE: "안전",
};
const labelApiKeys = Object.keys(labelMap);

export default function AnalysisPage() {
  const router = useRouter();

  const [data, setData] = useState<AnalysisResultView[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const [searchParams, setSearchParams] = useState({
    name: "",
    senior_id: "",
    gu: "",
    dong: "",
    label: "",
    doll_id: "",
    age_group: "",
    sex: "",
    start_date: "",
    end_date: "",
  });

  const [administrativeDistricts, setAdministrativeDistricts] = useState<Gu[]>([]);
  const [availableDongs, setAvailableDongs] = useState<Dong[]>([]);

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  useEffect(() => {
    const fetchAdminDistricts = async () => {
      try {
        const res = await api.get<Gu[]>("/administrative-districts");
        setAdministrativeDistricts(res.data);
      } catch (error) {
        console.error("Failed to fetch administrative districts:", error);
      }
    };
    fetchAdminDistricts();
  }, []);

  useEffect(() => {
    if (searchParams.gu) {
      const selectedGu = administrativeDistricts.find((g) => g.gu_code === searchParams.gu);
      setAvailableDongs(selectedGu?.dong_list || []);
    } else {
      setAvailableDongs([]);
    }
    setSearchParams((prev) => ({ ...prev, dong: "" }));
  }, [searchParams.gu, administrativeDistricts]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageIndex.toString(),
        size: pageSize.toString(),
        sort: "timestamp,desc",
      });
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
      const res = await api.get<PagedResponse<AnalysisResultView>>(
        `/analyze?${queryParams.toString()}`
      );
      setData(res.data.content);
      setPageCount(res.data.total_pages);
      setTotalElements(res.data.total_elements);
    } catch (error) {
      console.error("Failed to fetch analysis data:", error);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, searchParams]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [fetchData]);

  const columns = useMemo<ColumnDef<AnalysisResultView>[]>(() => [
    { id: "index", header: () => <div className="text-center">순번</div>, cell: (info) => info.row.index + 1 },
    { accessorKey: "doll_id", header: () => <div className="text-center">인형 ID</div> },
    { accessorKey: "senior_id", header: () => <div className="text-center">이용자 번호</div> },
    { accessorKey: "name", header: () => <div className="text-center">이름</div> },
    { accessorKey: "age", header: () => <div className="text-center">나이</div> },
    { accessorKey: "sex", header: () => <div className="text-center">성별</div>, cell: (info) => (info.getValue() === "MALE" ? "남" : "여") },
    { accessorKey: "gu", header: () => <div className="text-center">자치구</div> },
    { accessorKey: "dong", header: () => <div className="text-center">법정동</div> },
    { accessorKey: "label", header: () => <div className="text-center">분석 결과</div>, cell: (info) => labelMap[info.getValue() as string] || info.getValue() },
    {
      accessorKey: "summary", header: "요약", cell: ({ row }) => (
        <button
          // ✅ [핵심 수정] router.push에 쿼리 파라미터로 senior_id를 추가합니다.
          onClick={() => {
            const resultId = row.original.overall_result_id;
            const seniorId = row.original.senior_id;
            router.push(`/main/analysis/${resultId}?senior_id=${seniorId}`);
          }}
          className="text-blue-600 hover:underline text-left cursor-pointer"
        >
          {row.original.summary}
        </button>
      )
    },
    { accessorKey: "timestamp", header: "분석 일시", cell: (info) => new Date(info.getValue() as string).toLocaleString("ko-KR") },
  ], [router]);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    table.setPageIndex(0);
    setSearchParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => fetchData();

  const handleReset = () => {
    setSearchParams({ name: "", senior_id: "", gu: "", dong: "", label: "", doll_id: "", age_group: "", sex: "", start_date: "", end_date: "" });
    table.setPageIndex(0);
  };

  const handleExcelDownload = async () => {
    setIsDownloading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => { if (value) queryParams.append(key, value); });
      queryParams.append("size", "10000");
      queryParams.append("sort", "timestamp,desc");

      const res = await api.get<PagedResponse<AnalysisResultView>>(`/analyze?${queryParams.toString()}`);
      const allData = res.data.content;
      if (!allData.length) return;

      const excelData = allData.map((item, index) => ({
        순번: index + 1,
        "인형 ID": item.doll_id,
        "이용자 번호": item.senior_id,
        이름: item.name,
        나이: item.age,
        성별: item.sex === "MALE" ? "남" : "여",
        자치구: item.gu,
        법정동: item.dong,
        "분석 결과": labelMap[item.label] || item.label,
        요약: item.summary,
        분석일시: new Date(item.timestamp).toLocaleString("ko-KR"),
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet["!cols"] = [{ wch: 5 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 6 }, { wch: 6 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 50 }, { wch: 20 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "데이터 분석 목록");
      XLSX.writeFile(workbook, `데이터_분석_목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

    const renderPageNumbers = () => {
    const totalPages = table.getPageCount();
    const currentPage = pageIndex + 1;
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);
      if (currentPage <= 3) { startPage = 1; endPage = maxPagesToShow; }
      else if (currentPage >= totalPages - 2) { startPage = totalPages - maxPagesToShow + 1; endPage = totalPages; }
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    }
    return pageNumbers.map((number) => (
      <button
        key={number}
        onClick={() => table.setPageIndex(number - 1)}
        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${currentPage === number ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"}`}
      >
        {number}
      </button>
    ));
  };

  return (
    <div className="p-4 space-y-2 text-black">
      <div className="mb-2">
        <div className="text-center">
          <h2 className="text-2xl font-bold">전체 분석 결과</h2>
        </div>
      </div>
      {/* 검색 영역 */}
      <div className="bg-white p-3 rounded-lg shadow-md space-y-3">
        <div className="flex justify-end">
          <button
            onClick={handleExcelDownload}
            disabled={isDownloading}
            className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-bold text-sm cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            엑셀 다운로드
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y- items-center text-sm">
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">자치구</label>
            <select name="gu" value={searchParams.gu} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              {administrativeDistricts.map(g => <option key={g.gu_code} value={g.gu_code}>{g.gu_name}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">법정동</label>
            <select name="dong" value={searchParams.dong} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white" disabled={!searchParams.gu}>
              <option value="">전체</option>
              {availableDongs.map(d => <option key={d.dong_code} value={d.dong_code}>{d.dong_name}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">분석 결과</label>
            <select name="label" value={searchParams.label} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              {labelApiKeys.map(key => <option key={key} value={key}>{labelMap[key]}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">연령대</label>
            <select name="age_group" value={searchParams.age_group} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              <option value="60">60대</option>
              <option value="70">70대</option>
              <option value="80">80대</option>
              <option value="90">90대</option>
              <option value="100">100세 이상</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">성별</label>
            <select name="sex" value={searchParams.sex} onChange={handleInputChange} className="w-full border rounded px-2 h-8 bg-white">
              <option value="">전체</option>
              <option value="MALE">남성</option>
              <option value="FEMALE">여성</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-3 items-center text-sm">
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">이름</label>
            <input name="name" placeholder="이름" value={searchParams.name} onChange={handleInputChange} className="w-full border rounded px-2 h-8" />
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">인형 ID</label>
            <input name="doll_id" placeholder="인형 ID" value={searchParams.doll_id} onChange={handleInputChange} className="w-full border rounded px-2 h-8" />
          </div>
          <div className="flex items-center">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">이용자 번호</label>
            <input name="senior_id" placeholder="번호" value={searchParams.senior_id} onChange={handleInputChange} className="w-full border rounded px-2 h-8" />
          </div>
          <div className="flex items-center col-span-1 md:col-span-2">
            <label className="w-20 shrink-0 font-semibold text-gray-700 text-right pr-2">분석일</label>
            <input type="date" name="start_date" value={searchParams.start_date} onChange={handleInputChange} className="w-full border rounded px-2 h-8" />
            <span className="mx-2">~</span>
            <input type="date" name="end_date" value={searchParams.end_date} onChange={handleInputChange} className="w-full border rounded px-2 h-8" />
          </div>
        </div>

        <div className="flex justify-center space-x-3">
          <button onClick={handleSearch} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 font-semibold text-sm cursor-pointer">검색</button>
          <button onClick={handleReset} className="bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400 font-semibold text-sm cursor-pointer">초기화</button>
        </div>
      </div>

      {/* 결과 테이블 */}
      <div className="bg-white p-3 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-3">
          <span className="font-semibold text-sm">검색 결과 : 총 {totalElements}건</span>
          <select value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))} className="border rounded px-2 py-1 bg-white text-sm">
            {[10, 20, 30, 40, 50].map(size => <option key={size} value={size}>{size}개씩 보기</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-gray-600">
            <thead className="text-sm text-gray-700 uppercase bg-gray-100">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="px-2 py-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="text-center py-10">데이터를 불러오는 중입니다...</td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="text-center py-10">검색 결과가 없습니다.</td></tr>
              ) : (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="bg-white border-b hover:bg-gray-50">
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className={`px-2 py-2 align-middle ${cell.column.id === 'summary' ? 'text-left' : ''} ${cell.column.id === 'timestamp' ? 'text-right pr-4' : 'text-center'}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm">
          <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className={`px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer ${table.getCanPreviousPage() ? "text-black" : "text-gray-400"}`}>{'<<'}</button>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className={`px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer ${table.getCanPreviousPage() ? "text-black" : "text-gray-400"}`}>{'<'}</button>
          <div className="flex gap-2 min-w-[200px] justify-between">{renderPageNumbers()}</div>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className={`px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer ${table.getCanNextPage() ? "text-black" : "text-gray-400"}`}>{'>'}</button>
          <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className={`px-2.5 py-1 disabled:opacity-50 hover:bg-gray-100 cursor-pointer ${table.getCanNextPage() ? "text-black" : "text-gray-400"}`}>{'>>'}</button>
        </div>
      </div>
    </div>
  );
}