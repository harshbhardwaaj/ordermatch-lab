import { Suspense } from "react";

import { HowItWorks } from "@/components/narrative/how-it-works";

export default function ThesisPage() {
  return (
    <Suspense fallback={null}>
      <HowItWorks />
    </Suspense>
  );
}
