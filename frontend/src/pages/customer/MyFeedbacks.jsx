import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Search,
  RefreshCw,
  Trash2,
  Edit,
  X,
  MessageCircle,
} from "lucide-react";
import orderService from "../../services/orderService";
import formatDate from "../../components/utils/formatDate";
import getRatingStars from "../../components/utils/getRatingStars";

export default function MyFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editType, setEditType] = useState("SERVICE");
  const [deletingId, setDeletingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await orderService.getMyFeedbacks();
      setFeedbacks(res.data || res || []);
    } catch (err) {
      console.error("Lỗi tải phản hồi:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadFeedbacks(true);
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch =
      !searchTerm ||
      fb.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fb.content?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    total: feedbacks.length,
    avgRating:
      feedbacks.length > 0
        ? (
            feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
            feedbacks.length
          ).toFixed(1)
        : 0,
  };

  const startEdit = (fb) => {
    setEditingId(fb.id);
    setEditContent(fb.content);
    setEditRating(fb.rating);
    setEditType(fb.type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
    setEditRating(5);
    setEditType("SERVICE");
  };

  const handleUpdate = async (id) => {
    try {
      setSubmitting(true);
      await orderService.updateFeedback(id, {
        content: editContent,
        rating: editRating,
        type: editType,
      });
      setFeedbacks(
        feedbacks.map((fb) =>
          fb.id === id
            ? {
                ...fb,
                content: editContent,
                rating: editRating,
                type: editType,
              }
            : fb,
        ),
      );
      cancelEdit();
    } catch (err) {
      console.error("Lỗi cập nhật:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phản hồi này?")) return;
    try {
      setDeletingId(id);
      await orderService.deleteFeedback(id);
      setFeedbacks(feedbacks.filter((fb) => fb.id !== id));
    } catch (err) {
      console.error("Lỗi xóa:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-5xl mx-auto space-y-6 pb-12"
    >
      {/* Header */}
      <div className="flex flex-row items-start justify-between gap-3 mb-6">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-[#801B29]/10 rounded-xl">
            <MessageCircle className="text-[#801B29] w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Phản hồi của tôi
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Xem lại các phản hồi đã gửi
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Tổng phản hồi
          </p>
          <p className="text-xl sm:text-2xl font-black text-[#801B29]">
            {stats.total}
          </p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Đánh giá TB
          </p>
          <div className="flex items-center gap-1">
            <p className="text-xl sm:text-2xl font-black text-orange-500">
              {stats.avgRating}
            </p>
            <Star
              size={16}
              className="sm:w-[18px] fill-orange-400 text-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 md:w-80 pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-[#801B29]"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-[#801B29] rounded-full mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Đang tải...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 font-medium">
            Bạn chưa gửi phản hồi nào
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredFeedbacks.map((fb) => (
            <div
              key={fb.id}
              className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {fb.orderId || "-"}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      fb.type === "ORDER"
                        ? "bg-blue-100 text-blue-700"
                        : fb.type === "SHIPPER"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {fb.type}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(fb)}
                    className="p-2 text-slate-400 hover:text-[#801B29] hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(fb.id)}
                    disabled={deletingId === fb.id}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {getRatingStars(fb.rating)}
              </div>
              <p className="text-sm text-slate-700 mb-2">{fb.content}</p>
              <p className="text-xs text-slate-400">
                {formatDate(fb.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-50"
              onClick={cancelEdit}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-0 m-auto z-50 bg-white rounded-2xl shadow-2xl w-[90%] sm:max-w-md h-fit p-5"
              style={{ maxHeight: "90vh", overflow: "auto" }}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-800">
                    Chỉnh sửa phản hồi
                  </h3>
                  <button
                    onClick={cancelEdit}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Đánh giá
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setEditRating(star)}
                        className="p-0.5"
                      >
                        <Star
                          size={22}
                          className={
                            star <= editRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Loại phản hồi
                  </label>
                  <div className="flex gap-2">
                    {["SERVICE", "ORDER", "SHIPPER"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setEditType(opt)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          editType === opt
                            ? "bg-[#801B29] text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Nội dung
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    className="w-full h-24 p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-[#801B29] focus:border-[#801B29]"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={() => handleUpdate(editingId)}
                  disabled={submitting || editContent.length < 10}
                  className="w-full py-2.5 bg-[#801B29] text-white rounded-lg text-sm font-medium hover:bg-[#6a1520] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Đang xử lý..." : "Cập nhật phản hồi"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
