import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Package,
  Navigation,
  X,
  RefreshCw,
  Loader2,
  Clock,
  Eye,
  User,
  CreditCard,
} from "lucide-react";
import orderService from "../../services/orderService";
import renderStatusBadgev3 from "../../components/utils/renderStatusBadgev3";
import MapModal from "../../components/map/MapModal";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: undefined,
  iconUrl: undefined,
  shadowUrl: undefined,
});

export default function DeliveryTracking() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedMapOrder, setSelectedMapOrder] = useState(null);

  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const money = (v) => Number(v || 0).toLocaleString("vi-VN");

  // VIEW DETAIL
  const handleViewDetail = async (order) => {
    setDetailOrder(null);
    setDetailLoading(true);
    try {
      const res = await orderService.getOrderById(order.id);
      setDetailOrder(res.data?.data || res.data);
    } catch (err) {
      console.error("[DETAIL] ERROR:", err);
      alert("Không thể tải chi tiết đơn hàng");
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchDeliveringOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getMyOrders({ size: 100 });
      const allOrders = Array.isArray(res.data)
        ? res.data
        : res.data?.content || [];
      const delivering = allOrders.filter((o) => o.status === "DELIVERING");
      setOrders(delivering);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveringOrders();
  }, []);

  const handleOpenMap = (order) => {
    setSelectedMapOrder(order);
    setShowMap(true);
  };

  const handleCloseMap = () => {
    setShowMap(false);
    setTimeout(() => setSelectedMapOrder(null), 300);
  };

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Theo dõi hành trình đơn
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Các đơn đang được giao đến bạn
          </p>
        </div>
        <button
          onClick={fetchDeliveringOrders}
          disabled={loading}
          className="text-xs px-2 sm:px-3 py-1.5 flex gap-1 items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ORDER LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="card-base py-20 text-center">
            <Loader2 size={28} className="animate-spin text-red-400 mx-auto" />
          </div>
        ) : orders.length === 0 ? (
          <div className="card-base py-20 text-center text-slate-500">
            <Package size={48} className="text-slate-200 mx-auto mb-3" />
            <div className="text-base font-semibold">
              Không có đơn đang giao
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Các đơn đang giao sẽ hiển thị tại đây
            </div>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div
              whileHover={{ y: -2 }}
              className="card-base transition-all duration-300 border border-slate-200"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono text-[#801B29] font-bold text-sm">
                    #{order.id}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                    <Clock size={11} />
                    {new Date(order.createdAt).toLocaleString("vi-VN")}
                  </div>
                </div>
                {renderStatusBadgev3(order.status)}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {order.imageUrl && (
                  <img
                    src={order.imageUrl}
                    alt="product"
                    className="w-full sm:w-20 h-32 sm:h-20 object-cover rounded-xl border border-slate-100 shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0 space-y-3">
                  <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
                    {/* Người gửi */}
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={14}
                        className="text-[#801B29] mt-0.5 shrink-0"
                      />
                      <div className="text-xs">
                        <p className="text-slate-500">Người gửi</p>
                        <p className="font-medium truncate">
                          {order.senderName} - {order.senderPhone}
                        </p>
                        <p className="text-slate-600 line-clamp-2">
                          {order.senderAddress}, {order.senderWard},{" "}
                          {order.senderDistrict}
                        </p>
                      </div>
                    </div>

                    {/* Người nhận */}
                    <div className="flex items-start gap-2">
                      <MapPin
                        size={14}
                        className="text-[#801B29] mt-0.5 shrink-0"
                      />
                      <div className="text-xs">
                        <p className="text-slate-500">Người nhận</p>
                        <p className="font-medium truncate">
                          {order.receiverName} - {order.receiverPhone}
                        </p>
                        <p className="text-slate-600 line-clamp-2">
                          {order.receiverAddress}, {order.receiverWard},{" "}
                          {order.receiverDistrict}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="border-t pt-2 flex justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Thu hộ: </span>
                      <span className="font-bold text-[#801B29]">
                        {money(order.finalAmountToCollect)} đ
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        Tổng cước vận chuyển:{" "}
                      </span>
                      <span>{money(order.totalPrice)} đ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap items-center justify-start gap-2 mt-4">
                <button
                  onClick={() => handleViewDetail(order)}
                  className="btn-ghost text-xs flex items-center justify-center gap-1.5 px-3 py-2"
                >
                  <Eye size={14} />
                  Chi tiết
                </button>

                <button
                  onClick={() => handleOpenMap(order)}
                  className="text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-medium border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Navigation size={14} />
                  Bản đồ
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* MAP MODAL */}
      {showMap && selectedMapOrder && (
        <MapModal order={selectedMapOrder} onClose={handleCloseMap} />
      )}

      {/* ORDER DETAIL MODAL */}
      <AnimatePresence>
        {detailOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card-base w-full max-w-2xl max-h-[92vh] overflow-auto"
            >
              <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Chi tiết đơn hàng
                  </h2>
                  <p className="text-sm text-slate-500 font-mono">
                    #{detailOrder.id}
                  </p>
                </div>
                <button
                  onClick={() => setDetailOrder(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div className="flex justify-center">
                  {renderStatusBadgev3(detailOrder.status)}
                </div>

                {detailOrder.imageUrl && (
                  <div className="flex justify-center">
                    <img
                      src={detailOrder.imageUrl}
                      alt="order"
                      className="w-60 h-60 object-cover rounded-xl border border-slate-200"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                    <User className="text-blue-500" size={18} />
                    Thông tin người gửi
                  </h4>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-sm space-y-2">
                    <p>
                      <strong>{detailOrder.senderName}</strong> —{" "}
                      {detailOrder.senderPhone}
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      {detailOrder.senderAddress}, {detailOrder.senderWard},{" "}
                      {detailOrder.senderDistrict}, {detailOrder.senderProvince}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-[#801B29] flex items-center gap-2">
                    <MapPin className="text-[#801B29]" size={18} />
                    Thông tin người nhận
                  </h4>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-sm space-y-2">
                    <p>
                      <strong>{detailOrder.receiverName}</strong> —{" "}
                      {detailOrder.receiverPhone}
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      {detailOrder.receiverAddress}, {detailOrder.receiverWard},{" "}
                      {detailOrder.receiverDistrict},{" "}
                      {detailOrder.receiverProvince}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Package size={18} className="text-slate-700" />
                    Thông tin hàng hóa
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-slate-50 border border-slate-100 p-4 sm:p-5 rounded-2xl text-sm">
                    <div>
                      <span className="text-slate-500">Sản phẩm:</span>
                      <br />
                      <strong>{detailOrder.productName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Trọng lượng:</span>
                      <br />
                      <strong>{detailOrder.weight} kg</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Kích thước:</span>
                      <br />
                      <strong>
                        {detailOrder.length} × {detailOrder.width} ×{" "}
                        {detailOrder.height} cm
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Giá trị hàng hoá:</span>
                      <br />
                      <strong>{money(detailOrder.orderValue)} đ</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Tiền thu hộ (COD):</span>
                      <br />
                      <strong className="text-[#801B29]">
                        {money(detailOrder.codAmount)} đ
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">
                        Tổng cước vận chuyển:
                      </span>
                      <br />
                      <strong>{money(detailOrder.totalPrice)} đ</strong>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <CreditCard size={18} className="text-green-600" />
                    Thông tin thanh toán
                  </h4>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-sm space-y-2">
                    <p>
                      <span className="text-slate-500">Phương thức:</span>{" "}
                      <strong>
                        {detailOrder.paymentMethod === "COD"
                          ? "Thanh toán khi nhận hàng (COD)"
                          : "Thanh toán online"}
                      </strong>
                    </p>
                    <p>
                      <span className="text-slate-500">Tiền cần thu:</span>{" "}
                      <strong className="text-[#801B29]">
                        {money(detailOrder.finalAmountToCollect)} đ
                      </strong>
                    </p>
                  </div>
                </div>

                {detailOrder.note && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Ghi chú giao hàng</h4>
                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl text-sm italic">
                      "{detailOrder.note}"
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
