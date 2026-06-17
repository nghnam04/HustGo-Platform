import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Layers,
  Navigation,
  ShieldCheck,
  Boxes,
  Truck,
  PackagePlus,
  Package,
  ArrowRight,
  Activity,
  CheckCircle,
  Phone,
  Mail,
  ChevronRight,
  ChevronLeft,
  Map,
  X,
  ReceiptText,
  Star,
} from "lucide-react";
import SectionHeading from "../../components/common/SectionHeading";
import orderService from "../../services/orderService";
import trackingService from "../../services/trackingService";
import bgImage1 from "../../assets/bgImage1.jpg";
import bgImage2 from "../../assets/bgImage2.jpg";
import bgImage3 from "../../assets/bgImage3.jpg";
import bgImage4 from "../../assets/bgImage4.jpg";
import bgImage5 from "../../assets/bgImage5.jpg";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import LoadingSpinner from "../../components/utils/LoadingSpinner";
import formatAddress from "../../components/utils/formatAddress";
import renderStatusBadgev4 from "../../components/utils/renderStatusBadgev4";
import formatDateAgo from "../../components/utils/formatDateAgo";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: undefined,
  iconUrl: undefined,
  shadowUrl: undefined,
});

const bgImages = [bgImage1, bgImage2, bgImage3, bgImage4, bgImage5];

