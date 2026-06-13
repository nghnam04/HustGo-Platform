import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

// Layouts & Security Routes
import ProtectedRoute from "./components/routes/ProtectedRoute";
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import useAuth from "./hooks/useAuth";
import GpsPermissionGate from "./components/common/GpsPermissionGate";

// Public Pages
import Home from "./pages/public/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import NotFound from "./pages/NotFound";
import ChatBotWidget from "./components/common/ChatBotWidget";

// CUSTOMER Pages
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CreateOrder from "./pages/customer/CreateOrder";
import OrderHistory from "./pages/customer/OrderHistory";
import EditOrder from "./pages/customer/EditOrder";
import DeliveryTracking from "./pages/customer/DeliveryTracking";
import MyFeedbacks from "./pages/customer/MyFeedbacks";

// SHIPPER Pages
import ShipperDashboard from "./pages/shipper/ShipperDashboard";
import AvailableRoutes from "./pages/shipper/AvailableRoutes";
import ActiveDelivery from "./pages/shipper/ActiveDelivery";
import DeliveryHistory from "./pages/shipper/DeliveryHistory";

// HUB_ADMIN Pages
import HubDashboard from "./pages/hub/HubDashboard";
import ReceiveOrders from "./pages/hub/ReceiveOrders";
import TransferReceiving from "./pages/hub/TransferReceiving";
import TransferCreate from "./pages/hub/TransferCreate";
import HubInventory from "./pages/hub/HubInventory";
import RouteAssignment from "./pages/hub/RouteAssignment";
import RouteMonitoring from "./pages/hub/RouteMonitoring";

// SUPER_ADMIN Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrderList from "./pages/admin/AdminOrderList";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminHubManagement from "./pages/admin/AdminHubManagement";
import AdminUserManagement from "./pages/admin/AdminUserManagement";
import FeedbackManagement from "./pages/admin/FeedbackManagement";
import CreateHubForm from "./pages/admin/CreateHubForm";
import EditHubForm from "./pages/admin/EditHubForm";

// Profile
import UserProfile from "./pages/auth/UserProfile";
import EditProfile from "./pages/auth/EditProfile";
import ChangePassword from "./pages/auth/ChangePassword";

const menuConfig = {
  CUSTOMER: [
    { name: "Dashboard khách hàng", path: "/customer/dashboard" },
    { name: "Tạo đơn hàng", path: "/customer/create-order" },
    { name: "Lịch sử đơn hàng", path: "/customer/orders" },
    { name: "Phản hồi của tôi", path: "/customer/feedbacks" },
    {
      name: "Theo dõi hành trình đơn hàng",
      path: "/customer/delivery-tracking",
    },
  ],
  SHIPPER: [
    { name: "Dashboard Shipper", path: "/shipper/dashboard" },
    { name: "Tuyến khả dụng", path: "/shipper/routes" },
    { name: "Đơn đang giao", path: "/shipper/delivery" },
    { name: "Lịch sử giao hàng", path: "/shipper/history" },
  ],
  HUB_ADMIN: [
    { name: "Dashboard Hub", path: "/hub/dashboard" },
    { name: "Tiếp nhận hàng từ khách", path: "/hub/receive-orders" },
    { name: "Nhập kho trung chuyển", path: "/hub/transfer-receiving" },
    { name: "Tạo chuyến trung chuyển", path: "/hub/transfer-create" },
    { name: "Quản lý tồn kho tại Hub", path: "/hub/inventory" },
    { name: "Phân tuyến giao hàng", path: "/hub/route-assignment" },
    { name: "Theo dõi tuyến giao", path: "/hub/route-monitoring" },
  ],
  SUPER_ADMIN: [
    { name: "Dashboard hệ thống", path: "/admin/dashboard" },
    { name: "Quản lý đơn hàng", path: "/admin/orders" },
    { name: "Quản lý bưu cục", path: "/admin/hubs" },
    { name: "Quản lý người dùng", path: "/admin/users" },
    { name: "Quản lý phản hồi", path: "/admin/feedbacks" },
  ],
};

