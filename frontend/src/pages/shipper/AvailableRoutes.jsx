import { useEffect, useState, useRef, useLayoutEffect } from "react";
import "leaflet/dist/leaflet.css";
import {
  Navigation,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  Map as MapIcon,
} from "lucide-react";
import orderService from "../../services/orderService";
import { useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import RouteCard from "../../components/shipper/RouteCard";
import groupIntoRoutes from "../../components/shipper/groupIntoRoutes";
import PreviewModal from "../../components/shipper/PreviewModal";

export default function AvailableRoutes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [accepting, setAccepting] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewRoute, setPreview] = useState(null);
  const [shipperPos, setShipperPos] = useState(null);
  const pollRef = useRef(null);

  // Theo dõi vị trí shipper liên tục (bật/tắt định vị sẽ được phản ánh)
  useEffect(() => {
    if (!navigator.geolocation) return;

    // Lấy vị trí lần đầu
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setShipperPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setShipperPos(null),
      { enableHighAccuracy: false, timeout: 5000 },
    );

    // Theo dõi thay đổi vị trí liên tục
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setShipperPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        // Tắt định vị hoặc lỗi → không hiển thị tuyến
        setShipperPos(null);
      },
      { enableHighAccuracy: false, timeout: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch lại khi vị trí thay đổi (bật/tắt định vị)
  useEffect(() => {
    if (shipperPos) {
      fetchRoutes();
    } else {
      setRoutes([]); // Tắt định vị → ẩn danh sách
    }
  }, [shipperPos]);

  // Polling để cập nhật danh sách (có đơn mới / có shipper khác nhận)
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (shipperPos) fetchRoutes();
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [shipperPos]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRoutes = async () => {
    if (!shipperPos) return; // Chờ lấy vị trí xong
    try {
      setRefreshing(true);
      // Truyền lat/lng để filter theo khoảng cách 5km từ shipper đến hub
      const res = await orderService.getAvailableRoutes(shipperPos);
      const content = res.data?.content || res.data || [];
      setRoutes(groupIntoRoutes(content));
    } catch (err) {
      showToast("Không thể tải danh sách tuyến", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAccept = async (route) => {
    try {
      setAccepting(route.routeId);
      await orderService.shipperAcceptRoute(route.routeId);
      showToast(`Đã nhận tuyến ${route.routeId}!`, "success");
      setRoutes((prev) => prev.filter((r) => r.routeId !== route.routeId));
      setTimeout(() => navigate("/shipper/delivery"), 1500);
    } catch (e) {
      const msg = e?.response?.data?.message || "";
      if (msg.includes("đã có shipper")) {
        showToast("Tuyến này vừa có shipper khác nhận rồi!", "error");
        fetchRoutes();
      } else {
        showToast(msg || "Nhận tuyến thất bại", "error");
      }
    } finally {
      setAccepting(null);
    }
  };

  return (
    <>
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
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

      {previewRoute && (
        <PreviewModal
          route={previewRoute}
          hubCoords={
            previewRoute.hubLat && previewRoute.hubLng
              ? {
                  lat: previewRoute.hubLat,
                  lng: previewRoute.hubLng,
                  address: previewRoute.hubAddress,
                  ward: previewRoute.hubWard,
                  district: previewRoute.hubDistrict,
                }
              : null
          }
          onClose={() => setPreview(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Tuyến có sẵn
          </h1>
        </div>
        <button
          onClick={fetchRoutes}
          disabled={refreshing}
          className="text-xs px-2.5 sm:px-3 py-1.5 flex gap-1 items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
        >
          <RefreshCw
            size={13}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          Làm mới
        </button>
      </div>

      {/* Race condition banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 mb-6 text-sm text-amber-800">
        <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold"></span>
          Tuyến được gán cho shipper bấm nhận đầu tiên. Hãy nhanh tay!
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 size={28} className="animate-spin text-red-400" />
          <span className="text-sm">Đang tìm tuyến gần bạn…</span>
        </div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
          <Navigation size={36} strokeWidth={1.5} />
          <span className="text-sm text-slate-400">Chưa có tuyến mới nào</span>
          <button
            onClick={fetchRoutes}
            className="text-xs text-red-600 font-semibold underline"
          >
            Thử làm mới
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          {routes.map((route) => (
            <div className="w-full max-w-5xl">
              <RouteCard
                key={route.routeId}
                route={route}
                onAccept={handleAccept}
                accepting={accepting}
                onPreview={setPreview}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
