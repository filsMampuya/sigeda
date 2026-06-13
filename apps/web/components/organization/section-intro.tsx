import type { ReactNode } from "react";

import { PageHeader } from "@/components/ui/page-header";

type SectionIntroProps = {
  actions?: ReactNode;
  eyebrow: string;
  title: string;
  description?: string;
};

export function SectionIntro({ actions, eyebrow, title, description }: SectionIntroProps) {
  return <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />;
}
