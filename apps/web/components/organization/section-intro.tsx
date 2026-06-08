type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionIntro({ eyebrow, title, description }: SectionIntroProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold text-brand-navy">{title}</h1>
        {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
}
