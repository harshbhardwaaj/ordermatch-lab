# Engineering Thesis: Research And Sources

**Date**: July 5, 2026
**Purpose**: Grounding notes for the "How it works" page (Phase 6, T051-T059). Every claim below is tied to a real, checked source or is flagged as our own reasoning. Do not add a source here that has not been opened and read.

## How to use this

The "How it works" page argues how OrderMatch Lab becomes a real, reliable product. It is not a recap of the prototype. Each section of the page maps to one claim below. When writing copy, cite the source only for the specific point it supports, and never imply a benchmark against Comena or live functionality that does not exist yet.

## Primary research (peer-reviewed or arXiv, each opened and verified)

These are the sources shown on the References slide. Every one was fetched and confirmed: title, authors, year, and that it supports the mapped claim. Do not cite anything here that has not been opened.

- Reading the order (extraction): Xu et al., "Large Language Models for Generative Information Extraction: A Survey" (2023). https://arxiv.org/abs/2312.17617
- Matching (SKU catalog search, hybrid): Ubrangala et al., "Searching, fast and slow, through product catalogs" (2024). Directly about SKU catalogs, combines character-level TF-IDF with language-model embeddings. https://arxiv.org/abs/2401.00737
- Confidence (a model can be confidently wrong): Guo et al., "On Calibration of Modern Neural Networks" (ICML 2017). "Modern neural networks, unlike those from a decade ago, are poorly calibrated." https://arxiv.org/abs/1706.04599
- The human layer (abstain when unsure): Geifman and El-Yaniv, "Selective Classification for Deep Neural Networks" (NeurIPS 2017). Formalizes a reject option so a model declines low-confidence cases at a chosen risk level. https://arxiv.org/abs/1705.08500
- Evals (group failures into patterns): Grootendorst, "BERTopic: Neural topic modeling with a class-based TF-IDF procedure" (2022). The embed, cluster, label pipeline behind the macro-evals grouping. https://arxiv.org/abs/2203.05794
- Evals (applied worked example): OpenAI Cookbook, "Macro Evals for Agentic Systems," runnable notebook. Verified the page loads and matches the article (breadcrumb: openai-cookbook / examples / partners / macro_evals_for_agentic_systems). https://github.com/openai/openai-cookbook/blob/main/examples/partners/macro_evals_for_agentic_systems/macro_evals_for_agentic_systems.ipynb

Considered and verified but deliberately left off the References slide, kept at six sources by user choice: Karpukhin et al., "Dense Passage Retrieval for Open-Domain Question Answering" (EMNLP 2020). Dense retrieval outperforms BM25 by 9 to 19 percent top-20 accuracy. https://arxiv.org/abs/2004.04906. Real and checked, just not included, do not re-add without asking.

## Industry and product context (not research, kept separate on purpose)

These are real products and one primary vendor source. Useful as "this already runs in production" evidence, named inline in the slides, but not presented as research on the References slide.

- Conexiom (sales order automation for manufacturers and distributors), verified from conexiom.com. Multi-format extraction, ERP validation, and a Co-Pilot / Dynamic / Autopilot tiering that mirrors the confidence-and-human-review design.
- OpenAI Cookbook, "Macro Evals for Agentic Systems" (Kwatra, Thieme, Strauss, May 2026). The applied write-up that pointed to the BERTopic method above. https://developers.openai.com/cookbook/examples/partners/macro_evals_for_agentic_systems/macro_evals_for_agentic_systems

## 1. Extraction: LLMs turn messy text into structured fields, but output must be validated

- LLMs are strong at pulling structured fields out of free text (email, PDF, RFQ) from a prompt alone, no custom training needed.
- The consistent production warning: never trust raw model output. Validate every extracted field against a strict schema before anything downstream uses it. This is how you catch a hallucinated or malformed value.
- Reported accuracy on clean structured fields (dates, amounts, IDs) is high (roughly 90 to 98 percent) but depends heavily on document quality and format consistency.

