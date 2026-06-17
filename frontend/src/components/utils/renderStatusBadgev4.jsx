const renderStatusBadgev4 = (status) => {
  switch (status) {
    case "PENDING":
      return (
        <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold">
          Chờ xử lý
        </span>
      );
    case "CREATED":
      return (
        <span className="px-2 py-1 bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-lg text-[10px] font-bold">
          Đã thanh toán
        </span>
      );
    case "COLLECTED":
      return (
        <span className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold">
          Đã gửi tại Hub
        </span>
      );
    case "AT_HUB":
      return (
        <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold">
          Đã tới Hub đích
        </span>
      );
    case "PICKING":
      return (
        <span className="px-2 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-[10px] font-bold">
          Đang lấy hàng
        </span>
      );
    case "IN_TRANSIT":
      return (
        <span className="px-2 py-1 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-lg text-[10px] font-bold">
          Đang vận chuyển
        </span>
      );
    case "DELIVERING":
      return (
        <span className="px-2 py-1 bg-pink-50 border border-pink-200 text-pink-700 rounded-lg text-[10px] font-bold">
          Đang giao hàng
        </span>
      );
    case "COMPLETED":
      return (
        <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold">
          Hoàn thành
        </span>
      );
    case "CANCELLED":
      return (
        <span className="px-2 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold">
          Đã hủy
        </span>
      );
    case "RETURNING":
      return (
        <span className="px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-[10px] font-bold">
          Đang hoàn hàng
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-bold">
          {status}
        </span>
      );
  }
};

export default renderStatusBadgev4;
