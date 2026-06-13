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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className={
            metric.tone === "accent"
              ? "border-brand-navy bg-brand-navy p-5 text-white shadow-[0_18px_34px_rgba(15,23,42,0.14)]"
              : "border-[color:var(--border)] bg-white p-5"
          }
        >
          <p
            className={`text-[11px] uppercase tracking-[0.18em] ${
              metric.tone === "accent" ? "text-slate-200" : "text-slate-500"
            }`}
          >
            {metric.label}
          </p>
          <p className={`mt-2 text-[28px] font-semibold ${metric.tone === "accent" ? "text-white" : "text-brand-navy"}`}>
            {metric.value}
          </p>
        </Card>
      ))}
    </div>
  );
}
