import { Card } from "@/components/ui/card";

type DashboardCardsProps = {
  metrics: Array<{
    label: string;
    value: string;
  }>;
};

export function DashboardCards({ metrics }: DashboardCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-white/90">
          <p className="text-sm text-slate-500">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold text-brand-navy">{metric.value}</p>
        </Card>
      ))}
    </div>
  );
}
