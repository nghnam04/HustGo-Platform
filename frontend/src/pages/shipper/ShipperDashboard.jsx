import React, { useEffect, useState } from "react";
import {
  Truck,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingUp,
  RefreshCw,
  Loader2,
  ChevronRight,
  Activity,
} from "lucide-react";
import { Link } from "react-router-dom";
import orderService from "../../services/orderService";
import useAuth from "../../hooks/useAuth";
import RevenueChart from "../../components/common/RevenueChart";
import StatCardv2 from "../../components/dashboard/StatCardv2";

export default function ShipperDashboard() {
  const { user } = useAuth();
  const shipperId = user?.id || user?.userId || "";

  const [loading, setLoading] = useState(true);
  const [myOrders, setMyOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterDate, setFilterDate] = useState("all");
  const [chartView, setChartView] = useState("day");
  const [chartMonth, setChartMonth] = useState(new Date().getMonth() + 1);
  const [chartYear, setChartYear] = useState(new Date().getFullYear());
  const [shipperRevenue, setShipperRevenue] = useState(null);
  const [filterSummary, setFilterSummary] = useState(null); // API cho filter today/week/month/all
  const [monthlyChartData, setMonthlyChartData] = useState([]); // API cho chart month view

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const ordersRes = await orderService.getMyShipperOrders();
      const orders = Array.isArray(ordersRes.data)
        ? ordersRes.data
        : ordersRes.data?.content || [];
      setMyOrders(orders);
      if (chartView === "day" && shipperId) {
        const revenueRes = await orderService.getShipperRevenue(
          shipperId,
          chartMonth,
          chartYear,
        );
        setShipperRevenue(revenueRes.data);
      }
    } catch (err) {
      console.error("Lỗi tải dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (shipperId) fetchData();
  }, [shipperId, chartMonth, chartYear, chartView]);

  useEffect(() => {
    if (!shipperId) return;
    orderService
      .getShipperRevenueByFilter(shipperId, filterDate)
      .then((res) => setFilterSummary(res.data))
      .catch(() => setFilterSummary(null));
  }, [shipperId, filterDate]);

  useEffect(() => {
    if (!shipperId || chartView === "day") return;
    orderService
      .getShipperMonthlyRevenueChart(shipperId)
      .then((res) => setMonthlyChartData(res.data || []))
      .catch(() => setMonthlyChartData([]));
  }, [shipperId, chartView]);

  const stats = {
    picking: myOrders.filter((o) => o.status === "PICKING").length,
    delivering: myOrders.filter((o) => o.status === "DELIVERING").length,
    completed: myOrders.filter((o) => o.status === "COMPLETED").length,
    returning: myOrders.filter((o) => o.status === "RETURNING").length,
  };

  const filteredStats = React.useMemo(() => {
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const parts = dateStr.split(/[\s T]/);
      if (parts.length < 2) return null;
      const [ymd, hms] = parts;
      const [y, mo, d] = ymd.split("-").map(Number);
      const [h, mi, s] = (hms || "0:0:0").split(":").map(Number);
      return new Date(y, mo - 1, d, h || 0, mi || 0, s || 0, 0);
    };
    const toVnDateStr = (date) =>
      date.toLocaleDateString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

    const now = new Date();
    const vnToday = toVnDateStr(now);
    const completedOrders = myOrders.filter((o) => o.status === "COMPLETED");
    let list = completedOrders;

    if (filterDate === "today") {
      list = list.filter((o) => {
        const d = parseDate(o.updatedAt || o.createdAt);
        if (!d) return false;
        return toVnDateStr(d) === vnToday;
      });
    } else if (filterDate === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      list = list.filter((o) => {
        const d = parseDate(o.updatedAt || o.createdAt);
        if (!d) return false;
        d.setHours(0, 0, 0, 0);
        return d >= weekAgo;
      });
    } else if (filterDate === "month") {
      const y = now.getFullYear();
      const m = now.getMonth();
      list = list.filter((o) => {
        const d = parseDate(o.updatedAt || o.createdAt);
        if (!d) return false;
        return d.getFullYear() === y && d.getMonth() === m;
      });
    }

    const totalThuHoi = list.reduce(
      (s, o) => s + (o.finalAmountToCollect || 0),
      0,
    );

    // Tổng doanh thu = lương cứng (10k/đơn) + hoa hồng COD (2%)
    const totalDoanhThu = list.reduce((s, o) => {
      const codAmount = Number(o.codAmount || 0);
      const baseEarnings = 10000;
      const codCommission = Math.round(codAmount * 0.02);
      return s + baseEarnings + codCommission;
    }, 0);
    return { totalThuHoi, totalDoanhThu, totalCount: list.length };
  }, [myOrders, filterDate]);

  const activeOrders = myOrders
    .filter((o) => ["PICKING", "DELIVERING"].includes(o.status))
    .slice(0, 5);

  const chartData = React.useMemo(() => {
    if (chartView === "month") {
      return monthlyChartData.map((m) => ({
        label: `${m.month}`,
        baseEarnings: Number(m.baseEarnings || 0),
        codCommission: Number(m.codCommission || 0),
      }));
    }

    if (!shipperRevenue?.dailyRevenue) {
      const daysInMonth = new Date(chartYear, chartMonth, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => ({
        date: { dayOfMonth: i + 1, month: chartMonth },
        baseEarnings: 0,
        codCommission: 0,
        totalRevenue: 0,
        orderCount: 0,
      }));
    }
    return shipperRevenue.dailyRevenue.map((d) => ({
      date: { dayOfMonth: new Date(d.date).getDate(), month: chartMonth },
      baseEarnings: d.baseEarnings,
      codCommission: d.codCommission,
      totalRevenue: d.totalEarnings,
      orderCount: d.orderCount,
    }));
  }, [shipperRevenue, chartMonth, chartYear, chartView, monthlyChartData]);

  const QUICK = [
    {
      key: "routes",
      label: "Xem tuyến có sẵn",
      icon: Navigation,
      path: "/shipper/routes",
      color: "bg-blue-50 text-blue-600 border-blue-100",
      desc: "Nhận tuyến mới từ hub",
    },
    {
      key: "delivery",
      label: "Tuyến đang giao",
      icon: Truck,
      path: "/shipper/delivery",
      color: "bg-red-50 text-red-600 border-red-100",
      desc: "Cập nhật kết quả giao",
    },
    {
      key: "history",
      label: "Lịch sử tuyến",
      icon: TrendingUp,
      path: "/shipper/history",
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      desc: "Xem các tuyến đã hoàn thành",
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
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
          className="flex shrink-0 items-center justify-center gap-1.5 px-2.5 py-1.5 sm:gap-2 sm:px-4 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCardv2
              label="Chờ lấy hàng"
              value={stats.picking}
              icon={<Package size={18} />}
              accent="bg-purple-50 text-purple-600"
              sub="Đến hub lấy lô hàng"
            />
            <StatCardv2
              label="Đang giao"
              value={stats.delivering}
              icon={<Truck size={18} />}
              accent="bg-blue-50 text-blue-600"
              sub="Trên đường giao khách"
            />
            <StatCardv2
              label="Đã hoàn thành"
              value={stats.completed}
              icon={<CheckCircle2 size={18} />}
              accent="bg-emerald-50 text-emerald-600"
            />
            <StatCardv2
              label="Đang hoàn hàng"
              value={stats.returning}
              icon={<AlertTriangle size={18} />}
              accent="bg-red-50 text-red-600"
              sub="Cần trả về hub"
            />
          </div>

          {/* Revenue summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-700">
                    Tổng thu hộ
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {filterSummary?.completedOrders || 0} đơn thành công
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { key: "today", label: "Hôm nay" },
                    { key: "week", label: "7 ngày" },
                    { key: "month", label: "Tháng" },
                    { key: "all", label: "Tất cả" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilterDate(f.key)}
                      className={`px-2 py-1 rounded text-xs font-semibold border transition-colors whitespace-nowrap
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
              <div className="text-2xl font-extrabold text-slate-900">
                {filteredStats.totalThuHoi.toLocaleString("vi-VN")}đ
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-slate-700">
                    Tổng doanh thu
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Lương cứng + Hoa hồng COD
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { key: "today", label: "Hôm nay" },
                    { key: "week", label: "7 ngày" },
                    { key: "month", label: "Tháng" },
                    { key: "all", label: "Tất cả" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilterDate(f.key)}
                      className={`px-2 py-1 rounded text-xs font-semibold border transition-colors whitespace-nowrap
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
              <div className="text-2xl font-extrabold text-emerald-600">
                {new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                  maximumFractionDigits: 0,
                }).format(filterSummary?.totalEarnings || 0)}
                đ
              </div>
            </div>
          </div>

          {/* Revenue chart*/}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-4 sm:px-5 mb-6 overflow-hidden">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-3">
              <div className="text-sm font-bold text-slate-700">
                Biểu đồ doanh thu
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {chartView === "day" && (
                  <>
                    <button
                      onClick={() => {
                        const prev = new Date(chartYear, chartMonth - 2, 1);
                        setChartMonth(prev.getMonth() + 1);
                        setChartYear(prev.getFullYear());
                      }}
                      className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                    >
                      ‹
                    </button>
                    <span className="text-xs font-semibold text-slate-600 min-w-[80px] text-center">
                      {chartMonth}/{chartYear}
                    </span>
                    <button
                      onClick={() => {
                        const next = new Date(chartYear, chartMonth, 1);
                        setChartMonth(next.getMonth() + 1);
                        setChartYear(next.getFullYear());
                      }}
                      className="px-2 py-1 text-xs rounded border border-slate-200 hover:bg-slate-50"
                    >
                      ›
                    </button>
                  </>
                )}
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
                        : "bg-white text-slate-600 border-slate-200"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <RevenueChart data={chartData} view={chartView} type="shipper" />
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.key}
                  to={q.path}
                  className={`flex items-center gap-3 sm:gap-4 p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 bg-white`}
                >
                  <div className={`p-3 rounded-lg ${q.color}`}>
                    <Icon size={20} />
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

          {/* Active orders */}
          {activeOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Activity size={15} className="text-red-500" />
                  Đơn đang xử lý
                </h2>
                <Link
                  to="/shipper/delivery"
                  className="text-xs text-red-600 font-semibold flex items-center gap-1 hover:underline"
                >
                  Xem tất cả <ChevronRight size={13} />
                </Link>
              </div>
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Mã đơn</th>
                    <th className="px-5 py-3 text-left">Người nhận</th>
                    <th className="px-5 py-3 text-left">Tuyến</th>
                    <th className="px-5 py-3 text-left">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Thu hộ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activeOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-mono text-xs text-red-700 font-bold">
                        {o.id}
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {o.receiverName || "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-purple-600">
                        {o.routeId || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap text-xs font-semibold px-2 py-0.5 rounded-md border
                          ${
                            o.status === "PICKING"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {o.status === "PICKING"
                            ? "Chờ lấy hàng"
                            : "Đang giao"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">
                        {Number(o.finalAmountToCollect || 0).toLocaleString(
                          "vi-VN",
                        )}
                        đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
