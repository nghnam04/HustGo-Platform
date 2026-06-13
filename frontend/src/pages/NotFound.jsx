import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col items-center justify-center p-4 relative">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-8xl font-black font-mono tracking-tighter text-[#991b1b]">
          404
        </h1>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Không tìm thấy trang
          </h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">
            Đường dẫn bạn đang truy cập không tồn tại hoặc đã bị thay đổi
          </p>
        </div>

        {/* Nút quay lại tinh giản */}
        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 px-5 py-2 bg-white border border-slate-200 hover:border-[#991b1b] rounded-lg text-sm font-medium text-slate-600 hover:text-[#991b1b] transition-all group"
          >
            <ArrowLeft
              size={16}
              className="transform group-hover:-translate-x-1 transition-transform"
            />
            <span>Quay lại Trang Chủ</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
