import { Card } from "@/components/ui/card";

export default function AdminUsersPage() {
  return (
    <Card>
      <h1 className="text-xl font-semibold text-brand-navy">Administration des utilisateurs</h1>
      <p className="mt-3 text-sm text-slate-600">Provisionnement, attribution des roles et rattachements.</p>
    </Card>
  );
}