const App = () => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const locationKey = location.pathname;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans text-slate-900 selection:bg-[#801B29] selection:text-white antialiased">
      {/* Navbar */}
      <Navbar user={user} handleLogout={logout} />

      {/* Main Block (Sidebar + Main content) */}
      <div className="flex flex-1 w-full relative overflow-hidden z-10">
        <GpsPermissionGate>
          {isAuthenticated && user && (
            <Sidebar
              user={user}
              handleLogout={logout}
              menuConfig={menuConfig}
            />
          )}

          <main className="flex-1 flex flex-col overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={locationKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-4 md:p-8 max-w-7xl w-full mx-auto flex-1"
              >
                <Routes location={location}>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected Routes */}

                  {/* Profile Routes*/}
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={[
                          "CUSTOMER",
                          "SHIPPER",
                          "HUB_ADMIN",
                          "SUPER_ADMIN",
                        ]}
                      />
                    }
                  >
                    <Route
                      path="/profile"
                      element={<UserProfile user={user} />}
                    />
                    <Route
                      path="/profile/edit"
                      element={<EditProfile user={user} />}
                    />
                    <Route
                      path="/profile/change-password"
                      element={<ChangePassword />}
                    />
                  </Route>

                  {/* CUSTOMER */}
                  <Route
                    element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}
                  >
                    <Route
                      path="/customer/dashboard"
                      element={<CustomerDashboard />}
                    />
                    <Route
                      path="/customer/create-order"
                      element={<CreateOrder />}
                    />
                    <Route path="/customer/orders" element={<OrderHistory />} />
                    <Route
                      path="/customer/feedbacks"
                      element={<MyFeedbacks />}
                    />
                    <Route
                      path="/customer/orders/edit/:orderId"
                      element={<EditOrder />}
                    />

                    <Route
                      path="/customer/delivery-tracking"
                      element={<DeliveryTracking />}
                    />
                  </Route>

                  {/* SHIPPER */}
                  <Route
                    element={<ProtectedRoute allowedRoles={["SHIPPER"]} />}
                  >
                    <Route
                      path="/shipper/dashboard"
                      element={<ShipperDashboard />}
                    />
                    <Route
                      path="/shipper/routes"
                      element={<AvailableRoutes />}
                    />
                    <Route
                      path="/shipper/delivery"
                      element={<ActiveDelivery />}
                    />
                    <Route
                      path="/shipper/history"
                      element={<DeliveryHistory />}
                    />
                  </Route>

                  {/* HUB_ADMIN */}
                  <Route
                    element={<ProtectedRoute allowedRoles={["HUB_ADMIN"]} />}
                  >
                    <Route path="/hub/dashboard" element={<HubDashboard />} />
                    <Route
                      path="/hub/receive-orders"
                      element={<ReceiveOrders />}
                    />

                    <Route
                      path="/hub/transfer-receiving"
                      element={<TransferReceiving />}
                    />

                    <Route
                      path="/hub/transfer-create"
                      element={<TransferCreate />}
                    />

                    <Route path="/hub/inventory" element={<HubInventory />} />

                    <Route
                      path="/hub/route-assignment"
                      element={<RouteAssignment />}
                    />

                    <Route
                      path="/hub/route-monitoring"
                      element={<RouteMonitoring />}
                    />
                  </Route>

                  {/* PHÂN HỆ SUPER_ADMIN */}
                  <Route
                    element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />}
                  >
                    <Route
                      path="/admin/dashboard"
                      element={<AdminDashboard />}
                    />
                    <Route path="/admin/orders" element={<AdminOrderList />} />
                    <Route
                      path="/admin/orders/:orderId"
                      element={<AdminOrderDetail />}
                    />
                    <Route
                      path="/admin/hubs"
                      element={<AdminHubManagement />}
                    />
                    <Route
                      path="/admin/hubs/create"
                      element={<CreateHubForm />}
                    />
                    <Route
                      path="/admin/hubs/edit/:id"
                      element={<EditHubForm />}
                    />
                    <Route
                      path="/admin/users"
                      element={<AdminUserManagement />}
                    />
                    <Route
                      path="/admin/feedbacks"
                      element={<FeedbackManagement />}
                    />
                  </Route>

                  {/* Not Found */}
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </GpsPermissionGate>
      </div>
      {/* Footer */}
      <Footer />

      {/* Chatbot Widget */}
      <ChatBotWidget />
    </div>
  );
};

export default App;
