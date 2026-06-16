import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  Loader2,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Filter,
} from "lucide-react";
import orderService from "../../services/orderService";
import hubService from "../../services/hubService";
import { STATUS_MAP_V2 } from "../../constants/STATUS_MAP_V2";
import { PAY_MAP } from "../../constants/PAY_MAP";

function Badge({ value, map }) {
  const cfg = map?.[value] ?? {
    label: value,
    color: "text-slate-600 bg-slate-100 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

export default function HubInventory() {
  const [hubId, setHubId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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

  const fetchInventory = async () => {
    if (!hubId) return;

    try {
      setRefreshing(true);
      const [invRes, deliveryRes] = await Promise.all([
        orderService.getInventoryAtHub(hubId, {
          status: filterStatus || undefined,
          page: 0,
          size: 300,
        }),
        orderService.getDeliveryOrdersByHub(hubId),
      ]);

      const mapOrder = (o) => ({
        id: o.id,
        senderName: o.senderName,
        senderAddress: o.senderAddress,
        senderWard: o.senderWard,
        senderDistrict: o.senderDistrict,
        receiverName: o.receiverName,
        receiverAddress: o.receiverAddress,
        receiverWard: o.receiverWard,
        receiverDistrict: o.receiverDistrict,
        productName: o.productName,
        imageUrl: o.imageUrl,
        weight: o.weight,
        status: o.status,
        createdAt: o.createdAt,
        routeId: o.routeId,
        payment: o.paymentMethod,
        finalAmount: o.finalAmountToCollect,
      });

      const invOrders = (invRes.data?.content || []).map(mapOrder);
      const deliveryOrders = (deliveryRes.data || []).map(mapOrder);
      setOrders([...invOrders, ...deliveryOrders]);
    } catch {
      showToast("Không thể tải dữ liệu kho", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hubId) fetchInventory();
  }, [hubId, filterStatus]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return orders;

    return orders.filter(
      (o) =>
        (o.id || "").toLowerCase().includes(keyword) ||
        (o.routeId || "").toLowerCase().includes(keyword) ||
        (o.senderName || "").toLowerCase().includes(keyword) ||
        (o.receiverName || "").toLowerCase().includes(keyword) ||
        (o.senderAddress || "").toLowerCase().includes(keyword) ||
        (o.senderWard || "").toLowerCase().includes(keyword) ||
        (o.senderDistrict || "").toLowerCase().includes(keyword) ||
        (o.receiverAddress || "").toLowerCase().includes(keyword) ||
        (o.receiverWard || "").toLowerCase().includes(keyword) ||
        (o.receiverDistrict || "").toLowerCase().includes(keyword),
    );
  }, [orders, search]);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-3 left-3 right-3 sm:left-auto sm:top-5 sm:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-5 overflow-y-auto">
        {/* Page header */}
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Quản lý tồn kho
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
              <MapPin size={13} className="text-red-500" /> {hubId || "..."}
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Tổng đơn hàng:{" "}
              <span className="font-bold text-slate-700">{orders.length}</span>
            </p>
          </div>
          <button
            onClick={fetchInventory}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin text-red-500" : ""}
            />
            Làm mới
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
              placeholder="Tìm mã đơn, tuyến, người gửi, người nhận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full md:w-auto px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
            >
              <option value="">Tất cả</option>
              {Object.keys(STATUS_MAP_V2).map((status) => (
                <option key={status} value={status}>
                  {STATUS_MAP_V2[status].label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {orders.filter((o) => o.status === "AT_HUB" && !o.routeId).length}{" "}
              đơn chờ phân tuyến
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 size={28} className="animate-spin text-red-400" />
              <span className="text-sm">Đang tải dữ liệu kho…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Package size={32} strokeWidth={1.5} />
              <span className="text-sm">Không có đơn nào tồn kho</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Mã đơn</th>
                    <th className="px-4 py-3 text-left">Sản phẩm</th>
                    <th className="px-4 py-3 text-left">Người gửi</th>
                    <th className="px-4 py-3 text-left">Người nhận</th>
                    <th className="px-4 py-3 text-left">Thanh toán</th>
                    <th className="px-4 py-3 text-right">Khối lượng</th>
                    <th className="px-4 py-3 text-right">Thu hộ</th>
                    <th className="px-4 py-3 text-left">Tuyến</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-red-50/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-red-700 font-bold">
                        {o.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          {o.imageUrl ? (
                            <img
                              src={o.imageUrl}
                              alt={o.productName || "Sản phẩm"}
                              className="h-10 w-10 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 flex items-center justify-center shrink-0">
                              <Package size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800 truncate">
                              {o.productName || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {o.senderName || "—"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {[o.senderAddress, o.senderWard, o.senderDistrict]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {o.receiverName || "—"}
                        </div>

                        <div className="text-xs text-slate-400">
                          {[
                            o.receiverAddress,
                            o.receiverWard,
                            o.receiverDistrict,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={o.payment} map={PAY_MAP} />
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">
                        {o.weight} kg
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {o.finalAmount?.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-4 py-3">
                        {o.routeId ? (
                          <span className="font-mono text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                            {o.routeId}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={o.status} map={STATUS_MAP_V2} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
          <Layers size={12} /> {filtered.length} đơn đang hiển thị
        </div>
      </div>
    </>
  );
}
