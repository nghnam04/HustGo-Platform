import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Key, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import authService from "../../services/authService";

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.oldPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setError("Vui lòng nhập đầy đủ tất cả các trường dữ liệu bắt buộc!");
      return;
    }
    if (formData.newPassword.length < 6) {
      setError("Mật khẩu mới phải thiết lập độ dài từ 6 ký tự trở lên!");
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError("Xác nhận mật khẩu mới không trùng khớp!");
      return;
    }

    try {
      setLoading(true);
      const responseMsg = await authService.changePassword(formData);
      setSuccess(responseMsg || "Mật khẩu đã được thay đổi thành công!");
      setFormData({ oldPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => navigate("/profile"), 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Mật khẩu cũ không chính xác hoặc xảy ra lỗi hệ thống.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left">
      <button
        onClick={() => navigate("/profile")}
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#801B29] transition-all mb-4"
      >
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Key size={16} className="text-[#801B29]" />
        <h2 className="text-base font-black text-slate-900 tracking-tight">
          Thay đổi mật khẩu
        </h2>
      </div>
      <p className="text-xs text-slate-400 mb-5">
        Để đảm bảo an toàn, vui lòng không chia sẻ mật khẩu cho bất kỳ ai
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={15} /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Mật khẩu hiện tại
          </label>
          <input
            type="password"
            name="oldPassword"
            value={formData.oldPassword}
            onChange={handleInputChange}
            placeholder="••••••••"
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#801B29] transition-all font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Mật khẩu mới
          </label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleInputChange}
            placeholder="Nhập tối thiểu 6 ký tự..."
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#801B29] transition-all font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Xác nhận mật khẩu mới
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Nhập lại mật khẩu mới..."
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#801B29] transition-all font-medium"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-black bg-[#801B29] hover:bg-[#63141F] text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </div>
      </form>
    </div>
  );
}
