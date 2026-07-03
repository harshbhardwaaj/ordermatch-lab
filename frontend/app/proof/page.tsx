import { AppShell } from "@/components/app-shell";
import { RouteShell } from "@/components/narrative/route-shell";

export default function ProofPage() {
  return (
    <AppShell>
      <RouteShell
        eyebrow="Why me"
        title="Why I think I can build this with you."
        description="This page will stay short. It will connect the prototype to Harsh's relevant work without turning the app into a resume."
        primaryHref="/contact"
        primaryLabel="Next step"
        items={[
          "I have shipped small AI products end to end.",
          "I have worked with messy business data and evaluation.",
          "I have built document workflows before.",
          "I study business and computer engineering, so I care about both the workflow and the code.",
        ]}
      />
    </AppShell>
  );
}
