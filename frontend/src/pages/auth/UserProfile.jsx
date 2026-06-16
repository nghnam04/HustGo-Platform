import { Link } from "react-router-dom";
import { Mail, Shield, Calendar, Edit3, ArrowLeft, Hash } from "lucide-react";
import defaultAvatar from "../../assets/default-avatar.jpg";
import formatDatev2 from "../../components/utils/formatDatev2";

export default function UserProfile({ user }) {
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Banner */}
      <div className="h-32 bg-gradient-to-r from-[#801B29] to-[#b32b3f] relative">
        <Link
          to="/"
          className="absolute top-4 left-4 flex items-center gap-1.5 text-xs font-bold text-white/90 bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-lg transition-all"
        >
          <ArrowLeft size={14} /> Quay lại
        </Link>
      </div>

      <div className="px-6 pb-6 relative">
        {/* Avatar & Tên */}
        <div className="flex items-center gap-4 -mt-17 mb-6">
          <img
            src={user?.avatarUrl || defaultAvatar}
            alt={user?.fullName}
            className="w-28 h-28 rounded-2xl object-cover border-4 border-white bg-white shadow-md"
          />
          <div className="mt-4">
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              {user?.fullName || "Chưa cập nhật"}
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              @{user?.username || "---"}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 my-5"></div>

        {/* Thông tin chi tiết */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Hash className="text-slate-400 mt-0.5" size={16} />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Mã định danh (ID)
              </p>
              <p className="text-xs font-mono font-bold text-slate-700 mt-0.5 truncate">
                {user?.id || "---"}
              </p>
            </div>
          </div>

          {/* Vai trò */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Shield className="text-[#801B29] mt-0.5" size={16} />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Vai trò
              </p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {user?.roles?.length > 0 ? (
                  user.roles.map((role, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-black px-2 py-0.5 bg-[#801B29]/10 text-[#801B29] rounded-lg"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-slate-400">---</span>
                )}
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Mail className="text-slate-400 mt-0.5" size={16} />
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Email
              </p>
              <p className="text-xs font-bold text-slate-700 mt-0.5 truncate">
                {user?.email || "---"}
              </p>
            </div>
          </div>

          {/* Ngày tham gia */}
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Calendar className="text-slate-400 mt-0.5" size={16} />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Ngày tham gia
              </p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {formatDatev2(user?.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Hành động */}
        <div className="mt-8 flex justify-end gap-3">
          <Link
            to="/profile/change-password"
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
          >
            Đổi mật khẩu
          </Link>
          <Link
            to="/profile/edit"
            className="px-4 py-2 text-xs font-bold bg-[#801B29] hover:bg-[#63141F] text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Edit3 size={14} /> Chỉnh sửa hồ sơ
          </Link>
        </div>
      </div>
    </div>
  );
}
