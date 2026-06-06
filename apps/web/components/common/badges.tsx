type BadgeProps = {
  label: string;
};

export function AccessControlBadge({ label }: BadgeProps) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{label}</span>;
}

export function ConfidentialityBadge({ label }: BadgeProps) {
  return <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">{label}</span>;
}

export function StatusBadge({ label }: BadgeProps) {
  return <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-800">{label}</span>;
}
