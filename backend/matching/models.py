from django.db import models

from common.choices import ConfidenceBand, MatchDecisionKind


class MatchCandidate(models.Model):
    """Mirrors frontend/types/match.ts MatchCandidate.

    confidence_band and score are backend-internal (see
    common.choices.ConfidenceBand docstring and clarifications.md §7):
    real matching/confidence work in Phase 13 computes these for real and
    compares score against the active SetupConfiguration thresholds to
    decide routing, but neither is new frontend UI. The frontend keeps
    using the existing two-signal model (clean match / risk flag).
    """

    id = models.CharField(primary_key=True, max_length=64)
    line_item = models.ForeignKey(
        "orders.OrderLineItem", related_name="match_candidates", on_delete=models.CASCADE
    )
    catalog_item = models.ForeignKey(
        "catalogs.CatalogItem",
        related_name="match_candidates",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    sku = models.CharField(max_length=128, blank=True)
    confidence_band = models.CharField(max_length=32, choices=ConfidenceBand.choices)
    score = models.FloatField(null=True, blank=True)
    rank = models.PositiveIntegerField()
    proof_items = models.JSONField(default=list, blank=True)
    missing_evidence = models.JSONField(default=list, blank=True)
    conflicting_evidence = models.JSONField(default=list, blank=True)
    requires_human_review = models.BooleanField(default=False)

    # What this customer's own past corrections said about this SKU, and so
    # why it sits where it does in the ranking (see matching.memory). Unlike
    # score/confidence_band this IS frontend-facing: a system that silently
    # re-ranks is one a reviewer stops trusting, so whenever memory moved a
    # candidate the picker says so out loud.
    # {"timesChosen": int, "timesRejected": int, "pinned": bool} or {}.
    learned_signal = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["line_item", "rank"]

    def __str__(self) -> str:
        return f"{self.line_item_id} candidate #{self.rank} ({self.sku})"


class MatchDecision(models.Model):
    """Mirrors frontend/types/match.ts MatchDecision, extended with
    custom_label (T107): the real resolve-or-defer picker
    (frontend/components/product/match-pick-list.tsx) also supports a
    free-text "type the correct match" override with no real candidate at
    all (resolveWithCustomAnswer in order-processing.tsx / order-summary.tsx),
    so candidate must be nullable to record that path.
    """

    candidate = models.ForeignKey(
        MatchCandidate,
        related_name="decisions",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
    )
    custom_label = models.CharField(max_length=255, blank=True)
    line_item = models.ForeignKey(
        "orders.OrderLineItem", related_name="decisions", on_delete=models.CASCADE
    )
    decision = models.CharField(max_length=16, choices=MatchDecisionKind.choices)
    decided_at = models.DateTimeField()
    note = models.TextField(blank=True)
    is_simulated = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.line_item_id} -> {self.decision}"


class CustomerCorrection(models.Model):
    """Append-only log: every match decision a reviewer made for a given
    customer, including the ones where the AI was already right.

    This is the raw record, kept separate from CustomerPreference (the
    aggregate the matcher actually reads) on purpose. The aggregate is a
    derived cache — it can be rebuilt from this log at any time if the
    scoring weights change, and it can be shown to the reviewer as a
    plain history ("on 2 July you changed this to A4"). Throwing the log
    away and keeping only counts would make both impossible.

    Scoped by (demo_session_id, customer_key) so one visitor's teaching
    never leaks into another's, and one customer's preferences never leak
    into another customer's — "M8 bolt, standard" means A2 to one buyer
    and A4 to the next, and a global memory would average that into
    something wrong for both.
    """

    id = models.CharField(primary_key=True, max_length=64)
    demo_session_id = models.CharField(max_length=40, blank=True, default="", db_index=True)
    customer_key = models.CharField(max_length=128, db_index=True)
    customer_name = models.CharField(max_length=255)

    # What the customer actually wrote, and its normalized form — the key an
    # exact repeat is recognized by (see matching.memory.normalize_request_text).
    request_text = models.TextField()
    normalized_request = models.CharField(max_length=255, db_index=True)

    suggested_sku = models.CharField(max_length=128, blank=True)
    chosen_sku = models.CharField(max_length=128, blank=True)
    # Free-text override: the reviewer rejected every candidate offered.
    # Nothing to boost, but very much worth recording — a repeat here is the
    # strongest possible signal of a catalog gap.
    custom_label = models.CharField(max_length=255, blank=True)
    # Where the chosen SKU sat in the AI's ranking. 1 means the AI was right.
    chosen_rank = models.PositiveIntegerField(null=True, blank=True)
    was_correction = models.BooleanField(default=False)

    order = models.ForeignKey(
        "orders.OrderRecord", related_name="corrections", null=True, blank=True, on_delete=models.SET_NULL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["demo_session_id", "customer_key"])]

    def __str__(self) -> str:
        return f"{self.customer_key}: {self.normalized_request} -> {self.chosen_sku or self.custom_label}"


