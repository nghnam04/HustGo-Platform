import { useState, useEffect, useMemo } from "react";

import {
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Truck,
  Package,
  RefreshCw,
  CheckSquare,
  Square,
} from "lucide-react";

import orderService from "../../services/orderService";
import hubService from "../../services/hubService";

function Toast({ toast }) {
  if (!toast) return null;
  return (
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
  );
}

export default function TransferReceiving() {
  const [hubId, setHubId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [confirmed, setConfirmed] = useState([]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchHub = async () => {
      try {
        const res = await hubService.getMyHub();
        const data = res.data ?? res;
        const id = data?.id || data?.hubId;
        setHubId(id);
      } catch (e) {
        showToast("Không lấy được thông tin hub", "error");
      }
    };
    fetchHub();
  }, []);

  const fetchInTransitOrders = async () => {
    if (!hubId) return;
    try {
      setLoading(true);
      const res = await orderService.getInTransitOrdersForHub(hubId);
      const list = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res)
          ? res
          : [];
      setOrders(list);
    } catch (e) {
      showToast("Không tải được danh sách đơn đang chờ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hubId) fetchInTransitOrders();
  }, [hubId]);

  const toggleAll = () => {
    if (selected.size === orders.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(orders.map((o) => o.id)));
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleConfirmReceive = async () => {
    if (selected.size === 0 || !hubId) return;
    try {
      setConfirming(true);
      let successCount = 0;
      for (const id of selected) {
        await orderService.arriveAtHubTransfer(id, { hubId });
        successCount++;
      }
      showToast(`Nhập kho thành công ${successCount} đơn`, "success");
      const confirmedNow = orders.filter((o) => selected.has(o.id));
      setConfirmed((prev) => [
        ...confirmedNow.map((c) => ({ id: c.id, receiver: c.receiverName })),
        ...prev,
      ]);
      setSelected(new Set());
      fetchInTransitOrders();
    } catch (e) {
      showToast(e?.response?.data?.message || "Xác nhận thất bại", "error");
    } finally {
      setConfirming(false);
    }
  };

  const grouped = useMemo(() => {
    const map = {};
    for (const o of orders) {
      const key =
        o.originHubName ||
        o.originHubId ||
        o.currentHubId ||
        "Không rõ hub nguồn";
      if (!map[key]) map[key] = [];
      map[key].push(o);
    }
    return map;
  }, [orders]);

  return (
    <>
      <Toast toast={toast} />

      <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-5 overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Nhập kho trung chuyển
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Xác nhận đơn hàng trung chuyển đến
            </p>
            {orders.length > 0 && (
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {orders.length} đơn đang chờ nhập kho
              </p>
            )}
          </div>
          <button
            onClick={fetchInTransitOrders}
            disabled={loading || !hubId}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin text-red-500" : ""}
            />
            Làm mới
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Main list */}
          <div className="lg:col-span-3 space-y-4">
            {orders.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-4">
                <button
                  onClick={toggleAll}
                  className="w-fit flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition"
                >
                  {selected.size === orders.length ? (
                    <>
                      <CheckSquare size={15} className="text-purple-500" />
                      Bỏ chọn tất cả ({orders.length})
                    </>
                  ) : (
                    <>
                      <Square size={15} className="text-slate-400" />
                      Chọn tất cả ({orders.length})
                    </>
                  )}
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-100 shadow-sm gap-3">
                <Truck size={36} strokeWidth={1.5} className="text-slate-300" />
                <div className="text-sm text-slate-400">
                  Không có đơn nào đang chờ nhập kho
                </div>
              </div>
            ) : (
              Object.entries(grouped).map(([senderHub, groupOrders]) => (
                <div
                  key={senderHub}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
                >
                  {/* Group header */}
                  <div className="flex flex-wrap items-center gap-2 px-3 sm:px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <Truck size={14} className="text-slate-500" />
                    <span className="text-sm font-bold text-slate-700">
                      Hub nguồn:{" "}
                      <span className="text-purple-700">{senderHub}</span>
                    </span>
                    {groupOrders[0]?.manifestId && (
                      <span className="ml-2 text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {groupOrders[0].manifestId}
                      </span>
                    )}
                    <span className="ml-0 sm:ml-auto text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                      {groupOrders.length} đơn
                    </span>
                  </div>

                  {/* Orders */}
                  <div className="divide-y divide-slate-50">
                    {groupOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`flex items-start sm:items-center gap-3 px-3 sm:px-5 py-3.5 hover:bg-slate-50 transition cursor-pointer
                        ${selected.has(order.id) ? "bg-purple-50" : ""}`}
                        onClick={() => toggleOne(order.id)}
                      >
                        <div className="shrink-0">
                          {selected.has(order.id) ? (
                            <CheckSquare
                              size={18}
                              className="text-purple-600"
                            />
                          ) : (
                            <Square size={18} className="text-slate-300" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-purple-700 truncate">
                              {order.id}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                              {order.status}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            {order.imageUrl ? (
                              <img
                                src={order.imageUrl}
                                alt={order.productName || "Sản phẩm"}
                                className="h-10 w-10 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 flex items-center justify-center shrink-0">
                                <Package size={16} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-800 truncate">
                                {order.productName || "—"}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 break-words sm:truncate">
                            👤 {order.receiverName} ·{" "}
                            {[
                              order.receiverAddress,
                              order.receiverWard,
                              order.receiverDistrict,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 flex gap-3 flex-wrap">
                            <span>{order.weight} kg</span>
                            <span>{order.paymentMethod}</span>
                            {order.targetHubId && (
                              <span className="font-mono text-purple-500">
                                → {order.targetHubId}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right sidebar: selection + confirm */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-5">
              <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" />
                Xác nhận nhập kho
              </div>

              {selected.size === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-300 gap-2 text-xs">
                  <ArrowDownToLine size={24} strokeWidth={1.5} />
                  <span>Chưa chọn đơn nào</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-slate-600">
                    Đã chọn{" "}
                    <span className="font-bold text-purple-700">
                      {selected.size}
                    </span>{" "}
                    đơn
                    {selected.size > 20 && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <AlertCircle size={13} />
                        Tối đa 20 đơn mỗi lần nhập kho
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleConfirmReceive}
                    disabled={confirming || selected.size > 20 || !hubId}
                    className="w-full py-3 px-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {confirming ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <ArrowDownToLine size={15} />
                    )}
                    {confirming
                      ? "Đang xác nhận…"
                      : "Xác nhận nhập kho trung chuyển"}
                  </button>

                  {selected.size > 0 && selected.size <= 20 && (
                    <button
                      onClick={() => setSelected(new Set())}
                      className="w-full py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                    >
                      Bỏ chọn tất cả
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Session confirmed */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 sm:p-5">
              <div className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-500" />
                Đã nhập kho phiên này
                {confirmed.length > 0 && (
                  <span className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {confirmed.length}
                  </span>
                )}
              </div>

              {confirmed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-300 gap-2">
                  <Truck size={26} strokeWidth={1.5} />
                  <span className="text-xs">
                    Chưa có đơn nào trong phiên này
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {confirmed.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 rounded-lg border border-emerald-100"
                    >
                      <CheckCircle2
                        size={14}
                        className="text-emerald-500 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-bold text-emerald-700 truncate">
                          {c.id}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {c.receiver}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