Maps to page section: **Intake and extraction.** The LLM's real job here is structuring messy input. The prototype already shows this: "Kugellager 6205 2RS C3 40 Stk" becomes "Deep groove ball bearing 6205-2RS C3".

Sources:
- Unstract, "LLMs for Structured Data Extraction from PDFs in 2026" — https://unstract.com/blog/comparing-approaches-for-using-llms-for-structured-data-extraction-from-pdfs/
- Klearstack, "Extracting Data from Unstructured Text: NLP and LLM Guide 2026" — https://klearstack.com/blogs/extracting-data-from-unstructured-text-guide

## 2. Matching: hybrid search, not heavy RAG

- Real catalog and SKU search does not pick one method. It combines two searches and merges the results ("hybrid search"):
  - Exact / keyword (sparse) search catches SKU codes, part numbers, and rare identifiers. Embeddings alone are unreliable for exact IDs.
  - Semantic / embedding (dense) search catches items a customer describes in their own words without the SKU.
- Pure embeddings over-retrieve loosely related items and miss exact codes. Hybrid plus reranking outperforms either alone, and the advantage grows as the catalog gets larger.

Maps to page section: **Matching (the core).** This is the credible, non-hype version of "we use AI." Matching is mostly structured search over attributes (thread size, material, standard, unit) plus deterministic rules. The LLM's value is reasoning about *why* a line is ambiguous, not brute-forcing every match.

Sources:
- Redis, "Full-text search for RAG apps: BM25 and hybrid search" — https://redis.io/blog/full-text-search-for-rag-the-precision-layer/
- "Searching, fast and slow, through product catalogs" (arXiv 2401.00737) — https://arxiv.org/pdf/2401.00737

## 3. Confidence and the human layer: one score is not enough

- A single model confidence number is an unreliable signal on its own. A model can be confidently wrong.
- Stronger designs separate two signals: a trust score (is this a clean match) and a risk score (does this specific case have a red flag regardless of confidence).
- Calibrate the review threshold to the cost of failure, not to average accuracy.
- Key failure mode to name honestly: if the review bar is too loose, humans get flooded with escalations, fatigue sets in, and they start approving without really checking. At that point the "human review" step exists but is fake. So the handoff rule matters as much as the model.

Maps to page section: **Confidence and the human layer.** This supports the decision to drop a vanity accuracy dashboard: the human layer is the trust mechanism, not a headline percentage. Cite the prototype's resolve picker and the near-neighbor bearing case (multiple 6205 variants) and the low-detail motor case ("motor 24V gearbox small").

Sources:
- Redis, "AI Human in the Loop: Production Oversight Patterns" — https://redis.io/blog/ai-human-in-the-loop/
- MyEngineeringPath, "Human-in-the-Loop Patterns for AI Agents (2026)" — https://myengineeringpath.dev/genai-engineer/human-in-the-loop/

## 4. Evals: how you would watch this after launch (macro evals)

- Source is a real OpenAI Cookbook article: "Macro Evals for Agentic Systems," Shikhar Kwatra, Will Thieme, Bradley Strauss, published May 19, 2026. Verified by opening the page.
- Core idea: when a system runs at scale you cannot read every run. Two layers:
  - Lower-level evals grade each run against a short checklist of pass/fail questions (did the decision follow from the facts, was review proportionate to risk, was routing correct).
  - Macro evals look across many runs to find recurring problem patterns, instead of reading one trace at a time. The path is case_type to run_outcome to eval_finding to behavior_pattern.
- Honest caveats stated in the article and worth repeating on the page:
  - It is retrospective. It needs a population of completed runs (roughly 100 to 200+) before patterns mean anything. Not useful on day one.
  - The checklist is the ceiling. If a rubric never asks about a failure mode, the whole system stays blind to it.
  - "A high-impact behavior pattern is not automatically a defect." Patterns still need a human to interpret.

