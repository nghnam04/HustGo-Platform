import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import paymentService from "../../services/paymentService";
import {
  Clock,
  MapPin,
  Package,
  RefreshCw,
  CheckCircle2,
  Truck,
  XCircle,
  Eye,
  Edit,
  X,
  User,
  CreditCard,
  Star,
  MessageSquare,
} from "lucide-react";

import orderService from "../../services/orderService";
import renderStatusBadgev2 from "../../components/utils/renderStatusBadgev2";

export default function OrderHistory() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tracking
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  // Order Detail Modal
  const [detailOrder, setDetailOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Feedback Modal
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [feedbackType, setFeedbackType] = useState("SERVICE");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [myFeedbacks, setMyFeedbacks] = useState({});
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);

  const money = (v) => Number(v || 0).toLocaleString("vi-VN");

  // Submit Feedback
  const submitFeedback = async () => {
    if (!feedbackContent || feedbackContent.length < 10) {
      alert("Vui lòng nhập nội dung phản hồi tối thiểu 10 ký tự");
      return;
    }

    setFeedbackLoading(true);
    try {
      if (editingFeedbackId) {
        await orderService.updateFeedback(editingFeedbackId, {
          type: feedbackType,
          content: feedbackContent,
          rating: feedbackRating,
        });
        alert("Phản hồi của bạn đã được cập nhật!");
      } else {
        await orderService.createFeedback({
          orderId: feedbackOrder.id,
          type: feedbackType,
          content: feedbackContent,
          rating: feedbackRating,
        });
        alert("Phản hồi của bạn đã được gửi! Cảm ơn bạn đã đóng góp ý kiến.");
      }

      checkMyFeedbacks();
      setFeedbackOrder(null);
      setFeedbackContent("");
      setFeedbackRating(5);
      setFeedbackType("SERVICE");
      setEditingFeedbackId(null);
    } catch (err) {
      console.error("Feedback Error:", err);
      alert(err.response?.data?.message || "Không thể gửi phản hồi");
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Kiểm tra Feedback tồn tại
  const checkMyFeedbacks = async () => {
    try {
      const response = await orderService.getMyFeedbacks();
      const feedbacks = response.data || [];
      const feedbackMap = {};
      feedbacks.forEach((fb) => {
        feedbackMap[fb.orderId] = fb;
      });
      setMyFeedbacks(feedbackMap);
    } catch (err) {
      console.error("Check Feedback Error:", err);
    }
  };

  // Edit Feedback
  const handleEditFeedback = async (order) => {
    const feedback = myFeedbacks[order.id];
    if (feedback) {
      setFeedbackOrder(order);
      setFeedbackType(feedback.type);
      setFeedbackContent(feedback.content);
      setFeedbackRating(feedback.rating);
      setEditingFeedbackId(feedback.id);
    }
  };

  // Fetch Order
  const fetchOrders = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await orderService.getMyOrders();
      const orderData = response.data?.content || [];
      setOrders(orderData);
    } catch (err) {
      console.error("Fetch Order Error:", err);
      console.error("Fetch Order Status:", err.response?.status);
      console.error("Fetch Order Data:", err.response?.data);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải danh sách đơn hàng",
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await fetchOrders();
      await checkMyFeedbacks();
    })();
  }, []);

  // View Detail
  const handleViewDetail = async (order) => {
    setDetailOrder(null);
    setDetailLoading(true);

    try {
      const res = await orderService.getOrderById(order.id);
      setDetailOrder(res.data?.data || res.data || res.data);
    } catch (err) {
      console.error("Detail Error:", err);
      console.error("Detail Status:", err.response?.status);
      console.error("Detail Data:", err.response?.data);

      alert("Không thể tải chi tiết đơn hàng");
    } finally {
      setDetailLoading(false);
    }
  };

  // Edit Order
  const handleEditOrder = (order, e) => {
    e.stopPropagation();
    navigate(`/customer/orders/edit/${order.id}`);
  };

  const handlePayment = async (order, e) => {
    e.stopPropagation();
    try {
      let amount = order.totalPrice;

      if (!amount || amount < 1000) {
        const resDetail = await orderService.getOrderById(order.id);
        const fullOrder = resDetail.data?.data || resDetail.data;

        amount = fullOrder?.totalPrice || order.totalPrice || 0;
      }

      if (amount <= 0) {
        alert("Số tiền thanh toán không hợp lệ (totalPrice = 0)");
        return;
      }

      const res = await paymentService.initiatePayment(
        order.id,
        "MOMO",
        amount,
      );

      const data = res.data;

      if (data?.paymentUrl) {
        console.log("[PAYMENT] Redirecting to:", data.paymentUrl);
        window.location.href = data.paymentUrl;
      } else {
        console.error("[PAYMENT] No paymentUrl:", data);
        alert(
          "Không tạo được link thanh toán từ MoMo do trùng orderId, hãy thử lại sau 15 phút",
        );
      }
    } catch (err) {
      console.error("Payment Error:", err);
      console.error("Payment Response:", err.response?.data);
      alert(err.response?.data?.message || "Không thể khởi tạo thanh toán");
    }
  };

  const handleCancelOrder = async (order, e) => {
    e.stopPropagation();

    if (!window.confirm("Bạn có chắc muốn huỷ đơn hàng này không?")) return;

    try {
      const res = await orderService.cancelOrder(order.id);

      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id ? { ...o, status: "CANCELLED" } : o,
        ),
      );

      setSelectedOrder((prev) =>
        prev?.id === order.id ? { ...prev, status: "CANCELLED" } : prev,
      );

      setDetailOrder((prev) =>
        prev?.id === order.id ? { ...prev, status: "CANCELLED" } : prev,
      );

      alert("Huỷ đơn hàng thành công");
    } catch (err) {
      console.error("Cancel Error:", err);
      console.error("Cancel Status:", err.response?.status);
      console.error("Cancel Data:", err.response?.data);

      alert(
        err.response?.data?.message || err.message || "Huỷ đơn hàng thất bại",
      );
    }
  };

  // Tracking
  const handleViewTracking = async (order, e) => {
    e?.stopPropagation();

    if (!order?.id) return;

    if (selectedOrder?.id === order.id) {
      setSelectedOrder(null);
      setTrackingHistory([]);
      return;
    }

    setSelectedOrder(order);
    setTrackingLoading(true);
    setTrackingError("");

    try {
      const response = await orderService.getOrderHistory(order.id);

      const historyData = Array.isArray(response.data)
        ? response.data
        : response.data?.content || [];

      setTrackingHistory([...historyData].reverse());
    } catch (err) {
      console.error("Tracking Error:", err);
      console.error("Tracking Status:", err.response?.status);
      console.error("Tracking Data:", err.response?.data);

      setTrackingError(
        err.response?.data?.message ||
          err.message ||
          "Không thể tải lịch sử vận chuyển",
      );

      setTrackingHistory([]);
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Lịch sử đơn hàng
          </h1>

          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Theo dõi thông tin đơn hàng của bạn
          </p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={loading}
          className="text-xs px-2 sm:px-3 py-1.5 flex gap-1 items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* ORDER LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="card-base py-20 text-center">
            Đang tải đơn hàng...
          </div>
        ) : orders.length === 0 ? (
          <div className="card-base py-20 text-center text-slate-500">
            Chưa có đơn hàng nào
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className={`grid gap-4 sm:gap-5 items-start transition-all duration-300
    ${selectedOrder?.id === order.id ? "xl:grid-cols-2" : "grid-cols-1"}`}
            >
              {/* ORDER CARD */}
              <motion.div
                whileHover={{ y: -2 }}
                className={`card-base transition-all duration-300 border h-full 
                  ${
                    selectedOrder?.id === order.id
                      ? "border-[#801B29] shadow-lg"
                      : "border-slate-200"
                  }`}
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

                  {renderStatusBadgev2(order.status)}
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
                    <div
                      className={`grid gap-3 ${selectedOrder?.id === order.id ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"}`}
                    >
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

                <div
                  className="flex flex-wrap items-center justify-start gap-2 mt-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => handleViewDetail(order)}
                    className="btn-ghost text-xs flex items-center justify-center gap-1.5 px-3 py-2"
                  >
                    <Eye size={14} />
                    Chi tiết
                  </button>

                  <button
                    onClick={(e) => handleViewTracking(order, e)}
                    className={`text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors
                      ${
                        selectedOrder?.id === order.id
                          ? "bg-[#801B29] text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                  >
                    <Truck size={14} />
                    Theo dõi
                  </button>

                  {order.status === "PENDING" && (
                    <button
                      onClick={(e) => handleEditOrder(order, e)}
                      className="text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                    >
                      <Edit size={14} />
                      Sửa
                    </button>
                  )}

                  {order.status === "PENDING" &&
                    order.paymentMethod === "ONLINE_PAYMENT" && (
                      <button
                        onClick={(e) => handlePayment(order, e)}
                        className="text-xs flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold bg-yellow-400 hover:bg-yellow-500 text-black"
                      >
                        <CreditCard size={14} />
                        Thanh toán
                      </button>
                    )}

                  {order.status === "PENDING" && (
                    <button
                      onClick={(e) => handleCancelOrder(order, e)}
                      className="btn-primary text-xs flex items-center justify-center gap-1.5 px-3 py-2"
                    >
                      <XCircle size={14} />
                      Huỷ
                    </button>
                  )}

                  {/* Feedback */}
                  {order.status === "COMPLETED" && !myFeedbacks[order.id] && (
                    <button
                      onClick={() => {
                        setFeedbackOrder(order);
                        setFeedbackType("SERVICE");
                        setFeedbackContent("");
                        setFeedbackRating(5);
                      }}
                      className="text-xs flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-medium hover:bg-amber-100 transition-colors"
                    >
                      <MessageSquare size={14} />
                      Đánh giá
                    </button>
                  )}

                  {order.status === "COMPLETED" && myFeedbacks[order.id] && (
                    <button
                      onClick={() => handleEditFeedback(order)}
                      className="text-xs flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-medium hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      Sửa đánh giá
                    </button>
                  )}
                </div>
              </motion.div>

              {/* PANEL */}
              <AnimatePresence>
                {selectedOrder?.id === order.id && (
                  <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.25 }}
                    className="card-base border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">
                          Theo dõi đơn hàng
                        </h3>

                        <p className="text-xs text-slate-500 font-mono mt-1">
                          #{selectedOrder.id}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedOrder(null)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <X size={18} className="text-slate-500" />
                      </button>
                    </div>

                    {trackingLoading ? (
                      <div className="py-16 text-center text-slate-500">
                        Đang tải lịch sử...
                      </div>
                    ) : trackingError ? (
                      <div className="py-10 text-red-500 text-center">
                        {trackingError}
                      </div>
                    ) : trackingHistory.length === 0 ? (
                      <div className="py-16 text-center text-slate-500">
                        Chưa có cập nhật nào
                      </div>
                    ) : (
                      <div className="relative pl-2 sm:pl-4">
                        {/* LINE */}
                        <div className="absolute left-[23px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#801B29] to-slate-200 rounded-full" />

                        <div className="space-y-5">
                          {trackingHistory.map((step, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="relative flex gap-4"
                            >
                              {/* ICON */}
                              <div
                                className={`z-10 flex items-center justify-center w-11 h-11 rounded-full border-[5px] bg-white shadow-sm shrink-0
                                  ${
                                    step.newStatus === "COMPLETED"
                                      ? "border-emerald-500"
                                      : step.newStatus === "CANCELLED"
                                        ? "border-red-500"
                                        : "border-[#801B29]"
                                  }`}
                              >
                                {step.newStatus === "COMPLETED" ? (
                                  <CheckCircle2
                                    size={18}
                                    className="text-emerald-500"
                                  />
                                ) : step.newStatus === "CANCELLED" ? (
                                  <XCircle size={18} className="text-red-500" />
                                ) : (
                                  <Truck size={18} className="text-[#801B29]" />
                                )}
                              </div>

                              {/* CONTENT */}
                              <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm hover:shadow-md transition-all">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm">
                                      {step.note || "Cập nhật trạng thái"}
                                    </p>

                                    {step.oldStatus &&
                                      step.oldStatus !== step.newStatus && (
                                        <p className="text-xs text-slate-500 mt-1">
                                          Chuyển trạng thái: {step.oldStatus} →{" "}
                                          {step.newStatus}
                                        </p>
                                      )}
                                  </div>

                                  {renderStatusBadgev2(step.newStatus)}
                                </div>

                                <div className="mt-4 pt-3 border-t border-dashed border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
                                  <div className="font-medium">
                                    {step.changedBy
                                      ? `Cập nhật bởi: ${step.changedBy}`
                                      : "Hệ thống cập nhật"}
                                  </div>

                                  <div>
                                    {new Date(step.createdAt).toLocaleString(
                                      "vi-VN",
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* ORDER DETAIL MODAL */}
      <AnimatePresence>
        {detailOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 mt-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="card-base card-glow w-full max-w-2xl max-h-[92vh] overflow-auto"
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
                  {renderStatusBadgev2(detailOrder.status)}
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

                      {detailOrder.paymentProvider && (
                        <p>
                          <span className="text-slate-500">
                            Cổng thanh toán:
                          </span>{" "}
                          <strong>{detailOrder.paymentProvider}</strong>
                        </p>
                      )}

                      <p>
                        <span className="text-slate-500">Shipper cần thu:</span>{" "}
                        <strong className="text-[#801B29]">
                          {money(detailOrder.finalAmountToCollect)} đ
                        </strong>
                      </p>
                    </div>
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

      {/* FEEDBACK MODAL */}
      <AnimatePresence>
        {feedbackOrder && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-base w-full max-w-md"
            >
              <div className="bg-white rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900">
                    Đánh giá đơn hàng
                  </h2>
                  <button
                    onClick={() => setFeedbackOrder(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>

                <div className="text-xs text-slate-500">
                  Đơn hàng:{" "}
                  <span className="font-mono">{feedbackOrder.id}</span>
                </div>

                {/* Feedback Type */}
                <div className="space-y-1.5">
                  <label className="font-medium text-xs text-slate-700">
                    Loại phản hồi
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: "ORDER", label: "Đơn hàng" },
                      { value: "SHIPPER", label: "Shipper" },
                      { value: "SERVICE", label: "Dịch vụ" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFeedbackType(opt.value)}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium border transition-colors ${
                          feedbackType === opt.value
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="space-y-1.5">
                  <label className="font-medium text-xs text-slate-700">
                    Đánh giá
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setFeedbackRating(star)}
                        className="p-0.5"
                      >
                        <Star
                          size={22}
                          className={
                            star <= feedbackRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="font-medium text-xs text-slate-700">
                    Nội dung phản hồi
                  </label>
                  <textarea
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    className="w-full h-24 p-3 border border-slate-200 rounded-lg text-xs resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    {feedbackContent.length}/10 ký tự tối thiểu
                  </p>
                </div>

                {/* Submit */}
                <button
                  onClick={submitFeedback}
                  disabled={feedbackLoading || feedbackContent.length < 10}
                  className="w-full py-2 bg-[#801B29] text-white rounded-lg text-xs font-medium hover:bg-[#6a1520] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {feedbackLoading
                    ? "Đang xử lý..."
                    : editingFeedbackId
                      ? "Cập nhật phản hồi"
                      : "Gửi phản hồi"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
