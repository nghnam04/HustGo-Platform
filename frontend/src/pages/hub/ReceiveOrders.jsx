import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Package,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ScanLine,
  CreditCard,
  User,
  MapPin,
  Weight,
  ArrowRight,
} from "lucide-react";
import orderService from "../../services/orderService";
import hubService from "../../services/hubService";
import InfoRow from "../../components/hub/InfoRow";

const STATUS_LABEL = {
  PENDING: {
    label: "COD – Chờ nhận",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  CREATED: {
    label: "Đã thanh toán online",
    color: "text-sky-700 bg-sky-50 border-sky-200",
  },
};

export default function ReceiveOrders() {
  const [hubId, setHubId] = useState(null);

  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [successMessage, setSuccessMessage] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const fetchHub = async () => {
      try {
        const res = await hubService.getMyHub();
        const hub = res.data ?? res;
        setHubId(hub.id || hub.code);
      } catch (e) {
        console.error("Không lấy được hub hiện tại", e);
      }
    };

    fetchHub();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!orderId.trim()) return;

    try {
      setSearching(true);
      setNotFound(false);
      setOrder(null);

      const res = await orderService.getOrderById(orderId.trim());
      const o = res.data ?? res;

      const canCollect =
        (o.paymentMethod === "ONLINE_PAYMENT" && o.status === "CREATED") ||
        (o.paymentMethod === "COD" && o.status === "PENDING");

      setOrder({ ...o, canCollect });
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  }, [orderId]);

  const handleConfirmPickup = useCallback(async () => {
    if (!hubId) {
      showToast("Chưa xác định được hub", "error");
      return;
    }

    try {
      setConfirming(true);
      await orderService.arriveAtHubCustomer(order.id, { hubId });

      const successMsg = `Đã xác nhận nhận đơn ${order.id} thành công`;

      setSuccessMessage(successMsg);

      setTimeout(() => {
        setSuccessMessage(null);
        setOrder(null);
        setOrderId("");
      }, 3000);
    } catch (e) {
      showToast(e?.response?.data?.message || "Xác nhận thất bại", "error");
    } finally {
      setConfirming(false);
    }
  }, [hubId, order, showToast]);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-3 left-3 right-3 sm:left-auto sm:top-5 sm:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Thông báo thành công lớn */}
      {successMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
          <div className="bg-white rounded-2xl shadow-2xl p-5 sm:p-8 text-center max-w-md w-full">
            <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-700 mb-2">
              Thành công!
            </h3>
            <p className="text-slate-600 text-sm sm:text-lg">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-5 overflow-y-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Nhận đơn từ khách
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 max-w-2xl">
            Quét hoặc nhập mã đơn để xác nhận đơn hàng khách gửi
          </p>
        </div>

        <div className="w-full max-w-4xl space-y-4 sm:space-y-6">
          {/* Search panel */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-4 md:p-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
              <ScanLine size={16} className="text-red-500" />
              Tra cứu đơn hàng
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                  placeholder="Nhập mã đơn hàng…"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={searching || !orderId.trim()}
                className="w-full sm:w-auto px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                {searching ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                Tra cứu
              </button>
            </div>

            {notFound && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 border border-red-100">
                <AlertCircle size={15} />
                Không tìm thấy đơn hàng này
              </div>
            )}

            {!order && !notFound && (
              <div className="mt-6 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Điều kiện nhận đơn
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-start sm:items-center gap-2 p-3 rounded-lg bg-sky-50 border border-sky-100">
                    <CreditCard size={14} className="text-sky-500 shrink-0" />
                    <span>
                      <strong>Online Payment</strong> → trạng thái{" "}
                      <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-sky-200 text-sky-700">
                        CREATED
                      </code>
                    </span>
                  </div>

                  <div className="flex items-start sm:items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <Package size={14} className="text-amber-500 shrink-0" />
                    <span>
                      <strong>COD</strong> → trạng thái{" "}
                      <code className="text-xs bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-700">
                        PENDING
                      </code>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order detail */}
          {order && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-4 md:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Package size={16} className="text-red-500" /> Chi tiết đơn
                  hàng
                </div>

                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-semibold ${
                    STATUS_LABEL[order.status]?.color ??
                    "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {STATUS_LABEL[order.status]?.label ?? order.status}
                </span>
              </div>

              <div className="font-mono text-base sm:text-lg font-extrabold text-red-700 break-all">
                {order.id}
              </div>

              <div className="divide-y divide-slate-50">
                <InfoRow
                  icon={<User size={14} />}
                  label="Người nhận"
                  value={order.receiverName}
                />
                <InfoRow
                  icon={<MapPin size={14} />}
                  label="Địa chỉ"
                  value={`${order.receiverAddress}, ${order.receiverWard}, ${order.receiverDistrict}`}
                />
                <InfoRow
                  icon={<Weight size={14} />}
                  label="Khối lượng"
                  value={`${order.weight} kg`}
                />
                <InfoRow
                  icon={<CreditCard size={14} />}
                  label="Thanh toán"
                  value={order.paymentMethod}
                />
                <InfoRow
                  icon={<Package size={14} />}
                  label="Thu hộ (COD)"
                  value={
                    order.codAmount
                      ? `${Number(order.codAmount).toLocaleString("vi-VN")}đ`
                      : "—"
                  }
                />
                <InfoRow
                  icon={<ArrowRight size={14} />}
                  label="Phí giao hàng"
                  value={
                    order.finalAmountToCollect
                      ? `${Number(order.finalAmountToCollect).toLocaleString("vi-VN")}đ`
                      : "—"
                  }
                />
              </div>

              {order.canCollect ? (
                <button
                  onClick={handleConfirmPickup}
                  disabled={confirming || !hubId}
                  className="w-full py-3 px-3 bg-red-600 text-white text-sm sm:text-base font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  {confirming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Xác nhận nhận hàng từ khách
                </button>
              ) : (
                <div className="flex items-start gap-2 text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3 border border-red-200">
                  <AlertCircle
                    size={14}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                  Đơn này chưa đủ điều kiện để nhận ({order.paymentMethod} /{" "}
                  {order.status})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
