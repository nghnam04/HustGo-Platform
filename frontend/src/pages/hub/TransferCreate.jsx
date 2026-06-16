import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Search,
  RefreshCw,
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  MapPin,
  ArrowRight,
  Map,
} from "lucide-react";
import orderService from "../../services/orderService";
import hubService from "../../services/hubService";

const STATUS_MAP = {
  COLLECTED: {
    label: "Đã nhận",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  AT_HUB: {
    label: "Tồn kho",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
};

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

export default function TransferCreate() {
  const [hubId, setHubId] = useState(null);
  const [hubInfo, setHubInfo] = useState(null);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [toHubId, setToHubId] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState(null);
  const [createdManifest, setCreatedManifest] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const [hubRes, hubsRes] = await Promise.all([
          hubService.getMyHub(),
          hubService.getAllHubsForTransfer({ pageNo: 0, pageSize: 100 }),
        ]);
        const hub = hubRes.data ?? hubRes;
        const hubIdVal = hub?.id || hub?.hubId;
        setHubId(hubIdVal);
        setHubInfo(hub);
        const allHubs = (Array.isArray(hubsRes) ? hubsRes : []).filter(
          (h) => (h.id || h.hubId) !== hubIdVal,
        );
        setHubs(allHubs);
      } catch {
        showToast("Không lấy được thông tin hub", "error");
      }
    };
    init();
  }, []);

  const fetchCollectedOrders = async () => {
    if (!hubId) return;
    try {
      setRefreshing(true);
      const res = await orderService.getInventoryAtHub(hubId, {
        status: "COLLECTED",
        page: 0,
        size: 200,
      });
      const ordersData = res.data?.content || [];
      setOrders(ordersData);
    } catch {
      showToast("Không tải được danh sách đơn", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (hubId) fetchCollectedOrders();
  }, [hubId]);

  const ordersByDistrict = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const d = o.receiverDistrict || "—";
      if (!map[d]) map[d] = [];
      map[d].push(o);
    });
    return map;
  }, [orders]);

  const districtOptions = useMemo(
    () => Object.keys(ordersByDistrict).sort(),
    [ordersByDistrict],
  );

  const availableToHubs = useMemo(() => {
    if (!hubId) return [];
    return hubs.filter((h) => (h.id || h.hubId) !== hubId);
  }, [hubs, hubId]);

  const handleToHubChange = (newHubId) => {
    setToHubId(newHubId);
    setSelected([]);
  };

  const targetDistrict = useMemo(() => {
    if (!toHubId) return null;
    const hub = hubs.find((h) => (h.id || h.hubId) === toHubId);
    return hub?.district || null;
  }, [toHubId, hubs]);

  const eligibleOrders = useMemo(() => {
    if (!targetDistrict) return [];
    return ordersByDistrict[targetDistrict] || [];
  }, [targetDistrict, ordersByDistrict]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return eligibleOrders;
    return eligibleOrders.filter(
      (o) =>
        (o.id || "").toLowerCase().includes(kw) ||
        (o.receiverName || "").toLowerCase().includes(kw) ||
        (o.receiverDistrict || "").toLowerCase().includes(kw) ||
        (o.receiverWard || "").toLowerCase().includes(kw) ||
        (o.receiverAddress || "").toLowerCase().includes(kw),
    );
  }, [eligibleOrders, search]);

  const toggleSelect = (id) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = () =>
    setSelected(
      selected.length === filtered.length ? [] : filtered.map((o) => o.id),
    );

  const handleCreateTransfer = async () => {
    if (!toHubId) {
      showToast("Vui lòng chọn hub đích", "error");
      return;
    }
    if (selected.length === 0) {
      showToast("Vui lòng chọn ít nhất 1 đơn", "error");
      return;
    }
    if (selected.length > 20) {
      showToast("Tối đa 20 đơn mỗi chuyến trung chuyển", "error");
      return;
    }
    try {
      setCreating(true);
      const res = await orderService.createTransferManifest({
        fromHubId: hubId,
        toHubId,
        orderIds: selected,
      });
      const data = res.data ?? res;
      setCreatedManifest(data);
      showToast(
        `Đã tạo chuyến trung chuyển ${data.manifestId} (${data.orderIds?.length || 0} đơn)`,
        "success",
      );
      setSelected([]);
      setToHubId("");
      fetchCollectedOrders();
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Tạo chuyến trung chuyển thất bại",
        "error",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {toast && (
        <div
          className={`fixed top-3 left-3 right-3 sm:left-auto sm:top-5 sm:right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}

      <div className="flex-1 flex flex-col p-2 sm:p-3 md:p-5 overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Tạo chuyến trung chuyển
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 flex items-start sm:items-center gap-1.5">
              <MapPin size={13} className="text-red-500" />
              {hubInfo
                ? `${hubInfo.name || hubInfo.code} (${hubInfo.district || hubId})`
                : hubId || "..."}
            </p>
          </div>
          <button
            onClick={fetchCollectedOrders}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin text-red-500" : ""}
            />
            Làm mới
          </button>
        </div>

        {/* Success banner */}
        {createdManifest && (
          <div className="mb-4 sm:mb-6 bg-emerald-50 border border-emerald-200 rounded-xl px-3 sm:px-5 py-3 sm:py-4 flex items-start sm:items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <div>
              <div className="text-sm font-bold text-emerald-800">
                Đã tạo chuyến trung chuyển {createdManifest.manifestId}
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                {createdManifest.orderIds?.length || 0} đơn · {hubId} →{" "}
                {createdManifest.toHubId}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="lg:col-span-3 space-y-4">
            {/* District filter*/}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <Map size={13} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500">
                  Quận nhận
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {districtOptions.map((d) => {
                  const count = ordersByDistrict[d].length;
                  return (
                    <span
                      key={d}
                      className="inline-flex items-center px-3 py-1 rounded-lg border text-xs font-semibold bg-slate-50 text-slate-600 border-slate-200"
                    >
                      {d} ({count})
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition"
                  placeholder="Tìm mã đơn, người nhận, địa chỉ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-xs text-slate-500 shrink-0 self-end sm:self-auto">
                {selected.length}/{filtered.length} đã chọn
              </span>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Loader2 size={28} className="animate-spin text-red-400" />
                  <span className="text-sm">Đang tải đơn COLLECTED...</span>
                </div>
              ) : !toHubId ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <ArrowRightLeft size={32} strokeWidth={1.5} />
                  <span className="text-sm">
                    Chọn hub đích bên phải để hiển thị đơn
                  </span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Package size={32} strokeWidth={1.5} />
                  <span className="text-sm">
                    Không có đơn cần trung chuyển tới Hub này
                  </span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={
                              selected.length === filtered.length &&
                              filtered.length > 0
                            }
                            onChange={toggleAll}
                            className="rounded"
                          />
                        </th>
                        <th className="px-4 py-3 text-left">Mã đơn</th>
                        <th className="px-4 py-3 text-left">Sản phẩm</th>
                        <th className="px-4 py-3 text-left">Người nhận</th>
                        <th className="px-4 py-3 text-left">Số điện thoại</th>
                        <th className="px-4 py-3 text-left">Địa chỉ nhận</th>
                        <th className="px-4 py-3 text-left">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((o) => (
                        <tr
                          key={o.id}
                          className={`hover:bg-red-50/40 transition-colors cursor-pointer ${selected.includes(o.id) ? "bg-red-50/60" : ""}`}
                          onClick={() => toggleSelect(o.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.includes(o.id)}
                              onChange={() => {}}
                              className="rounded pointer-events-none"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-red-700 font-bold">
                            {o.id}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-[180px]">
                              {o.imageUrl ? (
                                <img
                                  src={o.imageUrl}
                                  alt={o.productName || "Sản phẩm"}
                                  className="h-10 w-10 rounded-lg object-cover border border-slate-100 bg-slate-50 shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg border border-slate-100 bg-slate-50 text-slate-300 flex items-center justify-center shrink-0">
                                  <Package size={16} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-800 truncate">
                                  {o.productName || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">
                              {o.receiverName || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                            {o.receiverPhone || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs text-slate-600">
                              {o.receiverAddress}
                              {o.receiverWard ? `, ${o.receiverWard}` : ""}
                              {o.receiverDistrict
                                ? `, ${o.receiverDistrict}`
                                : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge value={o.status} map={STATUS_MAP} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right: destination + action */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-5 py-4 sm:py-5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-4">
                <ArrowRightLeft size={16} className="text-purple-500" />
                Tạo chuyến trung chuyển
              </div>

              {/* From hub (readonly) */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Hub đi
                </label>
                <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                  {hubInfo
                    ? `${hubInfo.name || ""} (${hubInfo.district || hubId})`
                    : hubId}
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <ArrowRight size={20} className="text-slate-300" />
              </div>

              {/* To hub */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  Hub đích
                </label>
                {availableToHubs.length === 0 ? (
                  <div className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                    <span className="italic text-slate-400">
                      Đang tải danh sách hub...
                    </span>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white max-h-64 overflow-y-auto">
                    {availableToHubs.map((h) => {
                      const id = h.id || h.hubId;
                      const active = toHubId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleToHubChange(id)}
                          className={`w-full px-3 py-2.5 text-left border-b border-slate-100 last:border-b-0 transition-colors ${
                            active
                              ? "bg-red-50 text-red-700"
                              : "bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {h.name || id}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {h.district || "Chưa có quận"} - {id}
                              </div>
                            </div>
                            {active && (
                              <CheckCircle2
                                size={15}
                                className="text-red-600 shrink-0"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-lg px-3 sm:px-4 py-3 mb-5 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Số đơn đã chọn</span>
                  <span className="font-bold text-slate-700">
                    {selected.length}/20
                  </span>
                </div>
                {targetDistrict && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Quận đích</span>
                    <span className="font-bold text-green-600">
                      {targetDistrict}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Trạng thái</span>
                  <span className="font-bold text-amber-600 text-right">
                    COLLECTED → IN_TRANSIT
                  </span>
                </div>
              </div>

              <button
                onClick={handleCreateTransfer}
                disabled={
                  creating ||
                  !toHubId ||
                  selected.length === 0 ||
                  selected.length > 20
                }
                className="w-full py-3 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {creating ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Truck size={15} />
                )}
                Tạo chuyến trung chuyển
              </button>

              {!toHubId && (
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Chọn hub đích để hiển thị đơn
                </p>
              )}
            </div>

            {/* Selected orders quick view */}
            {selected.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-3 sm:px-5 py-4">
                <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  Đơn đã chọn ({selected.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selected.map((id) => {
                    const o = orders.find((x) => x.id === id);
                    return o ? (
                      <div
                        key={id}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50/50 rounded-lg border border-red-100"
                      >
                        <Package size={12} className="text-red-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-bold text-red-700 truncate">
                            {id}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {o.receiverAddress}
                            {o.receiverWard ? `, ${o.receiverWard}` : ""}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 shrink-0">
                          {o.receiverDistrict}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
