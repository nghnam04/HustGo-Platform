import axiosInstance from "../api/axiosInstance";

const routingService = {
  // Tối ưu tuyến giao hàng
  optimizeRoute: (data) => axiosInstance.post("/routing/optimize", data),

  // Xem trước tuyến đường
  routePreview: (data) => axiosInstance.post("/routing/route-preview", data),
};

export default routingService;
