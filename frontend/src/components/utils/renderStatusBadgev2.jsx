import { Truck, CheckCircle2, XCircle } from "lucide-react";

const renderStatusBadgev2 = (status) => {
  const badgeBaseClass =
    "whitespace-nowrap inline-flex items-center max-w-full overflow-hidden";

  switch (status) {
    case "PENDING":
      return (
        <span
          className={`${badgeBaseClass} px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold`}
        >
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

    case "IN_TRANSIT":
      return (
        <span className="px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <Truck size={11} />
          Đang trung chuyển
        </span>
      );

    case "AT_HUB":
      return (
        <span className="px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-[10px] font-bold">
          Đã tới Hub đích
        </span>
      );

    case "PICKING":
      return (
        <span className="px-2 py-1 bg-violet-50 border border-violet-200 text-violet-700 rounded-lg text-[10px] font-bold">
          Đã được Shipper nhận
        </span>
      );

    case "DELIVERING":
      return (
        <span className="px-2 py-1 bg-pink-50 border border-pink-200 text-pink-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <Truck size={11} />
          Đang giao
        </span>
      );

    case "COMPLETED":
      return (
        <span className="px-2 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <CheckCircle2 size={11} />
          Hoàn thành
        </span>
      );

    case "RETURNING":
      return (
        <span className="px-2 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <Truck size={11} />
          Đang hoàn đơn
        </span>
      );

    case "CANCELLED":
      return (
        <span className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded-lg text-[10px] font-bold flex items-center gap-1">
          <XCircle size={11} />
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
};

export default renderStatusBadgev2;