class CustomerContextFile(models.Model):
    """A short markdown brief about one customer, written by an agent from that
    customer's correction log, and handed to the matcher as context.

    This is the semantic half of the memory. CustomerPreference is the
    deterministic half: it knows that this exact wording maps to that exact
    SKU, and it re-ranks instantly and for free. What it cannot hold is *why* —
    "Vogt builds for coastal sites, so they want marine-grade A4 and zinc is
    never acceptable" — and a reason generalizes to line items the counters
    have never seen.

    Why a written file rather than stuffing every correction into the prompt:

    - Cost. The correction log grows without limit. A customer with 300
      corrections would mean 300 examples in every prompt, forever. The file is
      compacted, bounded (TARGET_TOKENS), and rewritten rather than appended,
      so prompt cost stays flat no matter how long the customer has been with
      you. Deciding what is worth keeping is the agent's actual job.
    - Trust. A rep can read it. They can also fix it: `edited_by_human` marks a
      file the agent must not silently overwrite, because a person correcting
      the memory is the most reliable signal in the whole system, and throwing
      that away on the next rebuild would be the fastest way to lose them.
    """

    demo_session_id = models.CharField(max_length=40, blank=True, default="", db_index=True)
    customer_key = models.CharField(max_length=128, db_index=True)
    customer_name = models.CharField(max_length=255)

    content = models.TextField(blank=True)
    # How many corrections the current content was distilled from, so the UI can
    # say "3 new corrections since this was written" instead of guessing.
    built_from_corrections = models.PositiveIntegerField(default=0)
    edited_by_human = models.BooleanField(default=False)
    generated_by = models.CharField(max_length=32, default="agent")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("demo_session_id", "customer_key")]

    def __str__(self) -> str:
        return f"context.md for {self.customer_key}"


class CustomerPreference(models.Model):
    """The aggregate the matcher reads: for one customer and one normalized
    request, how often each SKU was chosen and how often it was rejected in
    favour of something else.

    Two signals come out of this, deliberately different in strength:

    - times_chosen / times_rejected nudge a candidate up or down the
      ranking. A nudge, not a verdict: one correction is evidence, not law.
    - pinned means this exact request text was corrected to this SKU
      before, so the same text arriving again is not re-litigated — it goes
      straight to the top. This is what makes the loop feel like it learned
      rather than merely leaned.
    """

    demo_session_id = models.CharField(max_length=40, blank=True, default="", db_index=True)
    customer_key = models.CharField(max_length=128, db_index=True)
    normalized_request = models.CharField(max_length=255)
    sku = models.CharField(max_length=128)

    times_chosen = models.PositiveIntegerField(default=0)
    times_rejected = models.PositiveIntegerField(default=0)
    last_seen_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-times_chosen", "sku"]
        unique_together = [("demo_session_id", "customer_key", "normalized_request", "sku")]
        indexes = [models.Index(fields=["demo_session_id", "customer_key", "normalized_request"])]

    @property
    def pinned(self) -> bool:
        """Chosen for this exact request before, and never overruled since."""
        return self.times_chosen > 0 and self.times_rejected == 0

    def __str__(self) -> str:
        return f"{self.customer_key}/{self.normalized_request}: {self.sku} +{self.times_chosen}/-{self.times_rejected}"
