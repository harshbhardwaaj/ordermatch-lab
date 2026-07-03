import { AppShell } from "@/components/app-shell";
import { RouteShell } from "@/components/narrative/route-shell";

export default function PrototypePage() {
  return (
    <AppShell>
      <RouteShell
        eyebrow="What I built"
        title="A simple workbench for messy customer orders."
        description="A customer order comes in. The prototype reads the lines, suggests matching products, shows what needs review, and explains whether the order can move forward."
        primaryHref="/thesis"
        primaryLabel="How it works"
        items={[
          "Incoming customer orders with a clear status.",
          "Original customer text next to the cleaned-up version.",
          "Suggested product matches with reasons and review flags.",
          "A final checklist that explains what can move forward and what still needs a human.",
        ]}
      />
    </AppShell>
  );
}
