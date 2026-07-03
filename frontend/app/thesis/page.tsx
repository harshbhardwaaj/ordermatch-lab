import { AppShell } from "@/components/app-shell";
import { RouteShell } from "@/components/narrative/route-shell";
import { WhatILearnedSection } from "@/components/narrative/what-i-learned-section";

export default function ThesisPage() {
  return (
    <AppShell>
      <RouteShell
        eyebrow="How it works"
        title="The technical notes live here, not on the first screen."
        description="This is where the technical reviewer can go deeper. It explains why the prototype does not blindly trust a match, and how it handles uncertain orders."
        primaryHref="/proof"
        primaryLabel="Why me"
        items={[
          "How raw order text becomes structured fields.",
          "Why a product match needs reasons, not just a score.",
          "How review flags stop risky orders from moving forward.",
          "How technical metrics can check whether the system is trustworthy.",
        ]}
      >
        <WhatILearnedSection />
      </RouteShell>
    </AppShell>
  );
}
