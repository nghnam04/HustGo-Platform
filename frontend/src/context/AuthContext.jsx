import { createContext, useState, useEffect, useMemo } from "react";
import authService from "../services/authService";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext(null);

const decodeTokenToUser = (token) => {
  if (!token) return null;
  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) return null;

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
      fullName: decoded.fullName || decoded.name || "Khách hàng HustGo",
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
  const [gpsStatus, setGpsStatus] = useState(() => {
    // null / 'granted' / 'denied'
    return sessionStorage.getItem("gps_permission") || null;
  });
  const [askGpsOnLogin, setAskGpsOnLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      const tokenFromStorage = sessionStorage.getItem("token");

      if (tokenFromStorage) {
        try {
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

      const fullProfile = await authService.getMyProfile();
      sessionStorage.setItem("user", JSON.stringify(fullProfile));
      setUser(fullProfile);

      const cleanRoles = fullProfile.roles || [];
      const isShipper = cleanRoles.some((r) => r === "SHIPPER");
      if (isShipper && sessionStorage.getItem("gps_permission") !== "granted") {
        setAskGpsOnLogin(true);
      }

      setLoading(false);
      return responseData;
    } catch (error) {
      console.error(error);
      setLoading(false);
      const status = error.response?.status;
      const message = error.response?.data?.message || "Đăng nhập thất bại";
      if (status === 429) {
        return { error: "Đăng nhập thất bại. Thử lại sau 1 phút", status };
      }
      return { error: message, status };
    }
  };

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

      const fullProfile = await authService.getMyProfile();
      sessionStorage.setItem("user", JSON.stringify(fullProfile));
      setUser(fullProfile);

      return responseData;
    } catch (error) {
      console.error("Lỗi đăng nhập social:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Lỗi khi gọi API logout:", error);
    } finally {
      sessionStorage.clear();
      setToken(null);
      setUser(null);
      navigate("/login");
    }
  };

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
      gpsStatus,
      askGpsOnLogin,
      setAskGpsOnLogin,
      requestGpsPermission: () =>
        new Promise((resolve) => {
          if (!navigator.geolocation) {
            setGpsStatus("denied");
            sessionStorage.setItem("gps_permission", "denied");
            resolve(false);
            return;
          }
          navigator.permissions
            .query({ name: "geolocation" })
            .then((result) => {
              if (result.state === "granted") {
                setGpsStatus("granted");
                sessionStorage.setItem("gps_permission", "granted");
                resolve(true);
              } else if (result.state === "denied") {
                setGpsStatus("denied");
                sessionStorage.setItem("gps_permission", "denied");
                resolve(false);
              } else {
                navigator.geolocation.getCurrentPosition(
                  () => {
                    setGpsStatus("granted");
                    sessionStorage.setItem("gps_permission", "granted");
                    resolve(true);
                  },
                  () => {
                    setGpsStatus("denied");
                    sessionStorage.setItem("gps_permission", "denied");
                    resolve(false);
                  },
                );
              }
            })
            .catch(() => {
              navigator.geolocation.getCurrentPosition(
                () => {
                  setGpsStatus("granted");
                  sessionStorage.setItem("gps_permission", "granted");
                  resolve(true);
                },
                () => {
                  setGpsStatus("denied");
                  sessionStorage.setItem("gps_permission", "denied");
                  resolve(false);
                },
              );
            });
        }),
    }),
    [user, token, loading, gpsStatus, askGpsOnLogin],
  );

  return (
    <AuthContext.Provider value={value}>
      {!initializing && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
