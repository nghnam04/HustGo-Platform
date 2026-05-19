import React from "react";
import { MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-200 mt-12 py-6 text-center text-slate-500 text-xs sm:text-sm shrink-0">
      <div className="space-y-3 mb-4">
        {/* Tên dự án nổi bật */}
        <p className="font-bold text-sm sm:text-base tracking-tight">
          <span className="text-[#801B29]">HUST</span>
          <span className="text-slate-900">Go</span>
          <span className="text-slate-900"> Logistics Platform</span>
        </p>

        {/* Cụm thông tin liên hệ: Xếp dọc trên mobile, dàn ngang trên PC */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-[11px] sm:text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <Phone size={13} className="text-slate-400" />
            <span>(+84) 904 262 833</span>
          </span>

          <span className="flex items-center gap-1.5">
            <Mail size={13} className="text-slate-400" />
            <span className="text-slate-700">nam.nh225213@sis.hust.edu.vn</span>
          </span>

          <span className="flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400" />
            <span>Ha Noi University of Science and Technology</span>
          </span>
        </div>
      </div>

      {/* Dòng copyright chân trang */}
      <p className="text-[11px] font-bold text-slate-400 tracking-wide pt-2 border-t border-slate-100 max-w-7xl mx-auto px-6">
        &copy; {new Date().getFullYear()} Designed & Developed by{" "}
        <span className="text-[#801B29] font-extrabold">Nguyen Hoang Nam</span>
      </p>
    </footer>
  );
}
