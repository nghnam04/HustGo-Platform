import React, { useEffect, useState } from "react";
import { CheckCircle2, LocateFixed, MapPin, Navigation } from "lucide-react";
import useAuth from "../../hooks/useAuth";

export default function GpsPermissionGate({ children }) {
  const { askGpsOnLogin, setAskGpsOnLogin, requestGpsPermission, logout } =
    useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (askGpsOnLogin) {
      setShowPrompt(true);
    }
  }, [askGpsOnLogin]);

  const handleAllow = async () => {
    setError("");
    const granted = await requestGpsPermission();
    setShowPrompt(false);
    setAskGpsOnLogin(false);
    if (!granted) {
      setError("Bạn cần cấp quyền vị trí để sử dụng ứng dụng Shipper.");
    }
  };

  const handleDeny = () => {
    setShowPrompt(false);
    setAskGpsOnLogin(false);
    logout();
  };

  if (error) {
    return (
      <div className="flex-1 flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-red-100 bg-white p-6 text-center shadow-xl shadow-slate-200/80">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <MapPin size={26} />
          </div>
          <h2 className="mb-2 text-xl font-extrabold tracking-tight text-slate-950">
            Cần quyền vị trí
          </h2>
          <p className="mx-auto mb-6 text-sm leading-6 text-slate-500">
            {error}
          </p>
          <button
            onClick={() => {
              setError("");
              setShowPrompt(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#801B29] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#63141F] active:scale-[0.98]"
          >
            <LocateFixed size={17} />
            Thử lại
          </button>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-[#801B29]"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  if (!showPrompt) return children;

  return (
    <div className="flex-1 flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[#801B29]/15 bg-white p-6 text-center shadow-xl shadow-slate-200/80">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-[#801B29]">
          <Navigation size={26} />
        </div>

        <h2 className="mb-3 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
          Xác minh vị trí Shipper
        </h2>
        <p className="mx-auto mb-5 text-sm leading-6 text-slate-500">
          HustGo yêu cầu quyền truy cập <strong>GPS</strong> của bạn. Nếu từ
          chối, bạn sẽ không thể sử dụng các tính năng Shipper.
        </p>

        <div className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left">
          {[
            {
              label: "Theo dõi tuyến giao",
              desc: "Cập nhật GPS liên tục khi giao",
            },
            {
              label: "Bảo mật đơn hàng",
              desc: "Xác minh điểm giao đúng vị trí",
            },
            {
              label: "Cập nhật real-time",
              desc: "Khách thấy vị trí giao hàng",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <CheckCircle2
                size={16}
                className="mt-0.5 shrink-0 text-[#801B29]"
              />
              <div>
                <p className="text-sm font-bold text-slate-800">{item.label}</p>
                <p className="text-xs leading-5 text-slate-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleAllow}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#801B29] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#63141F] active:scale-[0.98]"
        >
          <MapPin size={17} />
          Đồng ý cấp quyền vị trí
        </button>
        <button
          onClick={handleDeny}
          className="mt-3 w-full rounded-lg px-5 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-[#801B29]"
        >
          Từ chối - Đăng xuất
        </button>
      </div>
    </div>
  );
}
