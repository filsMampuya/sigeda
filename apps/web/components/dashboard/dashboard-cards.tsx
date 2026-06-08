import { Card } from "@/components/ui/card";

type DashboardCardsProps = {
  metrics: Array<{
    label: string;
    value: string;
    tone?: "default" | "accent";
  }>;
};

export function DashboardCards({ metrics }: DashboardCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className={metric.tone === "accent" ? "border-brand-navy bg-brand-navy text-white" : "bg-white/90"}
        >
          <p className={`text-sm ${metric.tone === "accent" ? "text-slate-200" : "text-slate-500"}`}>
            {metric.label}
          </p>
          <p className={`mt-3 text-3xl font-semibold ${metric.tone === "accent" ? "text-white" : "text-brand-navy"}`}>
            {metric.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
