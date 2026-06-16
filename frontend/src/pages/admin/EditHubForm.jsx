import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Warehouse,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  MapPinHouse,
  Navigation,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import hubService from "../../services/hubService";
import { HANOI_DISTRICTS } from "../../constants/hanoiDistricts";
import getCoordinates from "../../components/utils/getCoordinates";

export default function EditHubForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const getDistrictValue = (input) => {
    if (!input) return "";
    const cleanInput = input.trim().toLowerCase();
    if (HANOI_DISTRICTS.some((d) => d.value === input)) {
      return input;
    }
    let found = HANOI_DISTRICTS.find(
      (d) => d.label.toLowerCase() === cleanInput,
    );
    if (found) return found.value;
    found = HANOI_DISTRICTS.find(
      (d) =>
        d.label
          .replace(/^Quận\s*/, "")
          .replace(/^Huyện\s*/, "")
          .toLowerCase() === cleanInput ||
        d.label.replace(/^Quận\s*/, "").toLowerCase() === cleanInput,
    );
    if (found) return found.value;
    return input;
  };

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");
  const [geoError, setGeoError] = useState("");

  const [coords, setCoords] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    ward: "",
    district: "",
    province: "Hà Nội",
    active: true,
  });

  useEffect(() => {
    const loadHub = async () => {
      try {
        setFetching(true);
        const response = await hubService.getHubById(id);
        const data = response.data || response;

        setFormData({
          code: data.code || "",
          name: data.name || "",
          address: data.address || "",
          ward: data.ward || "",
          district: getDistrictValue(data.district) || "",
          province: data.province || "Hà Nội",
          active: data.active !== undefined ? data.active : true,
        });

        if (data.lat && data.lng) {
          setCoords({ lat: data.lat, lng: data.lng });
        }
      } catch (err) {
        setError("Không thể tải thông tin Hub.");
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    if (id) loadHub();
  }, [id]);

  // Map Init
  useLayoutEffect(() => {
    if (fetching || !mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      minZoom: 8,
      maxZoom: 16,
      maxBounds: [
        [8.5, 102],
        [23.5, 110],
      ],
      maxBoundsViscosity: 1.0,
    }).setView([21.0285, 105.8542], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(mapInstance.current);

    setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize();
    }, 300);
  }, [fetching]);

  // Marker
  useEffect(() => {
    if (!mapInstance.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (coords) {
      const icon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#dc2626;border:2px solid white;border-radius:999px;box-shadow:0 0 8px rgba(0,0,0,0.4);"></div>`,
        className: "",
        iconSize: [16, 16],
      });

      markerRef.current = L.marker([coords.lat, coords.lng], { icon })
        .addTo(mapInstance.current)
        .bindPopup("📦 Hub");

      mapInstance.current.flyTo([coords.lat, coords.lng], 15);
    }
  }, [coords]);

  // Auto geocoding
  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (
        formData.address?.trim() &&
        formData.ward?.trim() &&
        formData.district
      ) {
        setGeoError("");
        const result = await getCoordinates({
          address: formData.address,
          ward: formData.ward,
          district: formData.district,
        });

        if (result) {
          setCoords(result);
          setGeoError("");
        } else {
          setCoords(null);
          setGeoError("Không tìm thấy vị trí. Vui lòng kiểm tra lại địa chỉ.");
        }
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [formData.address, formData.ward, formData.district]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "active" ? value === "true" : value,
    }));
  };

  const validateForm = () => {
    const errors = {};
    const required = [
      "code",
      "name",
      "address",
      "ward",
      "district",
      "province",
    ];

    required.forEach((field) => {
      if (!String(formData[field]).trim()) {
        errors[field] = "Trường này không được để trống";
      }
    });

    if (formData.code && !/^[A-Z0-9_]+$/.test(formData.code)) {
      errors.code = "Code chỉ chứa chữ hoa, số và dấu gạch dưới";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const geo =
        coords ||
        (await getCoordinates({
          address: formData.address,
          ward: formData.ward,
          district: formData.district,
        }));

      const payload = {
        ...formData,
        lat: geo?.lat,
        lng: geo?.lng,
      };

      await hubService.updateHub(id, payload);

      setSuccess(true);

      setTimeout(() => {
        navigate("/admin/hubs");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Cập nhật Hub thất bại!");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  if (success) {
    return (
      <motion.div className="card-base max-w-lg mx-auto text-center py-16 mt-10">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black">Cập nhật Hub thành công!</h2>
      </motion.div>
    );
  }

  return (
    <motion.div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex flex-row items-start justify-between gap-3 mb-2">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-[#801B29]/10 rounded-xl shrink-0">
            <Warehouse className="text-[#801B29] w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Chỉnh sửa Hub
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5 whitespace-nowrap">
              ID: {id}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/admin/hubs")}
          className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Quay lại</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 font-bold flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {geoError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 font-bold flex items-center gap-2">
          <AlertCircle size={18} /> {geoError}
        </div>
      )}

      <div className="card-base overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold flex items-center gap-2">
            <Navigation size={18} /> Bản đồ Hub
          </h3>
        </div>
        <div
          ref={mapRef}
          className="w-full h-[400px] rounded-2xl z-10 relative"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card-base space-y-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#801B29]" />

          <h3 className="text-sm font-black uppercase text-[#801B29] flex items-center gap-2">
            <MapPinHouse size={16} /> Thông tin Hub
          </h3>

          {/* Form fields - Giống CreateHubForm nhưng có dữ liệu sẵn */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Mã Hub
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="input-base uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Tên Hub
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Tỉnh / Thành phố
              </label>
              <input
                type="text"
                value="Hà Nội"
                disabled
                className="input-base bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Quận / Huyện
              </label>
              <select
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                className="input-base cursor-pointer"
              >
                <option value="">-- Chọn quận/huyện --</option>
                {HANOI_DISTRICTS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Phường / Xã
              </label>
              <input
                type="text"
                name="ward"
                value={formData.ward}
                onChange={handleInputChange}
                className="input-base"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Trạng thái
              </label>
              <select
                name="active"
                value={String(formData.active)}
                onChange={handleInputChange}
                className="input-base cursor-pointer"
              >
                <option value="true">Hoạt động</option>
                <option value="false">Không hoạt động</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">
              Địa chỉ chi tiết
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="input-base min-h-[90px]"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-8 sm:px-10 py-3 bg-[#801B29] hover:bg-[#63141F] text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-lg hover:shadow-[#801B29]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 uppercase tracking-wider w-full sm:w-auto"
            >
              {loading ? "ĐANG CẬP NHẬT..." : "CẬP NHẬT HUB"}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
