import axiosInstance from "../api/axiosInstance";

const authService = {
  // AUTH
  login: async ({ emailOrUsername, password }) => {
    const response = await axiosInstance.post("/auth/login", {
      emailOrUsername,
      password,
    });
    return response.data;
  },

  socialLogin: async ({ provider, token }) => {
    const response = await axiosInstance.post("/auth/social-login", {
      provider,
      token,
    });
    return response.data;
  },

  register: async ({ username, email, password, fullName, role }) => {
    const response = await axiosInstance.post("/auth/register", {
      username,
      email,
      password,
      fullName,
      role,
    });
    return response.data;
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      console.error("Backend logout failed:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
    }
  },

  // ================= USER =================

  getMyProfile: async () => {
    const response = await axiosInstance.get("/users/me");
    return response.data;
  },

  updateMyProfile: async (formData) => {
    const response = await axiosInstance.put("/users/me", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  changePassword: async ({ oldPassword, newPassword, confirmPassword }) => {
    const response = await axiosInstance.patch("/users/me/change-password", {
      oldPassword,
      newPassword,
      confirmPassword,
    });

    return response.data;
  },

  // ================= ADMIN =================

  // Lấy danh sách users có phân trang + filter
  getAllUsers: async ({
    pageNo = 0,
    pageSize = 10,
    sortBy = "createdAt",
    sortDir = "desc",
    keyword = "",
    role = "",
  } = {}) => {
    const response = await axiosInstance.get("/users", {
      params: {
        pageNo,
        pageSize,
        sortBy,
        sortDir,
        keyword,
        role,
      },
    });

    return response.data;
  },

  // Lấy chi tiết user theo ID
  getUserById: async (id) => {
    const response = await axiosInstance.get(`/users/${id}`);
    return response.data;
  },

  // Cập nhật roles
  updateUserRoles: async (id, rolesArray) => {
    const response = await axiosInstance.patch(
      `/users/${id}/roles`,
      rolesArray,
    );

    return response.data;
  },

  // Xóa user
  deleteUser: async (id) => {
    const response = await axiosInstance.delete(`/users/${id}`);
    return response.data;
  },
};

export default authService;
