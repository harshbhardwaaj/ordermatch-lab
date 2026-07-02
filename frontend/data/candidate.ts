import type { CandidateProjectProof } from "@/types/candidate";

export const candidateDataNotice = {
  label: "Candidate proof selected from story bank",
  description:
    "Concise, Comena-relevant proof points selected from docs/story-bank-harsh.md. This is supporting evidence for the product story, not a full resume dump.",
  sourceData: ["docs/story-bank-harsh.md"],
} as const;

export const candidateProofItems: CandidateProjectProof[] = [
  {
    id: "proof-alevor-ai-classification",
    title: "ALEVOR AI company classification",
    capability: "ai-evals",
    summary:
      "Built a ground-truth labeling set, benchmarked 13 prompt variants across OpenAI models, and deployed the winning prompt to classify 320,000+ companies.",
    proofMetric: "Reduced manual classification time by about 30%.",
    links: [],
  },
  {
    id: "proof-ai-investment-analyst",
    title: "AI Investment Analyst",
    capability: "full-stack",
    summary:
      "Built and deployed a full-stack tool that turns a public company ticker into an investment memo with Python-computed DCF, WACC, LBO, comps, and sensitivity tables.",
    proofMetric: "Built and deployed in one day with FastAPI, Next.js, Railway, and Vercel.",
    links: [
      {
        label: "Live app",
        href: "https://ai-investment-analyst-harsh.vercel.app",
      },
      {
        label: "GitHub",
        href: "https://github.com/harshbhardwaaj/ai-investment-analyst",
      },
    ],
  },
  {
    id: "proof-cv-jd-fit-scorer",
    title: "CV-JD Fit Scorer",
    capability: "document-workflow",
    summary:
      "Built a deployed AI screening workflow with PDF text extraction, structured JSON output, Claude API scoring, and a clean Streamlit interface.",
    proofMetric: "Shipped from scratch in one day with no prior Streamlit experience.",
    links: [
      {
        label: "Live app",
        href: "https://cv-scorer-harsh.streamlit.app",
      },
    ],
  },
  {
    id: "proof-tum-ai-data-coursework",
    title: "TUM AI and data coursework",
    capability: "data-products",
    summary:
      "Studied machine learning, causal discovery, big data analytics, programming, applied econometrics, and operations research, then applied NLP evaluation ideas in production work.",
    proofMetric: "Computer Engineering minor within B.S. Management and Technology.",
    links: [],
  },
];
