import { createContext, useState, useEffect, useMemo } from "react";
import authService from "../services/authService";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext(null);

// ========================================================
// 🎯 NÂNG CẤP HÀM DECODE: Bóc tách toàn diện thông tin từ JWT (GIỮ NGUYÊN)
// ========================================================
const decodeTokenToUser = (token) => {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) return null;

    console.log("DỮ LIỆU THÔ BÊN TRONG JWT DECODED:", decoded);

    const rolesString = decoded.role || decoded.roles;
    let cleanRoles = [];

    if (rolesString) {
      if (Array.isArray(rolesString)) {
        cleanRoles = rolesString.map((r) =>
          String(r).replace("ROLE_", "").toUpperCase(),
        );
      } else {
        cleanRoles = String(rolesString)
          .split(",")
          .map((r) => r.trim().replace("ROLE_", "").toUpperCase());
      }
    } else {
      cleanRoles = ["CUSTOMER"];
    }

    return {
      id: decoded.userId || decoded.id || decoded.sub,
      username: decoded.username || decoded.sub,
      email: decoded.email || null,
      fullName: decoded.fullName || decoded.name || "Người dùng Facebook",
      avatarUrl: decoded.avatarUrl || decoded.avatar || decoded.picture || null,
      role: {
        name: cleanRoles[0] || "CUSTOMER",
      },
      roles: cleanRoles,
    };
  } catch (error) {
    console.error("Lỗi giải mã token:", error);
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem("token") || null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  // ========================================================
  // 🛠️ ĐÃ SỬA: Khởi tạo Auth (Ưu tiên gọi API profile để đồng bộ dữ liệu mới nhất)
  // ========================================================
  useEffect(() => {
    const initializeAuth = async () => {
      const tokenFromStorage = sessionStorage.getItem("token");

      if (tokenFromStorage) {
        try {
          // Gọi API để lấy dữ liệu mới nhất từ server (có cả createdAt)
          const profile = await authService.getMyProfile();
          setToken(tokenFromStorage);
          setUser(profile);
          sessionStorage.setItem("user", JSON.stringify(profile));
        } catch (error) {
          console.error("Token hết hạn hoặc lỗi profile:", error);
          sessionStorage.clear();
          setToken(null);
          setUser(null);
        }
      }
      setInitializing(false);
    };
    initializeAuth();
  }, []);

  // ========================================================
  // 🛠️ ĐÃ SỬA: Gọi API profile sau khi login thường
  // ========================================================
  const login = async ({ email: emailOrUsername, password }) => {
    setLoading(true);
    try {
      const responseData = await authService.login({
        emailOrUsername,
        password,
      });

      const accessToken =
        responseData?.token ||
        responseData?.data?.token ||
        responseData?.accessToken;

      if (!accessToken) throw new Error("Không tìm thấy access token");

      sessionStorage.setItem("token", accessToken);
      setToken(accessToken);

      // Lấy profile đầy đủ từ server
      const fullProfile = await authService.getMyProfile();
      sessionStorage.setItem("user", JSON.stringify(fullProfile));
      setUser(fullProfile);

      setLoading(false);
      return responseData;
    } catch (error) {
      console.error(error);
      setLoading(false);
      return { error: error.response?.data?.message || "Đăng nhập thất bại" };
    }
  };

  // ========================================================
  // 🛠️ ĐÃ SỬA: Gọi API profile sau khi login social
  // ========================================================
  const loginWithSocial = async ({ provider, socialToken }) => {
    setLoading(true);
    try {
      const responseData = await authService.socialLogin({
        provider,
        token: socialToken,
      });

      const accessToken = responseData?.token || responseData?.data?.token;
      if (!accessToken) throw new Error("Không nhận được token hệ thống");

      sessionStorage.setItem("token", accessToken);
      setToken(accessToken);

      // Lấy profile đầy đủ từ server
      const fullProfile = await authService.getMyProfile();
      sessionStorage.setItem("user", JSON.stringify(fullProfile));
      setUser(fullProfile);

      return responseData;
    } catch (error) {
      console.error("Lỗi đăng nhập mạng xã hội context:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // 🛠️ SỬA CHỖ 4: Dọn dẹp sạch sẽ kho lưu trữ khi Đăng xuất (Logout)
  // ========================================================
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Lỗi khi gọi API logout:", error);
    } finally {
      sessionStorage.clear(); // 🟢 Xóa toàn bộ sessionStorage
      setToken(null);
      setUser(null);
      navigate("/login");
    }
  };

  // ========================================================
  // 🌟 KHÔNG LIÊN QUAN: Giữ nguyên vẹn toàn bộ phần code phía dưới
  // ========================================================
  const register = async (
    fullName,
    email,
    username,
    password,
    role = "CUSTOMER",
  ) => {
    setLoading(true);
    try {
      const response = await authService.register({
        fullName,
        email,
        username,
        password,
        role,
      });
      setLoading(false);
      return { success: true, data: response };
    } catch (error) {
      console.error(error);
      setLoading(false);
      return {
        error:
          error.response?.data?.message ||
          "Đăng ký thất bại. Vui lòng thử lại.",
        status: error.response?.status,
      };
    }
  };

  const isAuthenticated = !!user && !!token;
  const role = user
    ? user.roles
      ? { name: user.roles[0] }
      : user.role
    : { name: "GUEST" };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated,
      role,
      login,
      loginWithSocial,
      logout,
      register,
    }),
    [user, token, loading],
  );

  return (
    <AuthContext.Provider value={value}>
      {!initializing && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