Maps to page section: **How you would know it works (evals over time).** This is the honest answer to "how do you measure trust" without faking a live metrics dashboard. It also connects to the candidate story (Harsh has done classification and eval work).

Source:
- OpenAI Cookbook, "Macro Evals for Agentic Systems" — https://developers.openai.com/cookbook/examples/partners/macro_evals_for_agentic_systems/macro_evals_for_agentic_systems

## 5. What still needs real data or a backend (our own reasoning, honestly labeled)

Not a cited claim, this is our product reasoning, and it absorbs the old "graceful degradation" task without faking broken UI:

- Real ERP write-back differs per system (SAP, Dynamics, NetSuite, legacy). The right sequence is: prove the matching engine against one real catalog, get a pilot customer, integrate deeply with their ERP, then generalize. This prototype deliberately stays at one clean illustrative flow.
- Failure states (document preview fails, matching service down, stale cached data) get real fallbacks once there is a backend that can actually fail. Faking broken states next to working ones would just confuse a reviewer, so we name them as known design work instead of mocking them.
- Matching your own inventory starts with connecting a catalog. The intake screen already discloses this in one line; the onboarding/setup view is where it becomes a real illustrated step.

## 6. Industry proof points: who already runs this in production

The point of this section is credibility. We are not inventing a new approach, we are copying what proven products already do. Each item ties to a page section so we can say "this already works at X."

### Conexiom (the closest match to Comena's space) — verified by opening conexiom.com

Conexiom does sales order automation for manufacturers and distributors, the same problem space as Comena. Verified claims from their site:

- Extracts order data from "PDF, Excel, email, CSV, even handwritten notes."
- "Validates against your ERP, auto-fixes errors, and normalizes formatting before orders enter your system."
- Three automation levels: **AI Co-Pilot** (teams review flagged issues before completion), **Dynamic AI** (automation configured to data accuracy), **AI Autopilot** (fully automated). This is the confidence-plus-human-review thesis in a shipping product.
- "No black boxes." Maps to our traceability point.
- Scale: "1B+ line items annually"; names Exxon Mobil, Arrow Electronics, Fastenal, Graybar as customers.

Maps to: extraction, normalization, confidence and the human layer, traceability. This is the single strongest proof point because the Co-Pilot / Dynamic / Autopilot tiering is exactly the "trust bar decides how much a human sees" idea we demonstrate with the confidence slider.

Source: https://conexiom.com/ (and labs.conexiom.com)

### Rossum and Nanonets (document extraction with human-in-the-loop) — from search results, not individually fetched

- Both extract fields from documents (invoices, orders), route low-confidence values to a human, and feed corrections back. Reported real-world accuracy roughly 90 to 93 percent.

Maps to: extraction and the human layer. Backs "the AI reads it, uncertain values go to a person."

Sources:
- Rossum — https://idp-software.com/vendors/rossum/
- Nanonets, "Automated Data Extraction for AI Workflows" — https://nanonets.com/blog/automated-data-extraction/

### Hybrid search is the production default — from search results, not individually fetched

- "Hybrid search has become the production default across OpenSearch, Elasticsearch, Weaviate, Vespa, and Qdrant." Combines sparse (keyword, exact IDs) and dense (semantic) retrieval, then reranks.

Maps to: matching. We can say hybrid search is the standard, not a bespoke idea.

Sources:
- Vespa blog, "Redefining Hybrid Search Possibilities with Vespa" — https://blog.vespa.ai/redefining-hybrid-search-possibilities-with-vespa/
- Netguru, "Hybrid Search Architecture" — https://www.netguru.com/blog/hybrid-search-architecture

### Honesty note on citation confidence

Conexiom and the OpenAI macro-evals article were verified by opening the page. The Rossum, Nanonets, and hybrid-search items come from search-result summaries with real URLs but were not each individually fetched. Fetch and re-confirm any specific number before putting it on the page as a hard claim.
