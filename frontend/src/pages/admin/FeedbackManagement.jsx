import { useState, useEffect } from "react";
import { Star, Search, Trash2, Eye, RefreshCw } from "lucide-react";
import orderService from "../../services/orderService";
import formatDate from "../../components/utils/formatDate";
import getRatingStarsv2 from "../../components/utils/getRatingStarsv2";

export default function FeedbackManagement() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phản hồi này?")) return;
    try {
      setDeletingId(id);
      await orderService.deleteFeedback(id);
      setFeedbacks(feedbacks.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Lỗi xóa feedback:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const loadFeedbacks = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await orderService.getAllFeedbacks();
      setFeedbacks(res.data || res || []);
    } catch (err) {
      console.error("Lỗi tải feedbacks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    (async () => {
      await loadFeedbacks();
    })();
  }, []);

  const handleRefresh = () => {
    loadFeedbacks(true);
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchesFilter = filter === "ALL" || f.type === filter;
    const matchesSearch =
      !searchTerm ||
      f.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.customerId?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: feedbacks.length,
    ORDER: feedbacks.filter((f) => f.type === "ORDER").length,
    SHIPPER: feedbacks.filter((f) => f.type === "SHIPPER").length,
    SERVICE: feedbacks.filter((f) => f.type === "SERVICE").length,
    avgRating:
      feedbacks.length > 0
        ? (
            feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) /
            feedbacks.length
          ).toFixed(1)
        : 0,
  };

  return (
    <div className="p-4 md:p-6 max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-black text-slate-800">
            Quản lý phản hồi
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>

        <button
          onClick={handleRefresh}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Tổng phản hồi
          </p>
          <p className="text-2xl font-black text-[#801B29]">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Đơn hàng</p>
          <p className="text-2xl font-black text-blue-600">{stats.ORDER}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Shipper</p>
          <p className="text-2xl font-black text-green-600">{stats.SHIPPER}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Dịch vụ</p>
          <p className="text-2xl font-black text-purple-600">{stats.SERVICE}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">
            Đánh giá TB
          </p>
          <div className="flex items-center gap-1">
            <p className="text-2xl font-black text-orange-500">
              {stats.avgRating}
            </p>
            <Star size={18} className="fill-orange-400 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, nội dung..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-[#801B29]"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
          {["ALL", "ORDER", "SHIPPER", "SERVICE"].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`h-10 px-3 rounded-lg text-sm font-bold transition-colors
        ${
          filter === type
            ? "bg-[#801B29] text-white"
            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
            >
              {type === "ALL" ? "Tất cả" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-[#801B29] rounded-full mx-auto" />
          <p className="text-sm text-slate-500 mt-2">Đang tải...</p>
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <p className="text-slate-500 font-medium">Không có phản hồi nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Đơn hàng
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Loại
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Nội dung
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Đánh giá
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Ngày tạo
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFeedbacks.map((fb) => (
                  <tr key={fb.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {fb.orderId || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          fb.type === "ORDER"
                            ? "bg-blue-100 text-blue-700"
                            : fb.type === "SHIPPER"
                              ? "bg-green-100 text-green-700"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {fb.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-700 line-clamp-2 max-w-[200px]">
                        {fb.content}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {getRatingStarsv2(fb.rating)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {formatDate(fb.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedFeedback(fb)}
                          className="p-2 text-slate-400 hover:text-[#801B29] hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(fb.id)}
                          disabled={deletingId === fb.id}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 mt-15">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full h-full p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Chi tiết phản hồi
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ID: {selectedFeedback.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-slate-500 font-mono">
                {new Date(selectedFeedback?.createdAt).toLocaleDateString(
                  "vi-VN",
                  {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  },
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Loại phản hồi:
                </span>
                <span
                  className={`text-sm font-bold px-2 py-1 rounded ${
                    selectedFeedback.type === "ORDER"
                      ? "bg-blue-100 text-blue-700"
                      : selectedFeedback.type === "SHIPPER"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {selectedFeedback.type}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Đánh giá:
                </span>
                <div className="flex items-center gap-1">
                  {getRatingStarsv2(selectedFeedback.rating)}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-slate-500 block mb-2">
                  Nội dung:
                </span>
                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700">
                  {selectedFeedback.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500">Mã đơn hàng:</span>
                  <p className="text-sm font-mono text-slate-700 break-all">
                    {selectedFeedback.orderId || "-"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Mã khách hàng:</span>
                  <p className="text-sm font-mono text-slate-700">
                    {selectedFeedback.customerId}
                  </p>
                </div>
                {selectedFeedback.shipperId && (
                  <div>
                    <span className="text-xs text-slate-500">Mã Shipper:</span>
                    <p className="text-sm font-mono text-slate-700">
                      {selectedFeedback.shipperId}
                    </p>
                  </div>
                )}
                {selectedFeedback.routeId && (
                  <div>
                    <span className="text-xs text-slate-500">Mã tuyến:</span>
                    <p className="text-sm font-mono text-slate-700">
                      {selectedFeedback.routeId}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs text-slate-500">Ngày tạo:</span>
                <p className="text-sm text-slate-700">
                  {formatDate(selectedFeedback.createdAt)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
