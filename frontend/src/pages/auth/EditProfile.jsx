import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Save, AlertCircle, ArrowLeft } from "lucide-react";
import authService from "../../services/authService";

export default function EditProfile({ user, onProfileUpdated }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [email, setEmail] = useState(user?.email || ""); // 🟢 Khai báo state email
  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(user?.avatarUrl || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Họ và tên và Email không được để trống!");
      return;
    }

    setLoading(false);
    setError("");

    // Đóng gói dữ liệu dạng Multipart Form Data theo quy định Backend
    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email); // 🟢 Gửi email vào form data
    if (avatarFile) {
      formData.append("avatarFile", avatarFile);
    }

    try {
      setLoading(true);
      const updatedData = await authService.updateMyProfile(formData);
      if (onProfileUpdated) onProfileUpdated(updatedData); // Cập nhật lại State của App/Context cha
      alert("Cập nhật thông tin tài khoản thành công!");
      navigate("/profile");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Xảy ra lỗi. Email có thể đã tồn tại hoặc định dạng không hợp lệ.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-left">
      <button
        onClick={() => navigate("/profile")}
        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#801B29] transition-all mb-4"
      >
        <ArrowLeft size={14} /> Quay lại hồ sơ
      </button>
      <h2 className="text-base font-black text-slate-900 mb-1 tracking-tight">
        Chỉnh sửa thông tin cá nhân
      </h2>
      <p className="text-xs text-slate-400 mb-6">
        Cập nhật ảnh đại diện, họ tên và email trên hệ thống 
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Khu vực chọn ảnh trực quan */}
        <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="relative group">
            <img
              src={
                previewUrl ||
                "https://avatarngau.sbs/wp-content/uploads/2025/07/avatar-vo-danh-va-sach.jpg"
              }
              alt="Preview"
              className="w-16 h-16 rounded-xl object-cover border border-slate-200 bg-white"
            />
            <label className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera size={16} className="text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700">Ảnh đại diện</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Nhấp vào hình ảnh để thay đổi tệp mới
            </p>
          </div>
        </div>

        {/* Ô nhập thông tin họ tên */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Họ và Tên mới
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nhập đầy đủ họ và tên..."
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#801B29] focus:ring-1 focus:ring-[#801B29]/30 transition-all font-medium"
          />
        </div>

        {/* Ô nhập thông tin email */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            Email mới
          </label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Nhập địa chỉ email..."
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-[#801B29] focus:ring-1 focus:ring-[#801B29]/30 transition-all font-medium"
          />
        </div>

        <div className="border-t border-slate-100 pt-4 flex justify-end gap-2.5">
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
            className="px-4 py-2 text-xs font-black bg-[#801B29] hover:bg-[#63141F] text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} /> {loading ? "Đang xử lý..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
