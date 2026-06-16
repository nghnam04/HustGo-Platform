export default function RoleBadge({ role, roleMap }) {
  const cfg = roleMap?.[role] ?? {
    label: role,
    color: "text-slate-600 bg-slate-100 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-lg border text-xs font-bold ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}
