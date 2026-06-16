import { useState, useEffect, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  User,
  Phone,
  Wallet,
  CalendarDays,
  Activity,
  Box,
  XCircle,
} from "lucide-react";
import orderService from "../../services/orderService";
import { STATUS_TABS } from "../../constants/STATUS_TABS";
import { STATUS_MAP } from "../../constants/STATUS_MAP";

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

export default function AdminOrderList() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [orders, setOrders] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [pageNo, setPageNo] = useState(0);
  const PAGE_SIZE = 20;

  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setRefreshing(true);

      const params = {
        page: pageNo,
        size: PAGE_SIZE,
      };
      if (statusFilter !== "ALL") params.status = statusFilter;

      const res = await orderService.getAllOrders(params);
      const data = res.data;

      setOrders(data.content || []);
      setTotalElements(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error("Fetch orders failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await fetchOrders();
      } catch {}
    })();
  }, [statusFilter, pageNo]);

  const filteredOrders = useMemo(() => {
    const keyword = searchQuery.toLowerCase().trim();
    if (!keyword) return orders;
    return orders.filter(
      (o) =>
        o.id?.toLowerCase().includes(keyword) ||
        o.customerId?.toLowerCase().includes(keyword) ||
        o.receiverName?.toLowerCase().includes(keyword) ||
        o.senderName?.toLowerCase().includes(keyword) ||
        o.receiverAddress?.toLowerCase().includes(keyword),
    );
  }, [orders, searchQuery]);

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setPageNo(0);
  };

  const handleCancelOrder = async (orderId) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn huỷ đơn hàng này không?",
    );

    if (!confirmed) return;

    try {
      await orderService.cancelOrder(orderId);

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: "CANCELLED" } : order,
        ),
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => ({
          ...prev,
          status: "CANCELLED",
        }));
      }

      alert("Huỷ đơn hàng thành công");
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Không thể huỷ đơn hàng");
    }
  };

  return (
    <div className="admin-order-list">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Quản lý đơn hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={refreshing}
          className="
      flex items-center gap-1.5
      px-2.5 py-1.5
      md:px-4 md:py-2
      bg-white border border-slate-200
      rounded-lg
      text-xs md:text-sm
      font-bold text-slate-600
      hover:bg-slate-50
      disabled:opacity-50
      shrink-0
    "
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm theo mã đơn, khách hàng, địa chỉ..."
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={13} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
              >
                {STATUS_TABS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL"
                      ? "Tất cả"
                      : STATUS_MAP[status]?.label || status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 mb-6 flex items-center gap-3">
            <Activity size={18} className="text-red-500" />
            <span className="text-sm text-slate-500">Tổng số đơn hàng:</span>
            <span className="font-bold text-slate-800">{totalElements}</span>
            {searchQuery && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-sm text-slate-500">
                  Kết quả tìm kiếm:
                </span>
                <span className="font-bold text-slate-700">
                  {filteredOrders.length}
                </span>
              </>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Mã đơn</th>
                    <th className="px-4 py-3 text-left">Sản phẩm</th>
                    <th className="px-4 py-3 text-left">Người gửi</th>
                    <th className="px-4 py-3 text-left">Người nhận</th>
                    <th className="px-4 py-3 text-left">Hub</th>
                    <th className="px-4 py-3 text-right">Khối lượng</th>
                    <th className="px-4 py-3 text-right">Cước ship</th>
                    <th className="px-4 py-3 text-right">COD</th>
                    <th className="px-4 py-3 text-left">Ngày tạo</th>
                    <th className="px-4 py-3 text-left">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-red-50/40 transition-colors"
                    >
                      <td className="px-4 py-3 min-w-[120px]">
                        <span className="font-mono text-xs text-red-700 font-bold whitespace-normal break-words max-w-[110px]">
                          {order.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        {order.productName ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-medium text-slate-800 text-sm">
                              {order.productName}
                            </span>
                            {order.imageUrl && (
                              <img
                                src={order.imageUrl}
                                alt={order.productName}
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 mt-1"
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">
                          {order.senderName || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.senderPhone || "-"}
                        </div>
                        <div className="text-xs text-slate-400 break-words">
                          {order.senderWard && order.senderDistrict
                            ? `${order.senderAddress}, ${order.senderWard}, ${order.senderDistrict}`
                            : order.senderAddress || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis">
                          {order.receiverName || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {order.receiverPhone || "-"}
                        </div>
                        <div className="text-xs text-slate-400 break-words">
                          {order.receiverWard && order.receiverDistrict
                            ? `${order.receiverAddress}, ${order.receiverWard}, ${order.receiverDistrict}`
                            : order.receiverAddress || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[140px]">
                        {order.currentHubName ? (
                          <span
                            className={`inline-flex items-center w-fit max-w-full px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 border border-red-200 text-red-700`}
                          >
                            {order.currentHubName}
                          </span>
                        ) : order.currentHubId ? (
                          <span
                            className={`inline-flex items-center w-fit max-w-full px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 border border-red-200 text-red-700`}
                          >
                            {order.currentHubId}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {order.weight ? `${order.weight} kg` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {(order.totalPrice || 0).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {(order.codAmount || 0).toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-full overflow-hidden whitespace-nowrap">
                          {(() => {
                            const status = order.status;
                            const base =
                              "inline-flex items-center w-fit max-w-full px-2 py-1 rounded-lg text-[10px] font-bold";

                            switch (status) {
                              case "PENDING":
                                return (
                                  <span
                                    className={`${base} bg-amber-50 border border-amber-200 text-amber-700`}
                                  >
                                    Chờ xử lý
                                  </span>
                                );
                              case "CREATED":
                                return (
                                  <span
                                    className={`${base} bg-yellow-100 border border-yellow-200 text-yellow-700`}
                                  >
                                    Đã tạo
                                  </span>
                                );
                              case "COLLECTED":
                                return (
                                  <span
                                    className={`${base} bg-blue-50 border border-blue-200 text-blue-700`}
                                  >
                                    Đã nhận
                                  </span>
                                );
                              case "IN_TRANSIT":
                                return (
                                  <span
                                    className={`${base} bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center gap-1`}
                                  >
                                    {"Trung chuyển"}
                                  </span>
                                );
                              case "AT_HUB":
                                return (
                                  <span
                                    className={`${base} bg-orange-50 border border-orange-200 text-orange-700`}
                                  >
                                    Tại Hub
                                  </span>
                                );
                              case "PICKING":
                                return (
                                  <span
                                    className={`${base} bg-violet-50 border border-violet-200 text-violet-700`}
                                  >
                                    Shipper đang lấy
                                  </span>
                                );
                              case "DELIVERING":
                                return (
                                  <span
                                    className={`${base} bg-pink-50 border border-pink-200 text-pink-700 flex items-center gap-1`}
                                  >
                                    Đang giao
                                  </span>
                                );
                              case "COMPLETED":
                                return (
                                  <span
                                    className={`${base} bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1`}
                                  >
                                    Hoàn thành
                                  </span>
                                );
                              case "CANCELLED":
                                return (
                                  <span
                                    className={`${base} bg-red-50 border border-red-200 text-red-600 flex items-center gap-1`}
                                  >
                                    Đã hủy
                                  </span>
                                );
                              default:
                                return (
                                  <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold">
                                    {status}
                                  </span>
                                );
                            }
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 text-slate-400 hover:text-[#801B29] hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          {order.status == "PENDING" && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <XCircle size={14} className="" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty */}
            {!filteredOrders.length && (
              <div className="py-20 text-center">
                <ClipboardList
                  size={44}
                  className="mx-auto text-slate-300 mb-4"
                />
                <h3 className="text-lg font-bold text-slate-700 mb-1">
                  Không có đơn hàng
                </h3>
                <p className="text-sm text-slate-500">
                  Không tìm thấy dữ liệu phù hợp.
                </p>
              </div>
            )}

            {/* Pagination */}
            {orders.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between sticky bottom-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 z-10">
                <div className="text-sm text-slate-500">
                  Trang{" "}
                  <span className="font-bold text-slate-800">{pageNo + 1}</span>{" "}
                  / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pageNo === 0}
                    onClick={() => setPageNo((p) => p - 1)}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={pageNo + 1 >= totalPages}
                    onClick={() => setPageNo((p) => p + 1)}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 mt-15">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden h-full flex flex-col">
            {/* HEADER */}
            <div className="relative border-b border-slate-200 px-6 py-5 shrink-0 flex items-center justify-between">
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>

              <div>
                <p className="text-xs font-mono text-slate-400 mb-1">
                  #{selectedOrder.id}
                </p>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Chi tiết đơn hàng
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge value={selectedOrder.status} map={STATUS_MAP} />
                  <span className="text-sm text-slate-500">
                    {selectedOrder.paymentMethod}
                  </span>
                  {selectedOrder.serviceCode && (
                    <span className="text-sm text-slate-400">
                      · {selectedOrder.serviceCode}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* BODY */}
            <div className="p-8 overflow-y-auto space-y-5">
              {/* Sender / Receiver */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                    <User size={15} />
                    Người gửi
                  </div>
                  <p className="font-semibold text-slate-800">
                    {selectedOrder.senderName || "-"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <Phone size={12} />
                    {selectedOrder.senderPhone || "-"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1 flex items-start gap-1">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    {selectedOrder.senderAddress || "-"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                    <User size={15} />
                    Người nhận
                  </div>
                  <p className="font-semibold text-slate-800">
                    {selectedOrder.receiverName || "-"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <Phone size={12} />
                    {selectedOrder.receiverPhone || "-"}
                  </p>
                  <p className="text-sm text-slate-500 mt-1 flex items-start gap-1">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    {selectedOrder.receiverAddress || "-"}
                  </p>
                </div>
              </div>

              {/* PRICING */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
                  <Wallet size={15} />
                  Thông tin tài chính
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    ["Phí vận chuyển", selectedOrder.shippingFee],
                    ["COD", selectedOrder.codAmount],
                    ["Tổng phí", selectedOrder.totalPrice],
                    ["Thu hộ", selectedOrder.finalAmountToCollect],
                    ["Giá trị hàng", selectedOrder.orderValue],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="font-semibold text-slate-800">
                        {value != null
                          ? Number(value).toLocaleString("vi-VN") + "đ"
                          : "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRODUCT */}
              {selectedOrder.productName && (
                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <Box size={15} />
                    Hàng hoá
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    {/* LEFT - INFO */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-base">
                        {selectedOrder.productName}
                      </p>

                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        {selectedOrder.weight && (
                          <div>
                            <span className="font-medium">Khối lượng:</span>{" "}
                            {selectedOrder.weight} kg
                          </div>
                        )}

                        {selectedOrder.length && (
                          <div>
                            <span className="font-medium">Kích thước:</span>{" "}
                            {selectedOrder.length} × {selectedOrder.width} ×{" "}
                            {selectedOrder.height} cm
                          </div>
                        )}

                        {selectedOrder.orderValue && (
                          <div>
                            <span className="font-medium">Giá trị hàng:</span>{" "}
                            {Number(selectedOrder.orderValue).toLocaleString(
                              "vi-VN",
                            )}
                            đ
                          </div>
                        )}
                      </div>
                    </div>

                    {/* IMAGE */}
                    {selectedOrder.imageUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={selectedOrder.imageUrl}
                          alt={selectedOrder.productName}
                          className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 object-cover rounded-xl border border-slate-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* META */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <CalendarDays size={15} />
                    Ngày tạo
                  </div>
                  <p className="text-slate-600 text-sm">
                    {new Date(selectedOrder.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-5 bg-slate-50">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                    <MapPin size={15} />
                    Hub hiện tại
                  </div>
                  <p className="text-slate-600 text-sm">
                    {selectedOrder.currentHubName ||
                      selectedOrder.currentHubId ||
                      "Chưa xác định"}
                  </p>
                </div>
                o
              </div>

              {selectedOrder.note && (
                <div className="rounded-2xl border border-amber-200 p-5 bg-amber-50">
                  <p className="text-xs font-bold text-amber-700 mb-1">
                    Ghi chú
                  </p>
                  <p className="text-sm text-amber-800">{selectedOrder.note}</p>
                </div>
              )}

              {selectedOrder.failReason && (
                <div className="rounded-2xl border border-rose-200 p-5 bg-rose-50">
                  <p className="text-xs font-bold text-rose-700 mb-1">
                    Lý do thất bại
                  </p>
                  <p className="text-sm text-rose-800">
                    {selectedOrder.failReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
