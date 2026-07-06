"""Shared choice sets mirroring frontend/types/*.ts, kept in one place so
orders, catalogs, matching, onboarding, and evals models stay consistent
with each other without importing across app boundaries.
"""

from django.db import models


class UnitCode(models.TextChoices):
    PCS = "pcs", "pcs"
    EA = "ea", "ea"
    M = "m", "m"
    MM = "mm", "mm"
    CM = "cm", "cm"
    KG = "kg", "kg"
    G = "g", "g"
    L = "l", "l"
    SET = "set", "set"
    BOX = "box", "box"
    PACK = "pack", "pack"
    UNKNOWN = "unknown", "unknown"


class OrderSource(models.TextChoices):
    EMAIL = "email", "email"
    PDF = "pdf", "pdf"
    EXCEL = "excel", "excel"
    CSV = "csv", "csv"
    RFQ = "rfq", "rfq"
    RFQ_ATTACHMENT = "rfq-attachment", "rfq-attachment"
    PASTED_TEXT = "pasted-text", "pasted-text"
    MANUAL = "manual", "manual"
    SAMPLE = "sample", "sample"


class OrderStatus(models.TextChoices):
    NEW = "new", "new"
    EXTRACTED = "extracted", "extracted"
    REVIEW_NEEDED = "review-needed", "review-needed"
    BLOCKED = "blocked", "blocked"
    READY = "ready", "ready"
    ERP_READY = "erp-ready", "erp-ready"


class LineItemStatus(models.TextChoices):
    UNPROCESSED = "unprocessed", "unprocessed"
    NORMALIZED = "normalized", "normalized"
    MATCHED = "matched", "matched"
    REVIEW_NEEDED = "review-needed", "review-needed"
    BLOCKED = "blocked", "blocked"
    NO_MATCH = "no-match", "no-match"


class ExceptionCategory(models.TextChoices):
    MISSING_UNIT = "missing-unit", "missing-unit"
    AMBIGUOUS_SKU = "ambiguous-sku", "ambiguous-sku"
    LOW_CONFIDENCE = "low-confidence", "low-confidence"
    NO_CATALOG_MATCH = "no-catalog-match", "no-catalog-match"
    DISCONTINUED_ITEM = "discontinued-item", "discontinued-item"
    PRICE_MISMATCH = "price-mismatch", "price-mismatch"
    DUPLICATE_LINE = "duplicate-line", "duplicate-line"
    DELIVERY_AMBIGUITY = "delivery-ambiguity", "delivery-ambiguity"
    REQUIRED_ERP_FIELD_MISSING = (
        "required-erp-field-missing",
        "required-erp-field-missing",
    )


class ExceptionSeverity(models.TextChoices):
    INFO = "info", "info"
    REVIEW = "review", "review"
    BLOCKING = "blocking", "blocking"


class ExceptionStatus(models.TextChoices):
    OPEN = "open", "open"
    RESOLVED = "resolved", "resolved"
    IGNORED = "ignored", "ignored"


class ReadinessCheckStatus(models.TextChoices):
    PASSED = "passed", "passed"
    REVIEW_NEEDED = "review-needed", "review-needed"
    BLOCKED = "blocked", "blocked"
    UNAVAILABLE = "unavailable", "unavailable"


class CatalogItemStatus(models.TextChoices):
    ACTIVE = "active", "active"
    DISCONTINUED = "discontinued", "discontinued"
    REPLACEMENT_AVAILABLE = "replacement-available", "replacement-available"
    UNKNOWN = "unknown", "unknown"


class ConfidenceBand(models.TextChoices):
    """Backend-internal only. Never expose this as new frontend UI (no
    numeric badge, no confidence-band grid) — see clarifications.md §7.
    The frontend keeps using the existing two-signal model (clean match /
    risk flag), derived from comparing MatchCandidate.score against the
    active SetupConfiguration thresholds.
    """

    HIGH_CONFIDENCE = "high-confidence", "high-confidence"
    REVIEW_NEEDED = "review-needed", "review-needed"
    BLOCKED = "blocked", "blocked"
    NO_MATCH = "no-match", "no-match"


class MatchReasonKind(models.TextChoices):
    SIZE = "size", "size"
    MATERIAL = "material", "material"
    STANDARD = "standard", "standard"
    UNIT = "unit", "unit"
    CUSTOMER_PART_NUMBER = "customer-part-number", "customer-part-number"
    SYNONYM = "synonym", "synonym"
    CATALOG_ATTRIBUTE = "catalog-attribute", "catalog-attribute"
    PRICE = "price", "price"
    AVAILABILITY = "availability", "availability"


class MatchDecisionKind(models.TextChoices):
    ACCEPTED = "accepted", "accepted"
    REJECTED = "rejected", "rejected"
    DEFERRED = "deferred", "deferred"


class EvalRunStatus(models.TextChoices):
    NOT_STARTED = "not-started", "not-started"
    QUEUED = "queued", "queued"
    RUNNING = "running", "running"
    COMPLETE = "complete", "complete"
    FAILED = "failed", "failed"
    STALE = "stale", "stale"
    PARTIAL = "partial", "partial"


class EvalMetricKey(models.TextChoices):
    EXTRACTION_ACCURACY = "extraction-accuracy", "extraction-accuracy"
    SKU_TOP_1_ACCURACY = "sku-top-1-accuracy", "sku-top-1-accuracy"
    SKU_TOP_3_RECALL = "sku-top-3-recall", "sku-top-3-recall"
    HUMAN_CORRECTION_RATE = "human-correction-rate", "human-correction-rate"
    AUTO_APPROVAL_RATE = "auto-approval-rate", "auto-approval-rate"
    FALSE_CONFIDENT_MATCHES = "false-confident-matches", "false-confident-matches"
    EXCEPTION_CATEGORY_COUNT = "exception-category-count", "exception-category-count"
    ESTIMATED_TIME_SAVED = "estimated-time-saved", "estimated-time-saved"


class EvalMetricUnit(models.TextChoices):
    PERCENT = "percent", "percent"
    COUNT = "count", "count"
    MINUTES = "minutes", "minutes"


class EvalFailureSeverity(models.TextChoices):
    REVIEW = "review", "review"
    BLOCKING = "blocking", "blocking"
