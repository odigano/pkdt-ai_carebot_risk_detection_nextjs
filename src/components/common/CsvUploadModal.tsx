// src/components/common/CsvUploadModal.tsx
"use client";

import { useState, ChangeEvent, DragEvent } from "react";
import api from "@/lib/api";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";
// import { addNotification } from "@/lib/notification";  // 알림 추가 유틸 임포트

interface CsvUploadModalProps {
  onClose: () => void;
}

export default function CsvUploadModal({ onClose }: CsvUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const router = useRouter();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleDragEvents = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragover") setIsDragOver(true);
    if (e.type === "dragleave" || e.type === "drop") setIsDragOver(false);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("파일을 선택해주세요.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const analysisId = res.data?.id;
      if (analysisId) {
        // addNotification({
        //   id: Date.now(),
        //   type: "csv_upload",
        //   message: `CSV 분석이 완료되었습니다. 분석결과 보기 (ID: ${analysisId})`,
        //   link: `/main/analysis/${analysisId}`,
        //   isPersistent: false,
        // });
        onClose();
        router.push(`/main/analysis/${analysisId}`);
      } else {
        setError("분석 요청은 성공했으나, 결과 ID를 가져오지 못했습니다.");
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const status = err.response?.status;
        let serverMsg: string | undefined;
        if (err.response?.data && typeof err.response.data === "object") {
          const data = err.response.data as { error?: string };
          serverMsg = data.error;
        }

        if (status === 400) {
          setError(`CSV 파일 형식이 잘못되었거나 비어 있습니다.\n${serverMsg || ""}`);
        } else if (status === 401) {
          setError("인증이 만료되었습니다. 다시 로그인 해주세요.");
        } else if (status === 403) {
          setError("해당 기능을 사용할 권한이 없습니다. 관리자에게 문의하세요.");
        } else if (status === 404) {
          setError(
            "분석 대상 인형 ID가 없거나, 해당 인형에 시니어가 할당되지 않았습니다. CSV 파일의 doll_id를 확인해주세요."
          );
        } else if (status === 409) {
          setError("이미 등록된 인형 또는 중복된 데이터가 존재합니다. CSV 내용을 확인해주세요.");
        } else if (status === 500) {
          setError("서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } else if (status === 503) {
          setError("서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.");
        } else {
          setError(serverMsg || "알 수 없는 오류가 발생했습니다. 파일 형식을 확인해주세요.");
        }
      } else {
        setError("알 수 없는 오류가 발생했습니다. 파일 형식을 확인해주세요.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            대화 파일 분석 요청 (CSV)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-900 hover:text-black text-2xl font-bold"
            aria-label="닫기"
          >
            &times;
          </button>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragEvents}
          onDragLeave={handleDragEvents}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragOver ? "border-blue-600 bg-blue-100" : "border-gray-300 bg-white"}`}
        >
          <input
            type="file"
            id="csv-upload"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <label htmlFor="csv-upload" className="cursor-pointer">
            {!file ? (
              <>
                <p className="text-gray-900 font-medium">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-sm text-gray-600 mt-1">(.csv 형식만 가능)</p>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <p className="text-gray-900 font-medium">{file.name}</p>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  파일 제거
                </button>
              </div>
            )}
          </label>
        </div>

        {error && (
          <p className="text-center mt-4 text-sm text-red-600 font-medium">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className={`px-4 py-2 rounded-lg text-base cursor-pointer ${
              isUploading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gray-300 text-black hover:bg-gray-400"
            }`}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading || !file}
            className={`px-4 py-2 rounded-lg text-base cursor-pointer ${
              isUploading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            분석 요청
          </button>
        </div>
      </div>
    </div>
  );
}