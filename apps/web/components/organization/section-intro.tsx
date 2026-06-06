type SectionIntroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionIntro({ eyebrow, title, description }: SectionIntroProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold text-brand-navy">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm text-slate-600">{description}</p>
    </div>
  );
}