const decodePolyline = (encoded, precision = 5) => {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates = [];
  const factor = 10 ** precision;
  while (index < encoded.length) {
    let result = 0,
      shift = 0,
      byte;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;
    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
};

const shipperIconH = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="17" fill="#2563eb" stroke="white" stroke-width="2"/>
    <text x="18" y="23" text-anchor="middle" font-size="20">🛵</text>
  </svg>`,
  className: "",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const destIconH = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="15" fill="#dc2626" stroke="white" stroke-width="2"/>
    <text x="16" y="21" text-anchor="middle" font-size="16" fill="white">📍</text>
  </svg>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function HomeMapModal({ order, onClose }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const shipperMarkerRef = useRef(null);
  const pollingRef = useRef(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [shipperPos, setShipperPos] = useState(null);
  const [gpsOff, setGpsOff] = useState(false);

  const dest = {
    lat: order.receiverLat,
    lng: order.receiverLng,
    label: formatAddress(
      order.receiverAddress,
      order.receiverWard,
      order.receiverDistrict,
    ),
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const container = mapRef.current;
    const map = L.map(container, {
      zoomControl: false,
      minZoom: 8,
      maxZoom: 16,
      maxBounds: [
        [8.5, 102],
        [23.5, 110],
      ],
      maxBoundsViscosity: 1.0,
    });
    mapInstance.current = map;
    const tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: "&copy; OpenStreetMap contributors" },
    );
    tileLayer.addTo(map);
    tileLayer.on("load", () => map.invalidateSize());
    map.on("moveend", () => map.invalidateSize());
    map.on("zoomend", () => map.invalidateSize());
    setTimeout(() => map.invalidateSize(), 100);
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 600);
    setTimeout(() => map.invalidateSize(), 1000);
    return () => {
      tileLayer.off("load");
      map.off("moveend");
      map.off("zoomend");
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const fetchRoute = async (startLat, startLng) => {
    if (!startLat || !startLng || !dest.lat || !dest.lng) return;
    try {
      setLoadingRoute(true);
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/bicycle/${startLng},${startLat};${dest.lng},${dest.lat}?overview=full&geometries=polyline`,
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const geometry = decodePolyline(data.routes[0].geometry, 5);
        if (geometry && geometry.length > 0) {
          setRouteGeometry(geometry);
        }
      } else {
        console.log(
          "No routes in OSRM response, code:",
          data.code,
          "message:",
          data.message,
        );
      }
    } catch (e) {
      console.log("fetchRoute error:", e);
    } finally {
      setLoadingRoute(false);
    }
  };

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await trackingService.getShipperLocationByOrder(order.id);
        const data = res.data;
        if (!data || data.lat == null || data.lng == null) {
          setShipperPos(null);
          setGpsOff(true);
          return;
        }
        const pos = { lat: data.lat, lng: data.lng };
        setShipperPos(pos);
        setGpsOff(false);
        await fetchRoute(pos.lat, pos.lng);
      } catch {
        setShipperPos(null);
        setGpsOff(true);
      }
    };
    poll();
    pollingRef.current = setInterval(poll, 10000);
    return () => clearInterval(pollingRef.current);
  }, [order.id]);

  // Vẽ lại bản đồ mỗi khi state thay đổi
  useEffect(() => {
    if (!mapInstance.current) return;

    const map = mapInstance.current;

    // Xóa tất cả layers trước khi vẽ lại
    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    // GPS bật + có tuyến: vẽ tuyến đường tối ưu
    if (!gpsOff && shipperPos && routeGeometry && routeGeometry.length > 0) {
      const fullRoute = [[shipperPos.lat, shipperPos.lng], ...routeGeometry];
      L.polyline(fullRoute, {
        color: "#16a34a",
        weight: 4,
        opacity: 0.85,
      }).addTo(map);
    }

    L.marker([dest.lat, dest.lng], { icon: destIconH })
      .addTo(map)
      .bindPopup(
        `<b>📍 Điểm nhận hàng</b><br/>${dest.label}<br/><span style="font-size:11px">☎ ${order.receiverPhone || ""}</span>`,
      );

    if (!gpsOff && shipperPos) {
      shipperMarkerRef.current = L.marker([shipperPos.lat, shipperPos.lng], {
        icon: shipperIconH,
      })
        .addTo(map)
        .bindPopup(`<b>🛵 Shipper</b>`);
    }

    const allPoints = [
      [dest.lat, dest.lng],
      ...(!gpsOff && shipperPos ? [[shipperPos.lat, shipperPos.lng]] : []),
    ];
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [shipperPos, routeGeometry, gpsOff, dest]);

  return (
    <div className="fixed inset-0 bg-black/40 z-[9999] flex justify-center items-start sm:items-center pt-16 sm:pt-20 px-2 sm:px-4 overflow-y-auto h-screen">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-md h-[calc(100vh-4rem)] sm:h-auto overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Navigation size={16} className="text-blue-600" />
            <span className="text-sm font-bold text-slate-800">
              Theo dõi hành trình
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-4 py-2 bg-slate-50 flex items-center gap-3 text-xs text-slate-600">
          <span className="font-mono font-bold text-red-700">{order.id}</span>
          <span>·</span>
          <span className="font-medium">{order.receiverName}</span>
          <span>·</span>
          <Phone size={11} />
          <span>{order.receiverPhone}</span>
          {gpsOff && (
            <>
              <span>·</span>
              <span className="text-orange-600 font-semibold flex items-center gap-1">
                ⚠ Tắt định vị
              </span>
            </>
          )}
        </div>
        <div
          className="relative h-[calc(100vh-12rem)] sm:h-[360px] min-h-[280px]"
          style={{}}
        >
          <div ref={mapRef} className="w-full h-full" />
          {!shipperPos && !loadingRoute && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-[500]">
              <div className="text-center">
                <div className="text-sm text-slate-500 font-medium mb-1">
                  Shipper chưa bật định vị
                </div>
                <div className="text-xs text-slate-400">
                  Vị trí sẽ hiển thị khi shipper mở GPS
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            Shipper
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
            Điểm nhận
          </span>
          <span className="flex items-center gap-1">
            <span className="w-6 h-0.5 bg-green-600 inline-block" />
            Tuyến đường
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [bgIndex, setBgIndex] = useState(0);
  const [trackingId, setTrackingId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [mapModalOrder, setMapModalOrder] = useState(null);
  const [showHomeMap, setShowHomeMap] = useState(false);

  const [trackingExpanded, setTrackingExpanded] = useState(false);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % bgImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setIsSearching(true);
    setTrackingExpanded(false);
    setSearchResult(null);
    setShowHomeMap(false);
    setMapModalOrder(null);
    setTrackingHistory([]);
    setTrackingError("");
    try {
      const [historyRes, orderRes] = await Promise.all([
        orderService.getOrderHistory(trackingId.trim()),
        orderService.getOrderById(trackingId.trim()).catch(() => null),
      ]);
      const history = Array.isArray(historyRes.data)
        ? historyRes.data
        : historyRes.data?.content || [];
      const fullOrder = orderRes?.data || orderRes || null;
      if (history.length > 0) {
        const last = history[history.length - 1];
        const rawStatus = last.newStatus || last.status || "—";
        const status =
          typeof rawStatus === "object" && rawStatus !== null
            ? rawStatus.name || rawStatus.value || String(rawStatus)
            : rawStatus;
        setSearchResult({
          id: trackingId.toUpperCase(),
          status,
          location: last.hubName || last.location || "—",
          destination: last.nextHub || last.destination || "—",
          _order: fullOrder,
        });
        setTrackingHistory([...history].reverse());
      } else {
        setSearchResult({
          id: trackingId.toUpperCase(),
          status: "Không tìm thấy",
          location: "—",
          destination: "—",
          _order: null,
        });
      }
    } catch {
      setSearchResult({
        id: trackingId.toUpperCase(),
        status: "Không tìm thấy",
        location: "—",
        destination: "—",
        _order: null,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const features = [
    {
      icon: Package,
      title: "Tạo đơn ký gửi",
      desc: "Khách hàng tạo đơn với thông tin người gửi, người nhận và mô tả kiện hàng đầy đủ.",
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      icon: MapPin,
      title: "Tiếp nhận tại Bưu cục",
      desc: "Quản trị bưu cục xác nhận đơn hàng khách gửi đến, kiểm tra và nhập kho chờ phân loại.",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Layers,
      title: "Phân tuyến tối ưu",
      desc: "Hệ thống tự động gom cụm đơn hàng theo khu vực địa lý và sắp xếp tuyến giao hàng tối ưu.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Truck,
      title: "Giao hàng chặng cuối",
      desc: "Shipper nhận tuyến, cập nhật trạng thái từng đơn và xác nhận giao thành công tại đích.",
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const whyItems = [
    {
      icon: PackagePlus,
      title: "Tạo đơn rõ ràng",
      desc: "Khách hàng nhập thông tin người gửi, người nhận, hàng hóa, COD và xem phí trước khi xác nhận đơn.",
    },
    {
      icon: Activity,
      title: "Theo dõi theo trạng thái",
      desc: "Mỗi lần đơn được tạo, thu gom, nhập bưu cục, trung chuyển, giao hoặc hoàn hàng đều được ghi lại trong lịch sử vận chuyển.",
    },
    {
      icon: Navigation,
      title: "Điều phối tuyến giao",
      desc: "Quản trị bưu cục phân tuyến cho Shipper, theo dõi tuyến đang giao và xử lý luồng hàng giữa các hub trong cùng hệ thống.",
    },
    {
      icon: ShieldCheck,
      title: "Phân quyền chặt chẽ",
      desc: "Khách hàng, Shipper, Quản trị bưu cục và Quản trị hệ thống có màn hình riêng, đúng quyền thao tác với đơn hàng, bưu cục, người dùng và phản hồi.",
    },
  ];

  const roles = [
    {
      icon: PackagePlus,
      title: "Khách hàng",
      desc: "Tạo đơn giao hàng, thanh toán, xem lịch sử đơn, theo dõi hành trình và gửi phản hồi sau khi sử dụng dịch vụ.",
      path: "/customer/dashboard",
      tag: "Customer",
    },
    {
      icon: Boxes,
      title: "Quản trị bưu cục",
      desc: "Tiếp nhận hàng từ khách, quản lý tồn kho tại bưu cục, tạo chuyến trung chuyển và phân tuyến giao hàng cho Shipper.",
      path: "/hub/dashboard",
      tag: "Hub Admin",
    },
    {
      icon: Truck,
      title: "Shipper",
      desc: "Xem tuyến khả dụng, nhận tuyến giao, bật GPS để cập nhật vị trí và xác nhận trạng thái giao hàng theo từng đơn.",
      path: "/shipper/dashboard",
      tag: "Shipper",
    },
  ];

  const faqs = [
    {
      q: "Cước phí vận chuyển của HustGo được tính như thế nào?",
      a: "HustGo tính phí dựa trên trọng lượng tính cước, khu vực gửi - nhận, loại dịch vụ, COD, bảo hiểm và VAT. Trang \"Cách tính cước phí\" mô tả chi tiết từng khoản để bạn kiểm tra trước khi tạo đơn.",
    },
    {
      q: "Tôi cần làm gì để tạo một đơn giao hàng?",
      a: "Bạn đăng nhập bằng tài khoản khách hàng, vào mục \"Tạo đơn hàng\", nhập thông tin người gửi, người nhận, địa chỉ, số điện thoại, thông tin kiện hàng và số tiền COD nếu có. Hệ thống sẽ tính phí dự kiến trước khi bạn xác nhận, sau đó đơn được chuyển sang luồng xử lý của bưu cục.",
    },
    {
      q: "Tôi theo dõi đơn hàng ở đâu?",
      a: "Bạn có thể nhập mã đơn vào ô tra cứu trên trang chủ hoặc xem trong lịch sử đơn hàng của tài khoản. Trang theo dõi hiển thị trạng thái mới nhất, lịch sử cập nhật và bản đồ khi đơn đang được Shipper giao với GPS hợp lệ.",
    },
    {
      q: "Quản trị bưu cục xử lý đơn hàng như thế nào?",
      a: "Quản trị bưu cục tiếp nhận hàng từ khách, xác nhận đơn đã vào bưu cục, quản lý tồn kho, tạo chuyến trung chuyển nếu đơn cần chuyển sang bưu cục khác và phân tuyến giao hàng cho Shipper khi đơn sẵn sàng giao.",
    },
    {
      q: "Shipper có bắt buộc bật GPS không?",
      a: "Có. Với tài khoản Shipper, định vị giúp hệ thống cập nhật hành trình giao hàng theo thời gian thực. Nếu không cấp quyền, Shipper không thể sử dụng đầy đủ các chức năng nhận tuyến và giao hàng.",
    },
    {
      q: "Khi nào khách hàng xem được vị trí Shipper?",
      a: "Vị trí chỉ hiển thị khi đơn ở trạng thái đang giao, Shipper đã bật GPS và hệ thống nhận được tọa độ hợp lệ. Nếu Shipper tắt định vị hoặc chưa bắt đầu giao, trang theo dõi sẽ chỉ hiển thị trạng thái đơn.",
    },
    {
      q: "Nếu giao thất bại thì đơn được xử lý ra sao?",
      a: "Shipper cập nhật trạng thái giao thất bại, sau đó đơn có thể chuyển sang luồng hoàn hàng tùy theo quy trình xử lý. Khách hàng vẫn xem được lịch sử cập nhật để biết đơn đang giao lại, chờ xử lý hay đang hoàn về.",
    },
  ];

  const userReviews = [
    {
      id: 1,
      name: "Nguyễn Minh Anh",
      role: "Khách hàng",
      avatar: null,
      rating: 5,
      comment:
        "Dịch vụ giao hàng cực nhanh! Đặt buổi sáng, chiều đã nhận được hàng. Shop rất uy tín, gói hàng cẩn thận.",
      date: formatDateAgo(3),
    },
    {
      id: 2,
      name: "Đỗ Hải Minh",
      role: "Shipper",
      avatar: null,
      rating: 5,
      comment:
        "Làm Shipper cho HustGo rất thoải mái. App dễ dùng, đơn hàng nhiều, thu nhập ổn định. Team hỗ trợ nhiệt tình.",
      date: formatDateAgo(7),
    },
    {
      id: 3,
      name: "Lê Thị Hương",
      role: "Khách hàng",
      avatar: null,
      rating: 4,
      comment:
        "Giá cả hợp lý, theo dõi đơn hàng dễ dàng. Mong sẽ có thêm nhiều ưu đãi cho khách hàng thân thiết.",
      date: formatDateAgo(14),
    },
    {
      id: 4,
      name: "Phạm Quốc Minh",
      role: "Quản trị bưu cục",
      avatar: null,
      rating: 5,
      comment:
        "Quản lý bưu cục rất tiện lợi. Tự động gom cụm đơn hàng, phân tuyến nhanh. Hệ thống báo cáo chi tiết, dễ theo dõi.",
      date: formatDateAgo(30),
    },
    {
      id: 5,
      name: "Trần Thị Mai",
      role: "Khách hàng",
      avatar: null,
      rating: 5,
      comment:
        "Đóng gói cẩn thận, giao hàng đúng hẹn. Shipper thân thiện, hỗ trợ nhiệt tình. Sẽ ủng hộ dài lâu!",
      date: formatDateAgo(60),
    },
    {
      id: 6,
      name: "Hoàng Đình Phong",
      role: "Khách hàng",
      avatar: null,
      rating: 5,
      comment:
        "Lần đầu sử dụng mà ấn tượng! Giao hàng nhanh hơn dự kiến, Shipper liên lạc cẩn thận trước khi giao. Sẽ giới thiệu cho bạn bè.",
      date: formatDateAgo(365),
    },
    {
      id: 7,
      name: "Nguyễn Đức Long",
      role: "Khách hàng",
      avatar: null,
      rating: 5,
      comment:
        "Dịch vụ chuyên nghiệp, nhân viên hỗ trợ nhanh chóng. Đặc biệt thích tính năng theo dõi đơn hàng real-time.",
      date: formatDateAgo(90),
    },
    {
      id: 8,
      name: "Phạm Thị Lan",
      role: "Shipper",
      avatar: null,
      rating: 4,
      comment:
        "Làm việc với HUSTGo rất thoải mái, đơn hàng ổn định. Mong công ty thêm nhiều chương trình thưởng cho Shipper.",
      date: formatDateAgo(180),
    },
    {
      id: 9,
      name: "Đỗ Minh Tuấn",
      role: "Khách hàng",
      avatar: null,
      rating: 5,
      comment:
        "Tuyệt vời! Giao hàng siêu nhanh, đóng gói cẩn thận. Đã giới thiệu cho nhiều đồng nghiệp trong công ty.",
      date: formatDateAgo(45),
    },
    {
      id: 10,
      name: "Trần Thị Hồng Nhung",
      role: "Quản trị bưu cục",
      avatar: null,
      rating: 5,
      comment:
        "Quản lý bưu cục rất tiện lợi. Tự động phân tuyến, giảm tải công việc rất nhiều. Team hỗ trợ nhanh.",
      date: formatDateAgo(200),
    },
    {
      id: 11,
      name: "Lý Hải Bằng",
      role: "Khách hàng",
      avatar: null,
      rating: 5,
      comment:
        "Dịch vụ chuyên nghiệp từ tổng đài đến shipper. Luôn theo dõi đơn hàng cập nhật liên tục. Rất hài lòng!",
      date: formatDateAgo(120),
    },
    {
      id: 12,
      name: "Nguyễn Anh Thắng",
      role: "Shipper",
      avatar: null,
      rating: 4,
      comment:
        "App dễ dùng, nhận đơn dễ. Thu nhập khá ổn định. Mong có thêm nhiều đơn giao nhanh để tăng thu nhập.",
      date: formatDateAgo(250),
    },
  ];

  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewsPerPage, setReviewsPerPage] = useState(6);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setReviewsPerPage(1); // mobile: 1 card
      } else if (width < 1024) {
        setReviewsPerPage(4); // iPad: 4 cards
      } else {
        setReviewsPerPage(6); // desktop: 6 cards
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalReviewPages = Math.ceil(userReviews.length / reviewsPerPage);

  const nextReviews = () => {
    setReviewIndex((prev) => (prev + 1) % totalReviewPages);
  };

  const prevReviews = () => {
    setReviewIndex((prev) => (prev - 1 + totalReviewPages) % totalReviewPages);
  };

  const currentReviews = userReviews.slice(
    reviewIndex * reviewsPerPage,
    reviewIndex * reviewsPerPage + reviewsPerPage,
  );

  const [openReviews, setOpenReviews] = useState(0);

  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-24 py-2 font-sans">
      {/* HERO */}
      <section className="h-[88vh] min-h-[600px] relative flex items-center justify-center text-center rounded-2xl overflow-hidden shadow-2xl shadow-red-900/30">
        <div className="absolute inset-0 z-0">
          {bgImages.map((img, i) => {
            const isCurrent = i === bgIndex;
            const isNext = i === (bgIndex + 1) % bgImages.length;
            if (!isCurrent && !isNext) return null;
            return (
              <motion.div
                key={i}
                initial={{ x: isCurrent ? 0 : "100%" }}
                animate={{ x: isCurrent ? "-100%" : 0 }}
                transition={{ duration: 1.25, ease: "easeInOut" }}
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-red-900/70" />
              </motion.div>
            );
          })}
        </div>
        <div className="absolute bottom-6 w-full flex justify-center gap-3 z-20">
          {bgImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setBgIndex(i)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${bgIndex === i ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"}`}
            />
          ))}
        </div>
        <motion.div
          className="relative z-10 px-6 max-w-5xl"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-8xl font-black text-[#a81f32] mb-5 leading-tight tracking-tight drop-shadow-lg">
            HustGo
          </h1>
          <p className="text-lg md:text-xl text-red-100 mb-10 max-w-2xl mx-auto drop-shadow">
            Nền tảng quản lý mạng lưới giao hàng chặng cuối thời gian thực phạm
            vi Thành phố Hà Nội
          </p>
          <form onSubmit={handleTrack} className="max-w-xl mx-auto relative">
            <div className="relative flex items-center">
              <Search className="absolute left-5 text-red-600 w-5 h-5 stroke-[2.5] z-10" />
              <input
                type="text"
                placeholder="Nhập mã đơn hàng..."
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="input-base !pl-14 !pr-32 !py-4 shadow-2xl w-full text-base bg-white/95 backdrop-blur-sm !rounded-xl"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-0 h-11 bg-[#801B29] hover:bg-[#63141F] text-white text-xs font-bold rounded-lg shadow-sm hover:shadow-lg hover:shadow-[#801B29]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 px-4"
              >
                {isSearching ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Navigation size={14} />
                )}
                Tra cứu
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* LIVE TRACKING */}
      <AnimatePresence>
        {searchResult && (
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className={`card-base border-2 border-red-200 max-w-4xl mx-auto text-left !p-6 shadow-lg shadow-red-100/30 transition-all
              ${trackingExpanded ? "bg-gradient-to-br from-white via-white to-slate-50" : "bg-red-50/50"}`}
          >
            {/* ORDER CARD */}
            <div className="relative border-b border-red-100 pb-4 mb-4">
              <button
                onClick={() => setSearchResult(null)}
                className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors z-10"
              >
                <X size={18} />
              </button>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pr-12 sm:pr-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-0 sm:gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Mã vận đơn:
                  </span>
                  <span className="font-bold font-black text-red-600 text-sm tracking-widest">
                    {searchResult.id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {String(searchResult.status)
                    .toUpperCase()
                    .includes("DELIVERING") && (
                      <button
                        onClick={async () => {
                          if (showHomeMap) {
                            setShowHomeMap(false);
                          } else {
                            if (!searchResult._order) {
                              try {
                                const res = await orderService.getOrderById(
                                  searchResult.id,
                                );
                                setMapModalOrder(res.data || res);
                              } catch {
                                setMapModalOrder(null);
                                return;
                              }
                            } else {
                              setMapModalOrder(searchResult._order);
                            }
                            setShowHomeMap(true);
                          }
                        }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors
                        ${showHomeMap ? "bg-blue-600 text-white border-blue-600" : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"}`}
                      >
                        <Map size={12} />
                        Bản đồ
                      </button>
                    )}
                  <button
                    onClick={() => setTrackingExpanded(!trackingExpanded)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                      ${trackingExpanded ? "bg-blue-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                  >
                    <Truck size={12} />
                    {trackingExpanded ? "Ẩn theo dõi" : "Theo dõi"}
                  </button>
                </div>
              </div>
            </div>

            {/* STATUS */}
            <div className="mb-4">
              {renderStatusBadgev4(searchResult.status)}
            </div>

            {/* ORDER INFO */}
            {searchResult._order && (
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {searchResult._order.imageUrl && (
                    <img
                      src={searchResult._order.imageUrl}
                      alt="product"
                      className="w-20 h-20 object-cover rounded-xl border border-slate-100 shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sender */}
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={14}
                          className="text-blue-600 mt-0.5 shrink-0"
                        />
                        <div className="text-xs">
                          <p className="text-slate-500">Người gửi</p>
                          <p className="font-semibold truncate">
                            {searchResult._order.senderName} —{" "}
                            {searchResult._order.senderPhone}
                          </p>
                          <p className="text-slate-600 line-clamp-2">
                            {searchResult._order.senderAddress},{" "}
                            {searchResult._order.senderWard},{" "}
                            {searchResult._order.senderDistrict}
                          </p>
                        </div>
                      </div>
                      {/* Receiver */}
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={14}
                          className="text-red-600 mt-0.5 shrink-0"
                        />
                        <div className="text-xs">
                          <p className="text-slate-500">Người nhận</p>
                          <p className="font-semibold truncate">
                            {searchResult._order.receiverName} —{" "}
                            {searchResult._order.receiverPhone}
                          </p>
                          <p className="text-slate-600 line-clamp-2">
                            {searchResult._order.receiverAddress},{" "}
                            {searchResult._order.receiverWard},{" "}
                            {searchResult._order.receiverDistrict}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-xs">
                      <div>
                        <span className="text-slate-500">Thu hộ (COD): </span>
                        <span className="font-bold text-[red-600]">
                          {Number(
                            searchResult._order.codAmount || 0,
                          ).toLocaleString("vi-VN")}{" "}
                          đ
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Tổng cước: </span>
                        <span className="font-semibold">
                          {Number(
                            searchResult._order.totalPrice || 0,
                          ).toLocaleString("vi-VN")}{" "}
                          đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TRACKING TIMELINE */}
            <AnimatePresence>
              {trackingExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-red-100 pt-4 mt-2">
                    {trackingLoading ? (
                      <div className="py-12 text-center text-slate-500 text-sm">
                        Đang tải lịch sử vận chuyển...
                      </div>
                    ) : trackingError ? (
                      <div className="py-8 text-red-500 text-center text-sm">
                        {trackingError}
                      </div>
                    ) : trackingHistory.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-sm">
                        Chưa có cập nhật nào
                      </div>
                    ) : (
                      <div className="relative pl-2">
                        <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[red-600] to-slate-200 rounded-full" />
                        <div className="space-y-5">
                          {trackingHistory.map((step, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="relative flex gap-4"
                            >
                              <div
                                className={`z-10 flex items-center justify-center w-10 h-10 rounded-full border-[4px] bg-white shadow-sm shrink-0
                                ${step.newStatus === "COMPLETED" ? "border-emerald-500" : step.newStatus === "CANCELLED" ? "border-red-500" : "border-[red-600]"}`}
                              >
                                {step.newStatus === "COMPLETED" ? (
                                  <CheckCircle
                                    size={16}
                                    className="text-emerald-500"
                                  />
                                ) : step.newStatus === "CANCELLED" ? (
                                  <X size={16} className="text-red-500" />
                                ) : (
                                  <Truck size={16} className="text-[red-600]" />
                                )}
                              </div>
                              <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <p className="font-semibold text-slate-800 text-xs">
                                    {step.note || "Cập nhật trạng thái"}
                                  </p>
                                  {renderStatusBadgev4(step.newStatus)}
                                </div>
                                <div className="mt-2 pt-2 border-t border-dashed border-slate-100 flex justify-between text-xs text-slate-400">
                                  <span>
                                    {step.changedBy || "Hệ thống cập nhật"}
                                  </span>
                                  <span>
                                    {new Date(step.createdAt).toLocaleString(
                                      "vi-VN",
                                    )}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOME MAP MODAL */}
      {showHomeMap && mapModalOrder && (
        <HomeMapModal
          order={mapModalOrder}
          onClose={() => {
            setShowHomeMap(false);
            setTimeout(() => setMapModalOrder(null), 300);
          }}
        />
      )}

      {/* STATS ROW */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              value: "12,500+",
              label: "Tổng đơn hàng",
              icon: Package,
              color: "text-red-600",
              bg: "bg-red-50",
              border: "border-red-100",
            },
            {
              value: "150+",
              label: "Đơn đang vận chuyển",
              icon: Truck,
              color: "text-blue-600",
              bg: "bg-blue-50",
              border: "border-blue-100",
            },
            {
              value: "500+",
              label: "Đơn hôm nay",
              icon: CheckCircle,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
            },
            {
              value: "30+",
              label: "Bưu cục toàn hệ thống",
              icon: Layers,
              color: "text-amber-600",
              bg: "bg-amber-50",
              border: "border-amber-100",
            },
          ].map((item, idx) => {
            const Ic = item.icon;
            return (
              <motion.div
                key={idx}
                className={`card-base border-2 ${item.border} text-center p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mx-auto mb-4`}
                >
                  <Ic size={26} className={item.color} />
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight mb-1">
                  {item.value}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {item.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section>
        <SectionHeading>Quy trình vận hành</SectionHeading>
        <div className="-mt-4 mb-12 max-w-2xl border-l-2 border-[#801B29]/20 pl-4">
          <p className="text-sm leading-6 text-slate-500">
            Từ lúc tạo đơn đến khi giao thành công, mỗi bước đều được hệ thống
            giám sát và tối ưu hóa.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {features.map((f, idx) => {
            const Ic = f.icon;
            return (
              <motion.div
                key={idx}
                className="card-base border-2 border-red-50 relative p-7 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
              >
                {idx < features.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-red-100 items-center justify-center">
                    <ChevronRight size={14} className="text-red-400" />
                  </div>
                )}
                <div
                  className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-5`}
                >
                  <Ic size={26} className={f.color} />
                </div>
                <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">
                  Bước {idx + 1}
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* WHY HUSTGO */}
      <section>
        <SectionHeading>Tại sao chọn HUSTGo</SectionHeading>
        <div className="-mt-4 mb-12 max-w-2xl border-l-2 border-[#801B29]/20 pl-4">
          <p className="text-sm leading-6 text-slate-500">
            HUSTGo tập trung vào quy trình vận hành thực tế: tạo đơn, tiếp nhận
            tại hub, trung chuyển, nhập kho đích, phân tuyến, giao hàng và theo dõi trạng thái minh bạch.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {whyItems.map((f, idx) => {
            const Ic = f.icon;
            return (
              <motion.div
                key={idx}
                className="card-base border-2 border-red-50 p-6 text-center hover:border-red-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <Ic size={24} className="text-red-600" />
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ROLES */}
      <section>
        <SectionHeading>Các phân hệ chính</SectionHeading>
        <div className="-mt-4 mb-12 max-w-2xl border-l-2 border-[#801B29]/20 pl-4">
          <p className="text-sm leading-6 text-slate-500">
            Hệ thống được chia theo vai trò sử dụng dịch vụ, mỗi phân
            hệ có quyền thao tác và màn hình riêng.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {roles.map((r, idx) => {
            const Ic = r.icon;
            return (
              <motion.div
                key={idx}
                className="card-base border-2 border-red-50 hover:border-red-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between min-h-[200px] text-left"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <Ic size={18} className="text-red-600" />
                    </div>
                    <h3 className="text-base font-black text-slate-900">
                      {r.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {r.desc}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-red-50 mt-4">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-50 text-red-600 font-bold uppercase tracking-wide">
                    {r.tag}
                  </span>
                  <Link
                    to={r.path}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                  >
                    Truy cập <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FEEDBACKS */}
      <section>
        <SectionHeading>Đánh giá từ người dùng</SectionHeading>
        <div className="-mt-4 mb-12 max-w-2xl border-l-2 border-[#801B29]/20 pl-4">
          <p className="text-sm leading-6 text-slate-500">
            Phản hồi từ Khách hàng, Shipper và người vận hành đã sử dụng HUSTGo.
          </p>
        </div>
        <div className="relative">
          {/* Nút trái */}
          <button
            onClick={prevReviews}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-[#801B29] hover:border-[#801B29]/30 transition-all shadow-md"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-3 gap-6 px-8">
            {currentReviews.map((review, idx) => (
              <motion.div
                key={review.id}
                className="card-base border-2 border-red-50 p-6 hover:border-red-100 hover:shadow-lg transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < review.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-200"
                      }
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">
                  "{review.comment}"
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-red-50">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                    {review.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {review.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {review.role} • {review.date}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Nút phải */}
          <button
            onClick={nextReviews}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-[#801B29] hover:border-[#801B29]/30 transition-all shadow-md"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* PRICING */}
      <section>
        <SectionHeading>Cách tính cước phí</SectionHeading>
        <div className="-mt-4 mb-12 max-w-2xl border-l-2 border-[#801B29]/20 pl-4">
          <p className="text-sm leading-6 text-slate-500">
            Cước phí trên HUSTGo được tính từ dữ liệu bạn nhập khi tạo đơn: kích
            thước, trọng lượng, quận gửi - nhận, loại dịch vụ, COD, giá trị hàng
            hóa và phương thức thanh toán.
          </p>
        </div>

        <div className="card-base border-2 border-red-50 p-6 md:p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[
              {
                title: "Trọng lượng tính cước",
                desc: "Hệ thống so sánh trọng lượng thực với trọng lượng quy đổi. Trọng lượng quy đổi = dài x rộng x cao / 5000. Khoản lớn hơn sẽ được dùng để tính phí.",
              },
              {
                title: "Cước nền theo khu vực",
                desc: "Nội thành - nội thành: 20.000đ. Ngoại thành - ngoại thành: 35.000đ. Một đầu nội thành, một đầu ngoại thành: 30.000đ. Nếu thiếu quận gửi hoặc nhận, mặc định 35.000đ.",
              },
              {
                title: "Phụ trội cân nặng",
                desc: "Đơn trên 0.5kg sẽ cộng thêm 2.500đ cho mỗi 0.5kg tiếp theo, làm tròn lên theo từng bậc 0.5kg.",
              },
              {
                title: "Phụ phí dịch vụ",
                desc: "Gói Economy không cộng phụ phí. Gói Fast cộng 5.000đ. Gói Express cộng 15.000đ.",
              },
              {
                title: "Phụ phí khu vực",
                desc: "Nếu điểm gửi thuộc khu vực ngoài nội thành, cộng 5.000đ. Nếu điểm nhận thuộc khu vực ngoài nội thành, cộng thêm 5.000đ.",
              },
              {
                title: "COD và bảo hiểm",
                desc: "Nếu có COD, phí COD bằng 0.8% số tiền thu hộ và tối thiểu 15.000đ. Nếu giá trị hàng trên 1.000.000đ, phí bảo hiểm bằng 0.5% giá trị hàng.",
              },
            ].map((item, idx) => (
              <div
                key={item.title}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-[#801B29]">
                    <ReceiptText size={16} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-400">
                    Khoản {idx + 1}
                  </span>
                </div>
                <h3 className="mb-2 text-sm font-black text-slate-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-6 text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-[#801B29]/15 bg-red-50/60 p-5">
            <h3 className="mb-2 text-sm font-black text-slate-900">
              Tổng tiền hiển thị cho đơn hàng
            </h3>
            <p className="text-sm leading-6 text-slate-600">
              Tổng cước dịch vụ = cước nền + phụ trội cân nặng + phụ phí dịch vụ
              + phụ phí khu vực + phí COD + phí bảo hiểm, sau đó cộng VAT 8%.
              Nếu khách chọn thanh toán COD, số tiền Shipper cần thu người nhận khi giao hàng =
              tiền COD thu hộ + tổng cước dịch vụ. Nếu thanh toán online, số
              tiền thu khi giao chỉ còn phần COD thu hộ.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <SectionHeading>Câu hỏi thường gặp</SectionHeading>
        <div className="-mt-4 mb-12 max-w-2xl border-l-2 border-[#801B29]/20 pl-4">
          <p className="text-sm leading-6 text-slate-500">
            Một số câu hỏi thường gặp khi tạo đơn, theo dõi vận chuyển và vận
            hành giao hàng trên HUSTGo.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="card-base border-2 border-red-50 overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-red-50/30 transition-colors"
              >
                <span className="text-sm font-bold text-slate-900 pr-4">
                  {faq.q}
                </span>
                <ChevronRight
                  size={16}
                  className={`text-red-400 shrink-0 transition-transform duration-300 ${openFaq === idx ? "rotate-90" : ""}`}
                />
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 text-sm text-slate-500 leading-relaxed border-t border-red-50 pt-3">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ====== CTA ====== */}
      <section className="text-center space-y-4 pb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">
          Bắt đầu ngay hôm nay
        </h2>
        <p className="text-sm text-slate-500">
          Tạo đơn giao hàng đầu tiên và theo dõi toàn bộ hành trình của bạn ngay trên
          HUSTGo.
        </p>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <Link
            to="/customer/create-order"
            className="rounded-lg bg-[#801B29] px-8 py-3 text-base font-bold text-white shadow-sm transition-all hover:bg-[#63141F] hover:shadow-lg hover:shadow-[#801B29]/25 active:scale-[0.98]"
          >
            Tạo đơn ngay
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Phone size={14} className="text-red-500" /> 1900 1125
            </span>
            <span className="flex items-center gap-1">
              <Mail size={14} className="text-red-500" /> support@hustgo.vn
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
