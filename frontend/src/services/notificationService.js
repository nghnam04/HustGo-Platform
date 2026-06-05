import axiosInstance from "../api/axiosInstance";

const notificationService = {
  // Kiểm tra Notification Service hoạt động
  getStatus: () => axiosInstance.get("/notifications/status"),
};

export default notificationService;
