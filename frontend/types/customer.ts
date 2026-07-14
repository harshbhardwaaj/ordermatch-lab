/** The per-customer match memory (backend: matching/memory.py). Every
 * decision a reviewer makes is logged against the customer whose order it
 * was, and future matching for that same customer reads it back. */

/** One row in the customer picker: who has taught the system anything. */
export type CustomerMemorySummary = {
  customerKey: string;
  customerName: string;
  /** Every decision, including the ones where the AI was already right. */
  totalDecisions: number;
  /** The subset where the reviewer overruled the AI. */
  corrections: number;
};

/** One logged decision — the raw history, in the reviewer's own words. */
export type CustomerCorrection = {
  id: string;
  requestText: string;
  suggestedSku: string;
  chosenSku: string;
  /** Set when the reviewer rejected every candidate and typed their own. */
  customLabel: string;
  /** Where the chosen SKU sat in the AI's ranking. 1 means the AI was right. */
  chosenRank?: number;
  wasCorrection: boolean;
  orderNumber: string;
  createdAt: string;
};

/** The derived lesson the matcher actually reads back. */
export type CustomerLearnedRule = {
  normalizedRequest: string;
  sku: string;
  timesChosen: number;
  timesRejected: number;
  /** Corrected to this SKU for this exact request, and never overruled since:
   * the next identical request skips the ranking argument entirely. */
  pinned: boolean;
};

export type CustomerMemory = {
  customerKey: string;
  customerName: string;
  totalDecisions: number;
  corrections: number;
  history: CustomerCorrection[];
  learnedRules: CustomerLearnedRule[];
};
