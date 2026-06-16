import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Image,
  Loader2,
  AlertCircle,
} from "lucide-react";

import orderService from "../../services/orderService";

function DeliveryModal({ order, onClose, onSuccess, onFail, onRefresh }) {
  const [mode, setMode] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [moneyCollected, setMoney] = useState(false);
  const [showReturnHubMsg, setShowReturnHubMsg] = useState(false);
  const [failReason, setFailReason] = useState("");
  const [failReasonCustom, setFailReasonCustom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const needCollectMoney = order.codAmount && Number(order.codAmount) > 0;

  const handleSubmit = async () => {
    setError("");
    if (mode === "success") {
      if (!proofFile) {
        setError("Cần chọn ảnh minh chứng giao hàng");
        return;
      }
      if (needCollectMoney && !moneyCollected) {
        setError("Cần xác nhận đã thu tiền");
        return;
      }
    }
    const finalFailReason =
      failReason === "Khác" ? failReasonCustom : failReason;
    if (mode === "fail" && !finalFailReason.trim()) {
      setError("Cần chọn hoặc nhập lý do thất bại");
      return;
    }

    const wasAboutToHit2 = mode === "fail" && (order.failCount ?? 0) === 1;

    try {
      setSubmitting(true);
      let finalProofUrl = proofUrl;
      if (mode === "success" && proofFile) {
        setUploading(true);
        const uploadRes = await orderService.uploadDeliveryImage(proofFile);
        finalProofUrl = uploadRes.data.url;
        setUploading(false);
      }
      await orderService.updateDeliveryStatus(order.id, {
        result: mode === "success" ? "SUCCESS" : "FAILED",
        proofImageUrl: mode === "success" ? finalProofUrl : null,
        isMoneyCollected: mode === "success" ? moneyCollected : false,
        failReason: mode === "fail" ? finalFailReason : null,
      });
      if (mode === "success") {
        onSuccess(order.id);
        onClose();
      } else {
        onFail(order.id);
        if (wasAboutToHit2) {
          setShowReturnHubMsg(true);
          setSubmitting(false);
          setUploading(false);
          setMode("");
          setTimeout(onClose, 2500);
        } else {
          onClose();
        }
      }
    } catch (e) {
      const raw =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Cập nhật thất bại";
      setError(raw);
      setSubmitting(false);
      setUploading(false);
      setShowReturnHubMsg(true);
      setMode("");
      setTimeout(() => {
        onClose();
        onRefresh();
      }, 3000);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[calc(100vh-1.5rem)] overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-mono text-sm font-extrabold text-red-700">
              {order.id}
            </div>
            <div className="text-xs text-slate-500">
              {order.receiverName} · {order.receiverPhone}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div className="text-xs text-slate-500">Cần thu</div>
          <div className="text-xl font-extrabold text-slate-900">
            {Number(order.finalAmountToCollect || 0).toLocaleString("vi-VN")}đ
          </div>
        </div>

        {(order.failCount ?? 0) >= 2 && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 border border-red-200 mb-4">
            <AlertTriangle size={13} className="shrink-0" />
            Đơn đã giao thất bại quá 2 lần, vui lòng trả về Hub nhận
          </div>
        )}

        {(order.failCount ?? 0) > 0 && (order.failCount ?? 0) < 2 && (
          <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 rounded-lg px-3 py-2 border border-orange-200 mb-4">
            <AlertTriangle size={13} className="shrink-0" />
            Đã thất bại {order.failCount} lần · Còn {2 - order.failCount} lần
            trước khi hoàn hàng
          </div>
        )}

        {showReturnHubMsg && error && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={22} className="text-red-600" />
            </div>
            <div>
              <div className="font-bold text-red-700 text-sm">{error}</div>
              <div className="text-xs text-slate-600 mt-1">
                Vui lòng trả về Hub nhận
              </div>
            </div>
          </div>
        )}

        {!mode && !showReturnHubMsg && (
          <div className="space-y-2">
            <button
              onClick={() => setMode("success")}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-700"
            >
              <CheckCircle2 size={16} /> Giao thành công
            </button>
            {(order.failCount ?? 0) < 2 && (
              <button
                onClick={() => setMode("fail")}
                className="w-full py-3 rounded-xl bg-red-50 text-red-700 font-bold border border-red-200 flex items-center justify-center gap-2 hover:bg-red-100"
              >
                <AlertTriangle size={16} /> Giao thất bại
              </button>
            )}
          </div>
        )}

        {mode === "success" && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Giao thành công
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Ảnh minh chứng giao hàng *
              </label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="proof-upload"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setProofFile(file);
                    setProofPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <label
                htmlFor="proof-upload"
                className="flex items-center gap-3 px-3 py-2.5 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
              >
                {proofPreview ? (
                  <img
                    src={proofPreview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded-lg">
                    <Image size={20} className="text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-700">
                    {proofFile ? proofFile.name : "Nhấn để chọn ảnh"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {proofFile
                      ? `${(proofFile.size / 1024).toFixed(1)} KB`
                      : " JPG, PNG, WEBP"}
                  </div>
                </div>
              </label>
            </div>
            {needCollectMoney && (
              <label className="flex items-center gap-3 cursor-pointer p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={moneyCollected}
                  onChange={(e) => setMoney(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-800">
                    Đã thu tiền
                  </div>
                  <div className="text-xs text-slate-400">
                    {Number(order.finalAmountToCollect || 0).toLocaleString(
                      "vi-VN",
                    )}
                    đ
                  </div>
                </div>
              </label>
            )}
          </div>
        )}

        {mode === "fail" && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Giao thất bại
            </div>
            <select
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
            >
              <option value="">Chọn lý do…</option>
              <option value="Không có người nhận">Không có người nhận</option>
              <option value="Người nhận từ chối nhận">
                Người nhận từ chối nhận
              </option>
              <option value="Địa chỉ không tìm thấy">
                Địa chỉ không tìm thấy
              </option>
              <option value="Người nhận yêu cầu giao lại">
                Người nhận yêu cầu giao lại
              </option>
              <option value="Khác">Khác</option>
            </select>
            {failReason === "Khác" && (
              <textarea
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                rows={2}
                placeholder="Nhập lý do khác…"
                value={failReasonCustom}
                onChange={(e) => setFailReasonCustom(e.target.value)}
              />
            )}
          </div>
        )}

        {error && !showReturnHubMsg && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        {mode && !showReturnHubMsg && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setMode("");
                setError("");
              }}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 font-medium hover:bg-slate-50"
            >
              Quay lại
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className={`flex-1 py-2.5 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40
                ${mode === "success" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              {submitting || uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {uploading ? "Đang tải ảnh…" : "Xác nhận"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeliveryModal;
