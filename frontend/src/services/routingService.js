import axiosInstance from "../api/axiosInstance";

const routingService = {
  // HUB_ADMIN / SUPER_ADMIN tối ưu tuyến giao hàng
  optimizeRoute: (data) => axiosInstance.post("/routing/optimize", data),

  // SHIPPER hoặc HUB_ADMIN xem trước tuyến đường
  routePreview: (data) => axiosInstance.post("/routing/route-preview", data),
};

export default routingService;
