import { useEffect, useState, useMemo } from "react";
import {
  History,
  RefreshCw,
  Loader2,
  CheckCircle2,
  ChevronDown,
  MapPin,
} from "lucide-react";
import orderService from "../../services/orderService";
import useAuth from "../../hooks/useAuth";

function groupCompletedByRoute(orders) {
  const map = {};
  for (const o of orders) {
    const key = o.routeId || "__no_route__";
    if (!map[key]) {
      map[key] = {
        routeId: o.routeId || null,
        orders: [],
        completedAt: o.updatedAt || o.createdAt,
      };
    }
    map[key].orders.push(o);
    if ((o.updatedAt || o.createdAt) > map[key].completedAt) {
      map[key].completedAt = o.updatedAt || o.createdAt;
    }
  }
  return Object.values(map).sort(
    (a, b) => new Date(b.completedAt) - new Date(a.completedAt),
  );
}

function RouteHistoryCard({ group }) {
  const [expanded, setExpanded] = useState(false);
  const completed = group.orders.filter((o) => o.status === "COMPLETED").length;
  const returning = group.orders.filter((o) =>
    ["RETURNING", "CANCELLED"].includes(o.status),
  ).length;
  const total = group.orders.length;
  const revenue = group.orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((s, o) => s + (o.finalAmountToCollect || 0), 0);

  const date = group.completedAt
    ? new Date(group.completedAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div
        className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors sm:px-3 sm:py-3"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
          <CheckCircle2 size={17} className="text-emerald-600" />
        </div>

        {/* Mobile: tên tuyến nằm bên phải icon (1 dòng) + ngày tháng dưới */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-slate-900 truncate whitespace-nowrap">
                  {group.routeId || "Không có tuyến"}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                {date}
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold whitespace-nowrap">
                {completed} thành công
              </span>
              {returning > 0 && (
                <span className="text-red-500 font-semibold whitespace-nowrap">
                  {returning} hoàn
                </span>
              )}
              <span className="whitespace-nowrap">/ {total} đơn</span>
            </div>
          </div>

          {/* Mobile: số lượng ở ngay dòng bên dưới */}
          <div className="flex sm:hidden flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
            <span className="text-emerald-600 font-semibold whitespace-nowrap">
              {completed} thành công
            </span>
            {returning > 0 && (
              <span className="text-red-500 font-semibold whitespace-nowrap">
                {returning} hoàn
              </span>
            )}
            <span className="whitespace-nowrap">/ {total} đơn</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-extrabold text-slate-900">
            {revenue.toLocaleString("vi-VN")}đ
          </div>
          <div className="text-xs text-slate-400">đã thu</div>
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
        />
      </div>

      {expanded && (
        <div className="border-t border-slate-50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-2.5 text-left">Mã đơn</th>
                  <th className="px-5 py-2.5 text-left">Người nhận</th>
                  <th className="px-5 py-2.5 text-center">TT</th>
                  <th className="px-5 py-2.5 text-right">Tổng Thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {group.orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-2.5 font-mono text-xs text-red-700 font-bold">
                      {o.id}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-slate-800 text-sm">
                        {o.receiverName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 truncate max-w-[200px]">
                        <MapPin size={10} /> {o.receiverAddress}
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-center whitespace-nowrap">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md border whitespace-nowrap leading-tight inline-flex items-center justify-center align-middle
                      ${o.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                      >
                        {o.status === "COMPLETED" ? "Thành công" : "Hoàn hàng"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-800">
                      {o.status === "COMPLETED" ? (
                        `${Number(o.finalAmountToCollect || 0).toLocaleString("vi-VN")}đ`
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Tổng thu hộ tuyến này
              </span>
              <span className="font-extrabold text-slate-900 text-base">
                {revenue.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DeliveryHistory() {
  const { user } = useAuth();
  const shipperId = user?.id || user?.userId || "";

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    if (!shipperId) return;
    try {
      setRefreshing(true);
      const [compRes, retRes] = await Promise.all([
        orderService
          .getMyShipperOrders({ status: "COMPLETED" })
          .catch(() => ({ data: [] })),
        orderService
          .getMyShipperOrders({ status: "RETURNING" })
          .catch(() => ({ data: [] })),
      ]);

      const normalize = (res) =>
        Array.isArray(res.data) ? res.data : res.data?.content || [];
      setOrders([...normalize(compRes), ...normalize(retRes)]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [shipperId]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (filterDate === "today") {
      const today = new Date().toDateString();
      list = list.filter(
        (o) => new Date(o.updatedAt || o.createdAt).toDateString() === today,
      );
    } else if (filterDate === "week") {
      const weekAgo = new Date(
        Date.prototype.getTime.call(new Date()) - 7 * 24 * 3600 * 1000,
      );
      list = list.filter(
        (o) =>
          new Date(o.updatedAt || o.createdAt).getTime() > weekAgo.getTime(),
      );
    }
    if (search.trim()) {
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(search.toLowerCase()) ||
          (o.routeId || "").toLowerCase().includes(search.toLowerCase()) ||
          (o.receiverName || "").toLowerCase().includes(search.toLowerCase()),
      );
    }
    return list;
  }, [orders, search, filterDate]);

  const groups = useMemo(
    () => groupCompletedByRoute(filteredOrders),
    [filteredOrders],
  );

  return (
    <>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Lịch sử tuyến
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 leading-snug">
            Tổng hợp các tuyến đã giao · {groups.length} tuyến
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 shrink-0"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          <span className="whitespace-nowrap">Làm mới</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
          <History size={36} strokeWidth={1.5} />
          <span className="text-sm text-slate-400">
            Chưa có lịch sử tuyến nào
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => (
            <RouteHistoryCard key={group.routeId || i} group={group} />
          ))}
        </div>
      )}
    </>
  );
}
