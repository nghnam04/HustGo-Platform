import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Search,
  MapPin,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Activity,
  UserCog,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useNavigate as useRoutingNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import hubService from "../../services/hubService";
import authService from "../../services/authService";

export default function AdminHubManagement() {
  const navigate = useRoutingNavigate();

  const [loading, setLoading] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [hubAdmins, setHubAdmins] = useState({});

  const [hubs, setHubs] = useState([]);
  const [allHubs, setAllHubs] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [pageNo, setPageNo] = useState(0);
  const [pageSize] = useState(6);

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedHubId, setSelectedHubId] = useState(null);
  const [managerId, setManagerId] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapReady = useRef(false);
  const markersRef = useRef([]);

  const fetchHubAdmins = async () => {
    try {
      const response = await authService.getAllUsers({
        pageNo: 0,
        pageSize: 1000,
        role: "HUB_ADMIN",
      });
      const adminMap = {};
      response.content?.forEach((user) => {
        adminMap[user.id] = user.fullName || user.username;
      });
      setHubAdmins(adminMap);
    } catch (err) {
      console.error("Fetch hub admins failed", err);
    }
  };

  const fetchHubs = async () => {
    try {
      setRefreshing(true);

      const pageData = await hubService.getAllHubs({
        pageNo,
        pageSize,
        sortBy: "createdAt",
        sortDir: "desc",
        keyword: searchQuery,
      });

      setHubs(pageData.content || []);
      setTotalElements(pageData.totalElements || 0);
      setTotalPages(pageData.totalPages || 0);

      const mapData = await hubService.getAllHubs({
        pageNo: 0,
        pageSize: 1000,
        sortBy: "createdAt",
        sortDir: "desc",
        keyword: searchQuery,
      });

      setAllHubs(mapData.content || []);
    } catch (error) {
      console.error("Fetch hubs failed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHubs();
  }, [pageNo, searchQuery]);

  useEffect(() => {
    fetchHubAdmins();
  }, []);

  // Map Init
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current) {
        setTimeout(initMap, 100);
        return;
      }
      if (mapInstance.current) {
        return;
      }

      mapInstance.current = L.map(mapRef.current, {
        center: [21.0285, 105.8542],
        zoom: 10,
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 8,
        maxZoom: 16,
        maxBounds: [
          [8.5, 102],
          [23.5, 110],
        ],
        maxBoundsViscosity: 1.0,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapInstance.current);

      mapReady.current = true;
      setIsMapReady(true);
      console.log("[MAP] Map initialized, mapReady set to true");
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        mapReady.current = false;
      }
    };
  }, []);

  // Add Markers
  useEffect(() => {
    const hubsToShow = allHubs;

    if (!mapReady.current) {
      return;
    }
    if (!hubsToShow || hubsToShow.length === 0) {
      return;
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const bounds = [];

    const hubIcon = L.divIcon({
      html: `
    <div style="
      width: 28px;
      height: 28px;
      background: #801B29;
      border: 3px solid white;
      border-radius: 10px;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow: 0 6px 16px rgba(128,27,41,0.35);
      transform: rotate(45deg);
    ">
      <div style="transform: rotate(-45deg); color:white;">
        🏠
      </div>
    </div>
  `,
      className: "",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });

    hubsToShow.forEach((hub) => {
      const lat = Number(hub.lat);
      const lng = Number(hub.lng);
      const markerLat = Number.isNaN(lat) ? 21.0285 : lat;
      const markerLng = Number.isNaN(lng) ? 105.8542 : lng;

      const marker = L.marker([markerLat, markerLng], {
        riseOnHover: true,
        icon: hubIcon,
      }).bindPopup(
        `
          <div style="min-width: 200px;">
            <b>${hub.name}</b><br/>
            <small>${hub.code}</small><br/><br/>
            <small>Admin: ${hub.managerId || "Chưa gán"}</small><br/>
            <small>${hub.address || ""}, ${hub.ward || ""}, ${hub.district || ""}</small>
          </div>
        `,
        { closeButton: true },
      );

      marker.addTo(mapInstance.current);
      markersRef.current.push(marker);

      bounds.push([markerLat, markerLng]);
    });

    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, {
        padding: [50, 50],
      });
    }
  }, [allHubs, isMapReady]);

  const handleDeleteHub = async (hubId) => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn xoá Hub này?");

    if (!confirmed) return;

    try {
      await hubService.deleteHub(hubId);

      await fetchHubs();
    } catch (error) {
      console.error(error);

      alert(error?.response?.data?.message || "Không thể xoá Hub");
    }
  };

  // Gán Hub Admin
  const handleAssignManager = async () => {
    if (!selectedHubId || !managerId.trim()) {
      alert("Vui lòng nhập ID HUB_ADMIN");
      return;
    }

    try {
      setAssignLoading(true);

      await hubService.assignManager(selectedHubId, managerId);

      alert("Gán Hub Admin thành công!");

      setAssignModalOpen(false);
      setSelectedHubId(null);
      setManagerId("");

      await fetchHubs();
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message ||
          "Không thể gán do id không tồn tại hoặc HUB_ADMIN đã quản lý Hub khác",
      );
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight line-clamp-1">
            Quản lý bưu cục
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5 hidden sm:block">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHubs}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-[#801B29]/20 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-sm shrink-0 uppercase tracking-wider"
          >
            <RefreshCw
              size={14}
              className={refreshing ? "animate-spin text-[#801B29]" : ""}
            />
            <span className="hidden xs:inline">Làm mới</span>
            <span className="inline xs:hidden">Làm mới</span>
          </button>
          <button
            onClick={() => navigate("/admin/hubs/create")}
            className="flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-[#801B29] hover:bg-[#63141F] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-lg hover:shadow-[#801B29]/25 transition-all shrink-0 uppercase tracking-wider"
          >
            <Plus size={14} />
            <span className="inline xs:hidden">Tạo</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : (
        <>
          {/* Map */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={16} className="text-red-500" />
                Bản đồ vị trí các Hub
              </h3>
              <span className="text-sm text-slate-500">
                {totalElements} Hub đang hiển thị
              </span>
            </div>
            <div
              ref={mapRef}
              className="hub-map-container"
              style={{ height: "350px", width: "100%", minHeight: "350px" }}
            />
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 mb-6 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm theo tên Hub, mã Hub hoặc địa chỉ..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#801B29] focus:bg-white focus:ring-4 focus:ring-[#801B29]/10 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Activity size={14} className="text-red-500" />
              Tổng số Hub:
              <span className="font-bold text-slate-800">{totalElements}</span>
            </div>
          </div>

          {/* Hub Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 whitespace-nowrap">
                      Mã & Tên Hub
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Địa chỉ</th>
                    <th className="px-5 py-3 whitespace-nowrap">
                      Quản lý (Manager)
                    </th>
                    <th className="px-5 py-3 whitespace-nowrap">Trạng thái</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {hubs.map((hub) => (
                    <motion.tr
                      key={hub.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <p className="text-xs font-semibold text-[#801B29] uppercase mb-0.5">
                            {hub.code}
                          </p>
                          <h3 className="font-bold text-slate-800 whitespace-nowrap">
                            {hub.name}
                          </h3>
                        </div>
                      </td>
                      <td className="px-5 py-4 min-w-[200px]">
                        <div className="flex items-start gap-1.5 text-sm text-slate-500">
                          <MapPin
                            size={14}
                            className="mt-0.5 text-[#801B29] shrink-0"
                          />
                          <div className="flex flex-col text-sm text-slate-600 font-medium leading-snug gap-0.5 whitespace-normal">
                            <span>
                              {hub.address}, {hub.ward}
                            </span>
                            <span>
                              {hub.district}, {hub.province}
                            </span>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 pl-5 font-medium whitespace-nowrap">
                          Toạ độ: {hub.lat}, {hub.lng}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck
                            size={14}
                            className="text-[#801B29]/70 shrink-0"
                          />
                          <span className="text-sm font-bold text-slate-700 break-all">
                            {hub.managerId
                              ? hubAdmins[hub.managerId] || hub.managerId
                              : "Chưa gán"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {hub.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                            INACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          <button
                            onClick={() => {
                              setSelectedHubId(hub.id);
                              setAssignModalOpen(true);
                            }}
                            title="Gán Admin"
                            className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-[#801B29]/20 transition-all flex items-center justify-center shrink-0"
                          >
                            <UserCog size={15} />
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/admin/hubs/edit/${hub.id}`)
                            }
                            title="Chỉnh sửa"
                            className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center justify-center shrink-0"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteHub(hub.id)}
                            title="Xoá"
                            className="w-8 h-8 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-all flex items-center justify-center shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty */}
          {!hubs.length && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
              <Building2 size={42} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">
                Không tìm thấy Hub
              </h3>
              <p className="text-sm text-slate-500">
                Không có dữ liệu phù hợp.
              </p>
            </div>
          )}

          {/* Pagination */}
          {hubs.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                Trang{" "}
                <span className="font-bold text-slate-800">{pageNo + 1}</span> /{" "}
                {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={pageNo === 0}
                  onClick={() => setPageNo((prev) => prev - 1)}
                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  disabled={pageNo + 1 >= totalPages}
                  onClick={() => setPageNo((prev) => prev + 1)}
                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Assign Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
              Gán Hub Admin
            </h2>
            <p className="text-xs text-slate-400 font-medium mb-6">
              Nhập ID của Hub Admin để gán cho Hub này
            </p>
            <div className="space-y-1 mb-6">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                HUB_ADMIN ID
              </label>
              <input
                type="text"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                placeholder="Nhập Id Hub Admin..."
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-semibold focus:outline-none focus:border-[#801B29] focus:bg-white focus:ring-4 focus:ring-[#801B29]/10 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedHubId(null);
                  setManagerId("");
                }}
                className="flex items-center justify-center h-11 border border-slate-200 hover:bg-slate-50 hover:border-[#801B29]/20 rounded-xl transition-all text-xs font-bold text-slate-700 cursor-pointer"
              >
                HUỶ
              </button>
              <button
                onClick={handleAssignManager}
                disabled={assignLoading}
                className="w-full h-11 bg-[#801B29] hover:bg-[#63141F] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-lg hover:shadow-[#801B29]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
              >
                {assignLoading ? "Đang gán..." : "Gán Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
