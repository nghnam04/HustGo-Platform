import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { AuthContext } from "../../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithSocial } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v19.0",
      });
    };

    (function (d, s, id) {
      var js,
        fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s);
      js.id = id;
      js.src = "https://connect.facebook.net/vi_VN/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");
  }, []);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError("");

      try {
        const googleAccessToken = tokenResponse.access_token;

        const resData = await loginWithSocial({
          provider: "GOOGLE",
          socialToken: googleAccessToken,
        });

        redirectUserBasedOnRole(resData);
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.message ||
            "Xác thực tài khoản Google phía Backend thất bại.",
        );
      } finally {
        setLoading(false);
      }
    },

    onError: (error) => {
      console.error("Google Login thất bại:", error);
      setError("Đăng nhập bằng Google thất bại hoặc bị hủy bỏ.");
    },
  });

  const handleFacebookLogin = () => {
    setError("");

    if (!window.FB) {
      setError(
        "Hệ thống Facebook SDK đang được tải hoặc bị chặn bởi trình duyệt.",
      );
      return;
    }

    setLoading(true);

    window.FB.login(
      (response) => {
        if (response.authResponse) {
          const fbAccessToken = response.authResponse.accessToken;

          loginWithSocial({
            provider: "FACEBOOK",
            socialToken: fbAccessToken,
          })
            .then((resData) => {
              redirectUserBasedOnRole(resData);
            })
            .catch((err) => {
              console.error(err);

              setError(
                err.response?.data?.message ||
                  "Xác thực tài khoản Facebook phía Backend thất bại.",
              );
            })
            .finally(() => {
              setLoading(false);
            });
        } else {
          setLoading(false);

          setError(
            "Người dùng đã hủy hoặc không cấp quyền đăng nhập qua Facebook.",
          );
        }
      },
      { scope: "email,public_profile" },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Vui lòng điền đầy đủ tài khoản và mật khẩu.");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const resData = await login({
        email: email,
        password: password,
      });

      if (resData?.error) {
        setError(resData.error);
        return;
      }

      redirectUserBasedOnRole(resData);
    } catch (err) {
      if (err.response?.status === 429) {
        setError("Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.");
      } else {
        setError("Sai tài khoản hoặc mật khẩu bưu cục.");
      }
    } finally {
      setLoading(false);
    }
  };

  const redirectUserBasedOnRole = (authData) => {
    const userRoles = authData?.roles || [];

    if (userRoles.includes("SUPER_ADMIN")) {
      navigate("/admin/dashboard");
    } else if (userRoles.includes("HUB_ADMIN")) {
      navigate("/hub/dashboard");
    } else if (userRoles.includes("SHIPPER")) {
      navigate("/shipper/dashboard");
    } else if (userRoles.includes("CUSTOMER")) {
      navigate("/customer/dashboard");
    } else {
      navigate("/customer/dashboard");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto my-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          y: 0,
          boxShadow:
            "0 0 0 1px rgba(128,27,41,0.15), 0 20px 50px rgba(128,27,41,0.18)",
        }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-left transition-all"
      >
        {/* Glow đỏ hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(128,27,41,0.12),transparent_45%)]"></div>

        <div className="relative z-10">
          <div className="space-y-2 mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Chào mừng trở lại với{" "}
              <span className="text-[#801B29]">HUSTGo</span>
            </h2>

            <p className="text-xs text-slate-400 font-medium">
              Nền tảng quản lý mạng lưới giao hàng chặng cuối khu vực Hà Nội
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Địa chỉ Email / Tên đăng nhập
              </label>

              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 text-slate-400 w-4 h-4" />

                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email hoặc tên đăng nhập"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-[#801B29] focus:bg-white focus:ring-4 focus:ring-[#801B29]/10 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Mật khẩu
                </label>
              </div>

              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-slate-400 w-4 h-4" />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 text-xs font-semibold focus:outline-none focus:border-[#801B29] focus:bg-white focus:ring-4 focus:ring-[#801B29]/10 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-[#801B29] hover:bg-[#63141F] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-lg hover:shadow-[#801B29]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? "Đang xử lý dữ liệu..." : "Đăng nhập hệ thống"}

              <ArrowRight size={14} />
            </button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Chưa có tài khoản?{" "}
              <Link
                to="/register"
                className="text-[#801B29] font-bold hover:underline"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>

          <div className="relative my-6 flex items-center justify-center">
            <span className="relative bg-white px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              Hoặc tiếp tục với
            </span>
          </div>

          {/* NÚT ĐĂNG NHẬP MẠNG XÃ HỘI (GOOGLE & FACEBOOK) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Nút Google */}
            <button
              type="button"
              onClick={() => handleGoogleLogin()}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 border border-slate-200 hover:bg-slate-50 hover:border-[#801B29]/20 rounded-xl transition-all text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.53-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.65-5.17 3.65-8.58z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.11 0-5.74-2.11-6.68-4.96H1.21v3.15C3.18 21.88 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.32 14.24A7.16 7.16 0 0 1 5 12c0-.79.13-1.57.32-2.34V6.51H1.21A11.94 11.94 0 0 0 0 12c0 1.92.45 3.74 1.21 5.49l4.11-3.25z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.18 2.12 1.21 6.51l4.11 3.25c.94-2.85 3.57-4.96 6.68-4.96z"
                />
              </svg>
              Google
            </button>

            {/* Nút Facebook */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-11 border border-slate-200 hover:bg-slate-50 hover:border-[#801B29]/20 rounded-xl transition-all text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
