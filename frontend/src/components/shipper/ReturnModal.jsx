import { useState } from "react";
import {
  X,
  AlertTriangle,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";

export default function ReturnModal({ order, onClose, onConfirm }) {
  const [hubId, setHubId] = useState(order.currentHubId || "");
  const [confirming, setConf] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!hubId.trim()) {
      setError("Cần nhập Hub ID để trả hàng về");
      return;
    }
    try {
      setConf(true);
      await onConfirm(order.id, hubId);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || "Trả hàng thất bại");
    } finally {
      setConf(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[calc(100vh-1.5rem)] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Trả hàng về hub
          </h2>
          <button onClick={onClose} className="text-slate-400">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Đơn{" "}
          <span className="font-mono font-bold text-red-700">{order.id}</span>{" "}
          sẽ được trả về hub để phân tuyến lại.
        </p>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">
            Hub ID trả về
          </label>
          <input
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-200"
            value={hubId}
            onChange={(e) => setHubId(e.target.value)}
            placeholder="Tự động điền từ đơn hàng"
          />
          {!order.currentHubId && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <AlertTriangle size={11} /> Đơn chưa có HubId, nhập thủ công ID
              hub trả về
            </p>
          )}
        </div>
        {error && (
          <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100 flex items-center gap-1">
            <AlertCircle size={12} />
            {error}
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="flex-1 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-700 disabled:opacity-40"
          >
            {confirming ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RotateCcw size={14} />
            )}
            Xác nhận trả về
          </button>
        </div>
      </div>
    </div>
  );
}
