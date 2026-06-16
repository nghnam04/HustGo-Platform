import { useEffect, useState, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  RefreshCw,
  Loader2,
  ChevronRight,
  PlusCircle,
  ClipboardList,
  MapPin,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Coins,
  MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import orderService from "../../services/orderService";
import useAuth from "../../hooks/useAuth";
import RevenueChart from "../../components/common/RevenueChart";
import StatCard from "../../components/dashboard/StatCard";
import renderStatusBadge from "../../components/utils/renderStatusBadge";
import parseDate from "../../components/utils/parseDate";
import toVnDateStr from "../../components/utils/toVnDateStr";

export default function CustomerDashboard() {
  useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState("all");
  const [chartMonth, setChartMonth] = useState(new Date().getMonth() + 1);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [chartView, setChartView] = useState("day");

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const res = await orderService.getMyOrders({ size: 500 });
      const orderData = res.data?.content || res.data || [];
      setOrders(orderData);
    } catch (err) {
      console.error("Lỗi tải dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const stats = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "PENDING").length,
      active: orders.filter((o) =>
        [
          "CREATED",
          "COLLECTED",
          "IN_TRANSIT",
          "AT_HUB",
          "PICKING",
          "DELIVERING",
        ].includes(o.status),
      ).length,
      completed: orders.filter((o) => o.status === "COMPLETED").length,
      cancelled: orders.filter((o) => o.status === "CANCELLED").length,
      returning: orders.filter((o) => o.status === "RETURNING").length,
    }),
    [orders],
  );

  const spendingSummary = useMemo(() => {
    const now = new Date();
    const vnToday = toVnDateStr(now);

    const filtered = orders.filter((o) => {
      const d = parseDate(o.updatedAt || o.createdAt);
      if (!d) return false;

      if (filterDate === "today") {
        return toVnDateStr(d) === vnToday;
      } else if (filterDate === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        weekAgo.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);
        return d >= weekAgo;
      } else if (filterDate === "month") {
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      }
      return true;
    });

    const onlineTotal = filtered
      .filter(
        (o) => o.paymentMethod === "ONLINE_PAYMENT" && o.status === "COMPLETED",
      )
      .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

    const codPending = filtered
      .filter((o) => o.status === "COMPLETED")
      .reduce((sum, o) => sum + Number(o.codAmount || 0), 0);

    const onlineCount = filtered.filter(
      (o) => o.paymentMethod === "ONLINE_PAYMENT" && o.status === "COMPLETED",
    ).length;
    const codPendingCount = filtered.filter(
      (o) => o.codAmount !== 0.0 && o.status === "COMPLETED",
    ).length;

    return {
      onlineTotal,
      codPending,
      onlineCount,
      codPendingCount,
      total: onlineTotal + codPending,
    };
  }, [orders, filterDate]);

  const chartData = useMemo(() => {
    const now = new Date();

    if (chartView === "month") {
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(chartYear, chartMonth - 1 - i, 1);
        const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const monthOrders = orders.filter((o) => {
          const od = parseDate(o.updatedAt || o.createdAt);
          if (!od) return false;
          return (
            od.getFullYear() === d.getFullYear() &&
            od.getMonth() + 1 === d.getMonth() + 1
          );
        });
        const chiTieu = monthOrders
          .filter(
            (o) =>
              o.paymentMethod === "ONLINE_PAYMENT" && o.status === "COMPLETED",
          )
          .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
        const codNhan = monthOrders
          .filter((o) => o.status === "COMPLETED")
          .reduce((sum, o) => sum + Number(o.codAmount || 0), 0);
        months.push({
          label: `${d.getMonth() + 1}/${d.getFullYear()}`,
          chiTieu,
          codNhan,
          orderCount: monthOrders.length,
        });
      }
      return months;
    }

    // Group by day
    const daysInMonth = new Date(chartYear, chartMonth, 0).getDate();
    const isCurrentMonth =
      now.getFullYear() === chartYear && now.getMonth() + 1 === chartMonth;

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const isFuture = isCurrentMonth ? day > now.getDate() : false;

      if (isFuture) {
        return {
          label: `${day}/${chartMonth}`,
          chiTieu: 0,
          codNhan: 0,
          orderCount: 0,
        };
      }

      // Calculate spending for this day
      const dayOrders = orders.filter((o) => {
        const d = parseDate(o.updatedAt || o.createdAt);
        if (!d) return false;
        return (
          d.getFullYear() === chartYear &&
          d.getMonth() + 1 === chartMonth &&
          d.getDate() === day
        );
      });

      const chiTieu = dayOrders
        .filter(
          (o) =>
            o.paymentMethod === "ONLINE_PAYMENT" && o.status === "COMPLETED",
        )
        .reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

      const codNhan = dayOrders
        .filter((o) => o.status === "COMPLETED")
        .reduce((sum, o) => sum + Number(o.codAmount || 0), 0);

      return {
        label: `${day}/${chartMonth}`,
        chiTieu,
        codNhan,
        orderCount: dayOrders.length,
      };
    });
  }, [orders, chartMonth, chartYear, chartView]);

  // 5 most recently updated orders
  const recentOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt) -
          new Date(a.updatedAt || a.createdAt),
      )
      .slice(0, 5);
  }, [orders]);

  // Quick links
  const QUICK = [
    {
      key: "create",
      label: "Tạo đơn hàng",
      icon: PlusCircle,
      path: "/customer/create-order",
      color: "bg-blue-50 text-blue-600 border-blue-100",
      desc: "Gửi hàng mới",
    },
    {
      key: "history",
      label: "Lịch sử đơn hàng",
      icon: ClipboardList,
      path: "/customer/orders",
      color: "bg-purple-50 text-purple-600 border-purple-100",
      desc: "Xem tất cả đơn",
    },
    {
      key: "tracking",
      label: "Theo dõi hành trình",
      icon: MapPin,
      path: "/customer/delivery-tracking",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      desc: "Tra cứu vận đơn",
    },
    {
      key: "feedback",
      label: "Phản hồi",
      icon: MessageSquare,
      path: "/customer/feedbacks",
      color: "bg-amber-50 text-amber-600 border-amber-100",
      desc: "Gửi phản hồi",
    },
  ];

  const money = (v) => Number(v || 0).toLocaleString("vi-VN");

  return (
    <>
      {/* Header */}
      <div className="flex flex-row items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          <span>Làm mới</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
            <StatCard
              label="Chờ xử lý"
              value={orders.filter((o) => o.status === "PENDING").length}
              icon={<Clock size={18} />}
              accent="bg-amber-50 text-amber-600"
            />

            <StatCard
              label="Đã thanh toán"
              value={orders.filter((o) => o.status === "CREATED").length}
              icon={<CreditCard size={18} />}
              accent="bg-yellow-50 text-yellow-700"
            />

            <StatCard
              label="Đã gửi tại Hub"
              value={orders.filter((o) => o.status === "COLLECTED").length}
              icon={<MapPin size={18} />}
              accent="bg-blue-50 text-blue-600"
            />

            <StatCard
              label="Đang trung chuyển"
              value={orders.filter((o) => o.status === "IN_TRANSIT").length}
              icon={<Truck size={18} />}
              accent="bg-indigo-50 text-indigo-700"
            />

            <StatCard
              label="Đã tới Hub đích"
              value={orders.filter((o) => o.status === "AT_HUB").length}
              icon={<Truck size={18} />}
              accent="bg-orange-50 text-orange-700"
            />

            <StatCard
              label="Shipper đang lấy"
              value={orders.filter((o) => o.status === "PICKING").length}
              icon={<Truck size={18} />}
              accent="bg-violet-50 text-violet-700"
            />

            <StatCard
              label="Đang giao"
              value={orders.filter((o) => o.status === "DELIVERING").length}
              icon={<Truck size={18} />}
              accent="bg-pink-50 text-pink-700"
            />

            <StatCard
              label="Hoàn thành"
              value={orders.filter((o) => o.status === "COMPLETED").length}
              icon={<CheckCircle2 size={18} />}
              accent="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              label="Đã hủy"
              value={orders.filter((o) => o.status === "CANCELLED").length}
              icon={<XCircle size={18} />}
              accent="bg-red-50 text-red-600"
            />

            <StatCard
              label="Đang hoàn đơn"
              value={orders.filter((o) => o.status === "RETURNING").length}
              icon={<AlertCircle size={18} />}
              accent="bg-orange-50 text-orange-600"
            />
          </div>

          {/* Spending summary */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 sm:px-5 py-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-sm font-bold text-slate-700">
                  Tổng chi tiêu
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {spendingSummary.onlineCount} đơn online ·{" "}
                  {spendingSummary.codPendingCount} đơn COD chờ nhận
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {[
                  { key: "today", label: "Hôm nay" },
                  { key: "week", label: "7 ngày" },
                  { key: "month", label: "Tháng" },
                  { key: "all", label: "Tất cả" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterDate(f.key)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                      ${
                        filterDate === f.key
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
                      }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
              {money(spendingSummary.onlineTotal)} đ
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs sm:text-sm">
              <span className="text-emerald-600 flex items-center gap-1">
                <CreditCard size={13} />
                Online: {money(spendingSummary.onlineTotal)} đ
              </span>
              <span className="text-orange-500 flex items-center gap-1">
                <Coins size={13} />
                COD chờ nhận: {money(spendingSummary.codPending)} đ
              </span>
            </div>
          </div>

          {/* Spending chart */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 sm:px-5 py-4 mb-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="text-sm font-bold text-slate-700">
                Biểu đồ chi tiêu
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => {
                    if (chartView === "day") {
                      const prev = new Date(chartYear, chartMonth - 2, 1);
                      setChartMonth(prev.getMonth() + 1);
                      setChartYear(prev.getFullYear());
                    } else {
                      setChartYear(chartYear - 1);
                    }
                  }}
                  className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                >
                  ‹
                </button>
                <span className="text-xs font-semibold text-slate-600 min-w-[80px] text-center">
                  {chartView === "day"
                    ? `${chartMonth}/${chartYear}`
                    : chartYear}
                </span>
                <button
                  onClick={() => {
                    if (chartView === "day") {
                      const next = new Date(chartYear, chartMonth, 1);
                      setChartMonth(next.getMonth() + 1);
                      setChartYear(next.getFullYear());
                    } else {
                      setChartYear(chartYear + 1);
                    }
                  }}
                  className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                >
                  ›
                </button>
                {[
                  { key: "day", label: "Ngày" },
                  { key: "month", label: "Tháng" },
                ].map((v) => (
                  <button
                    key={v.key}
                    onClick={() => setChartView(v.key)}
                    className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                      chartView === v.key
                        ? "bg-red-600 text-white border-red-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-red-300"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <RevenueChart data={chartData} view="day" type="customer" />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6">
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.key}
                  to={q.path}
                  className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 bg-white`}
                >
                  <div className={`p-2.5 sm:p-3 rounded-lg ${q.color}`}>
                    <Icon size={18} sm:size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">
                      {q.label}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {q.desc}
                    </div>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-slate-300" />
                </Link>
              );
            })}
          </div>

          {/* Recent orders */}
          {recentOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp size={15} className="text-red-500" />
                  Đơn gần đây
                </h2>
                <Link
                  to="/customer/orders"
                  className="text-xs text-red-600 font-semibold flex items-center gap-1 hover:underline"
                >
                  Xem tất cả <ChevronRight size={13} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 sm:px-5 py-3 text-left">Mã đơn</th>
                      <th className="px-4 sm:px-5 py-3 text-left">
                        Người nhận
                      </th>
                      <th className="px-4 sm:px-5 py-3 text-left">
                        Phí Thu hộ
                      </th>
                      <th className="px-4 sm:px-5 py-3 text-left">
                        Trạng thái
                      </th>
                      <th className="px-4 sm:px-5 py-3 text-right">
                        Cước vận chuyển
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/60">
                        <td className="px-4 sm:px-5 py-3 font-mono text-xs text-red-700 font-bold whitespace-nowrap">
                          {o.id}
                        </td>
                        <td className="px-4 sm:px-5 py-3 font-medium text-slate-800 whitespace-nowrap">
                          {o.receiverName || "—"}
                        </td>
                        <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                          <span className="text-xs font-semibold text-[#801B29]">
                            {money(o.codAmount || 0)} đ
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-3 whitespace-nowrap">
                          <div className="inline-flex items-center max-w-full">
                            {renderStatusBadge(o.status)}
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {money(o.totalPrice)} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
