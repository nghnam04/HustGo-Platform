import axiosInstance from "../api/axiosInstance";

const hubService = {
  // ================= SUPER ADMIN =================

  // Lấy danh sách tất cả hubs
  getAllHubs: async ({
    pageNo = 0,
    pageSize = 6,
    sortBy = "createdAt",
    sortDir = "desc",
    keyword = "",
  } = {}) => {
    const response = await axiosInstance.get("/hubs", {
      params: {
        pageNo,
        pageSize,
        sortBy,
        sortDir,
        keyword,
      },
    });

    return response.data;
  },

  // Lấy chi tiết hub theo ID
  getHubById: (id) => axiosInstance.get(`/hubs/${id}`),

  // Tạo hub mới
  createHub: (hubData) => axiosInstance.post("/hubs", hubData),

  // Cập nhật hub
  updateHub: (id, hubData) => axiosInstance.put(`/hubs/${id}`, hubData),

  // Soft delete hub
  deleteHub: (id) => axiosInstance.delete(`/hubs/${id}`),

  // Gán HUB_ADMIN cho hub
  assignManager: (hubId, managerId) =>
    axiosInstance.patch(`/hubs/${hubId}/assign-manager`, { managerId }),

  // ================= HUB ADMIN =================

  // Lấy thông tin hub của HUB_ADMIN hiện tại
  getMyHub: () => axiosInstance.get("/hubs/me"),

  // Lấy danh sách tất cả hubs (dùng cho tạo chuyến trung chuyển)
  getAllHubsForTransfer: async ({
    pageNo = 0,
    pageSize = 100,
    sortBy = "createdAt",
    sortDir = "desc",
    keyword = "",
  } = {}) => {
    const response = await axiosInstance.get("/hubs", {
      params: { pageNo, pageSize, sortBy, sortDir, keyword },
    });
    // Hub admin API returns PageResponse directly (NestJS), not axios-wrapped { data: PageResponse }
    return response.data?.content ?? response.data ?? [];
  },

  // ================= INTERNAL =================

  // Check hub tồn tại
  checkHubExists: (hubId) =>
    axiosInstance.get(`/internal/hubs/${hubId}/exists`),

  // Lấy tên quận/huyện của Hub
  getHubDistrict: (hubId) =>
    axiosInstance.get(`/internal/hubs/${hubId}/district`),

  // Lấy hubId từ managerId
  getHubIdByManager: (managerId) =>
    axiosInstance.get(`/internal/hubs/manager/${managerId}`),
};

export default hubService;
