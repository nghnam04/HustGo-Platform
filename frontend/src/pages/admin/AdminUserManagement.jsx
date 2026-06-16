import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  RefreshCw,
  Loader2,
  Trash2,
  ShieldCheck,
  Activity,
  UserCog,
  Mail,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
} from "lucide-react";

import authService from "../../services/authService";
import defaultAvatar from "../../assets/default-avatar.jpg";
import { ROLE_MAP } from "../../constants/ROLE_MAP";
import RoleBadge from "../../components/utils/RoleBadge";
export default function AdminUserManagement() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [pageNo, setPageNo] = useState(0);
  const [pageSize] = useState(10);

  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [selectedUser, setSelectedUser] = useState(null);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [selectedRoles, setSelectedRoles] = useState([]);

  const [savingRoles, setSavingRoles] = useState(false);

  const AVAILABLE_ROLES = ["CUSTOMER", "SHIPPER", "HUB_ADMIN"];

  const fetchUsers = async () => {
    try {
      setRefreshing(true);

      const response = await authService.getAllUsers({
        pageNo,
        pageSize,
        keyword: searchQuery,
        role: roleFilter,
      });

      setUsers(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error) {
      console.error("Fetch users failed:", error);

      alert(
        error?.response?.data?.message || "Không thể tải danh sách người dùng",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pageNo, roleFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPageNo(0);
      fetchUsers();
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn xoá người dùng này?",
    );

    if (!confirmed) return;

    try {
      await authService.deleteUser(userId);

      alert("Xoá người dùng thành công!");

      fetchUsers();
    } catch (error) {
      console.error(error);

      alert(error?.response?.data?.message || "Không thể xoá user");
    }
  };

  const openRoleModal = (user) => {
    setSelectedUser(user);
    const filteredRoles = (user.roles || []).filter(
      (role) => role !== "SUPER_ADMIN",
    );

    setSelectedRoles(filteredRoles);
    setRoleModalOpen(true);
  };

  const openDetailModal = async (userId) => {
    try {
      const response = await authService.getUserById(userId);

      setSelectedUser(response);

      setDetailModalOpen(true);
    } catch (error) {
      console.error(error);

      alert(
        error?.response?.data?.message || "Không thể tải thông tin người dùng",
      );
    }
  };

  const toggleRole = (role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;

    try {
      setSavingRoles(true);

      await authService.updateUserRoles(selectedUser.id, selectedRoles);

      alert("Cập nhật quyền thành công!");

      setRoleModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Không thể cập nhật quyền");
    } finally {
      setSavingRoles(false);
    }
  };

  const roleTabs = useMemo(
    () => [
      { key: "", label: "Tất cả" },
      { key: "CUSTOMER", label: "Customer" },
      { key: "SHIPPER", label: "Shipper" },
      { key: "HUB_ADMIN", label: "Hub Admin" },
      { key: "SUPER_ADMIN", label: "Super Admin" },
    ],
    [],
  );

  return (
    <div className="admin-user-management">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">
            Quản lý người dùng
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 shrink-0"
        >
          <RefreshCw
            size={14}
            className={refreshing ? "animate-spin text-red-500" : ""}
          />
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-red-400" />
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 mb-6 flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="relative w-full lg:max-w-md">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Tìm theo username, email hoặc họ tên..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto grid-cols-3">
              {roleTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setPageNo(0);
                    setRoleFilter(tab.key);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    roleFilter === tab.key
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white border-slate-200 text-slate-600 hover:border-red-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-4 mb-6 flex items-center gap-3">
            <Activity size={18} className="text-red-500" />
            <span className="text-sm text-slate-500">Tổng số người dùng:</span>
            <span className="font-bold text-slate-800">{totalElements}</span>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3">Người dùng</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Vai trò</th>
                    <th className="px-5 py-3">Ngày tạo</th>
                    <th className="px-5 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatarUrl || defaultAvatar}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = defaultAvatar;
                            }}
                          />
                          <div>
                            <h3 className="font-semibold text-slate-800">
                              {user.fullName || "Chưa có tên"}
                            </h3>
                            <p className="text-xs text-slate-500">
                              @{user.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {user.email}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(selectedUser?.roles || []).map((role) => (
                            <RoleBadge
                              key={role}
                              role={role}
                              roleMap={ROLE_MAP}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {new Date(user.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {!user.roles?.includes("SUPER_ADMIN") && (
                            <button
                              onClick={() => openRoleModal(user)}
                              className="h-8 px-3 rounded-lg border bg-slate-100 border-[#801B29] text-slate-800 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
                            >
                              <UserCog size={13} />
                              Phân quyền
                            </button>
                          )}
                          <button
                            onClick={() => openDetailModal(user.id)}
                            title="Chi tiết"
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center"
                          >
                            <Eye size={15} />
                          </button>
                          {!user.roles?.includes("SUPER_ADMIN") && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              title="Xoá"
                              className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 flex items-center justify-center"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty */}
            {!users.length && (
              <div className="py-20 text-center">
                <Users size={44} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-1">
                  Không có người dùng
                </h3>
                <p className="text-sm text-slate-500">
                  Không tìm thấy dữ liệu phù hợp.
                </p>
              </div>
            )}

            {/* Pagination */}
            {users.length > 0 && (
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Trang{" "}
                  <span className="font-bold text-slate-800">{pageNo + 1}</span>{" "}
                  / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pageNo === 0}
                    onClick={() => setPageNo((prev) => prev - 1)}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={pageNo + 1 >= totalPages}
                    onClick={() => setPageNo((prev) => prev + 1)}
                    className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-xs"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ROLE MODAL */}
      {roleModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-start lg:items-center justify-center bg-black/60 pt-20 md:pt-24 lg:pt-0 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <ShieldCheck className="text-red-700" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Phân quyền người dùng
                </h2>

                <p className="text-xs text-slate-500">
                  {selectedUser.fullName}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {AVAILABLE_ROLES.map((role) => {
                const active = selectedRoles.includes(role);

                return (
                  <button
                    key={role}
                    onClick={() => toggleRole(role)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-left transition-all ${
                      active
                        ? "border-[#972130] bg-[#972130]/10"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">
                        {role}
                      </span>

                      {active && (
                        <div className="w-3 h-3 rounded-full bg-[#972130]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setRoleModalOpen(false);
                  setSelectedUser(null);
                  setSelectedRoles([]);
                }}
                className="btn-ghost text-sm"
              >
                Huỷ
              </button>

              <button
                onClick={handleSaveRoles}
                disabled={savingRoles}
                className="bg-[#972130] rounded-lg px-6 py-2.5 text-sm text-white disabled:opacity-70"
              >
                {savingRoles ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20 md:pt-24 lg:pt-28 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-sm sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            <div className="h-32 bg-gradient-to-r from-[#801B29] to-[#b32b3f] relative">
              <button
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedUser(null);
                }}
                className="absolute top-4 right-4 w-9 h-9 rounded-lg bg-black/20 hover:bg-black/40 text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 pb-6 relative">
              {/* Avatar */}
              <div className="flex items-center gap-4 -mt-14 mb-6">
                <img
                  src={selectedUser.avatarUrl || defaultAvatar}
                  alt={selectedUser.fullName}
                  className="w-28 h-28 rounded-2xl object-cover border-4 border-white bg-white shadow-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultAvatar;
                  }}
                />

                <div>
                  <h1 className="text-xl font-black text-slate-900">
                    {selectedUser.fullName || "Chưa cập nhật"}
                  </h1>

                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    @{selectedUser.username}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 my-5" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <ShieldCheck className="text-slate-400 mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      ID
                    </p>
                    <p className="text-xs font-mono font-bold text-slate-700 mt-0.5 break-all">
                      {selectedUser.id}
                    </p>
                  </div>
                </div>

                {/* ROLE */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <ShieldCheck className="text-[#801B29] mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Vai trò
                    </p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {(selectedUser?.roles || []).map((role) => (
                        <RoleBadge key={role} role={role} roleMap={ROLE_MAP} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* EMAIL */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <Mail className="text-slate-400 mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Email
                    </p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5 break-all">
                      {selectedUser.email}
                    </p>
                  </div>
                </div>

                {/* CREATED */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <CalendarDays className="text-slate-400 mt-0.5" size={16} />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Ngày tham gia
                    </p>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      {new Date(selectedUser.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setDetailModalOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Đóng
                </button>

                {!selectedUser.roles?.includes("SUPER_ADMIN") && (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      openRoleModal(selectedUser);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-[#801B29] hover:bg-[#63141F] text-white rounded-xl flex items-center gap-1.5"
                  >
                    <UserCog size={14} />
                    Phân quyền
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
