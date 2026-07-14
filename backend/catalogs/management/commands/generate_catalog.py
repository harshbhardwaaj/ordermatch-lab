"""Generates a ~10,000-item industrial catalog with the case's difficulties
built in on purpose.

Why generated and not downloaded: the public sample catalogs (Datablist's
10k products set, for one) are Faker word-salad — "Smart Fan Iron Cooker" in
category "Kids' Clothing", descriptions like "Catch enough role nearly." They
contain none of the things that actually make matching hard here. A matcher
that picks between nonsense proves nothing.

The three difficulties named in the brief are therefore engineered in:

1. Scale — ~10k active items, far past the point where you can hand the whole
   catalog to an LLM. This is what forces matching.blocking to exist.
2. Grade ladders — the same item at several materials/strengths, rising
   durability, rising price. "M8x40 hex bolt" legitimately matches four SKUs
   and only the customer knows which. This is what makes corrections necessary.
3. Supersession — a share of items are discontinued or replacement-available
   and still sit in the catalog next to the SKU that replaced them.

The 46 hand-authored items from the original seed are left completely alone:
the sample orders and their ground truth reference those SKUs and ids by hand,
so regenerating over them would quietly break the labelled eval set.
"""

from __future__ import annotations

import json
import random
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from catalogs.models import CatalogItem

# Deterministic: the same catalog every run, so a demo, an eval, and a bug
# report all talk about the same 10,000 rows.
SEED = 20260714

GENERATED_PREFIX = "gen-"

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "seed_data" / "generated_catalog.jsonl"
)

# Grade ladders. Ordered weakest to strongest, and price scales with position,
# which is exactly the "steigende Haltbarkeit, steigender Preis" from the brief.
# (code, short label used in the product name, full material text, price multiplier).
# The multiplier is the ladder: same bolt, tougher metal, higher price.
STEEL_GRADES = [
    ("ZN", "zinc", "zinc-plated steel", 1.0),
    ("88", "8.8", "grade 8.8 steel", 1.6),
    ("109", "10.9", "grade 10.9 steel", 2.2),
    ("A2", "A2", "A2 stainless steel", 2.4),
    ("129", "12.9", "grade 12.9 steel", 3.0),
    ("A4", "A4", "A4 marine stainless", 4.1),
]
ELASTOMERS = [
    ("NBR", "NBR", "NBR 70 nitrile", 1.0),
    ("EPDM", "EPDM", "EPDM 70", 1.4),
    ("SIL", "silicone", "silicone 70", 2.1),
    ("FKM", "FKM", "FKM 75 fluoroelastomer", 2.8),
]
BODY_MATERIALS = [
    ("PVC", "PVC", "PVC", 0.6),
    ("CS", "carbon steel", "carbon steel", 0.8),
    ("BRASS", "brass", "brass", 1.0),
    ("SS316", "stainless 316", "stainless 316", 2.6),
]

METRIC_THREADS = ["M3", "M4", "M5", "M6", "M8", "M10", "M12", "M16", "M20", "M24"]
LENGTHS = [10, 12, 16, 20, 25, 30, 35, 40, 50, 60, 70, 80, 100, 120, 140, 160, 180, 200]
DN_SIZES = ["DN08", "DN10", "DN15", "DN20", "DN25", "DN32", "DN40", "DN50", "DN65", "DN80"]
G_THREADS = ["G1/8", "G1/4", "G3/8", "G1/2", "G3/4", "G1"]
BEARING_BORES = ["6000", "6001", "6002", "6003", "6004", "6005", "6200", "6201", "6202",
                 "6203", "6204", "6205", "6206", "6207", "6300", "6301", "6302", "6303"]
SEAL_TYPES = [("2RS", "rubber sealed"), ("ZZ", "metal shielded"), ("OPEN", "open")]
CLEARANCES = ["C0", "C3", "C4"]
OR_SIZES = [(d, c) for d in [5, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 35, 40, 45, 50]
            for c in [1.5, 2, 2.5, 3, 4]]

MANUFACTURERS = ["Norvex", "Kellermann", "Baumgart Technik", "Ferrotek", "Weidmann Industrie",
                 "Stahlwerk Nord", "Prantl", "Hegemann", "Vossloh Components", "Reiter Präzision"]

# Each kind is stocked under more than one standard, because real distributors
# genuinely carry both and a customer writing "hex bolt M8x40" has told you
# nothing about which. Another axis of legitimate ambiguity, not padding.
FASTENER_KINDS = [
    ("HB", "Hex bolt", ["DIN 933", "ISO 4017"], 0.06),
    ("SC", "Socket cap screw", ["DIN 912", "ISO 4762"], 0.09),
    ("CS", "Countersunk screw", ["DIN 7991", "ISO 10642"], 0.08),
    ("HXF", "Hex flange bolt", ["DIN 6921"], 0.07),
    ("NUT", "Hex nut", ["ISO 4032", "DIN 934"], 0.03),
    ("WAS", "Flat washer", ["ISO 7089", "DIN 125"], 0.01),
    ("ROD", "Threaded rod", ["DIN 975"], 0.35),
]

VALVE_KINDS = [
    ("BALL", "Ball valve", 18.0),
    ("CHECK", "Check valve", 12.0),
    ("GATE", "Gate valve", 24.0),
    ("SOL", "Solenoid valve", 42.0),
    ("BFLY", "Butterfly valve", 31.0),
]

FITTING_KINDS = [
    ("ELB", "Elbow 90°", 3.4),
    ("TEE", "Tee", 4.2),
    ("CPL", "Coupling", 2.6),
    ("RED", "Reducer", 3.1),
    ("NIP", "Nipple", 2.2),
]

SENSOR_KINDS = [
    ("IND", "Inductive sensor", 26.0),
    ("CAP", "Capacitive sensor", 34.0),
    ("PHOTO", "Photoelectric sensor", 48.0),
    ("PRES", "Pressure sensor", 88.0),
    ("TEMP", "Temperature sensor", 62.0),
]


def _attrs(**kwargs) -> list[dict]:
    return [{"name": name, "value": str(value)} for name, value in kwargs.items() if value]


def _price(base: float, multiplier: float, jitter: random.Random) -> float:
    return round(base * multiplier * jitter.uniform(0.92, 1.12), 2)


def _fasteners(rng: random.Random) -> list[dict]:
    items = []
    for code, kind, standards, base in FASTENER_KINDS:
        for standard in standards:
            standard_code = standard.replace(" ", "")
            for thread in METRIC_THREADS:
                lengths = [None] if code in {"NUT", "WAS"} else LENGTHS
                for length in lengths:
                    for grade_code, grade_label, grade_name, multiplier in STEEL_GRADES:
                        size = f"{thread}x{length}" if length else thread
                        items.append(
                            {
                                "family": f"FAS-{code}-{size}-{standard_code}",
                                "grade_rank": multiplier,
                                "sku": f"OM-FAS-{code}-{size.upper()}-{grade_code}-{standard_code}",
                                "name": f"{kind} {size} {grade_label} {standard}",
                                "category": "fasteners",
                                "description": (
                                    f"{kind} {size} in {grade_name}, {standard}. "
                                    f"Thread {thread}"
                                    + (f", length {length} mm" if length else "")
                                    + "."
                                ),
                                "attributes": _attrs(
                                    thread=thread,
                                    length=f"{length} mm" if length else "",
                                    material=grade_name,
                                    standard=standard,
                                ),
                                "unit": "pcs",
                                "price": _price(base, multiplier, rng),
                            }
                        )
    return items


def _bearings(rng: random.Random) -> list[dict]:
    items = []
    for bore in BEARING_BORES:
        for seal_code, seal_name in SEAL_TYPES:
            for clearance in CLEARANCES:
                items.append(
                    {
                        "sku": f"OM-BRG-{bore}-{seal_code}-{clearance}",
                        "name": f"Deep groove ball bearing {bore}-{seal_code} {clearance}",
                        "category": "bearings",
                        "description": (
                            f"Deep groove ball bearing, bore series {bore}, "
                            f"{seal_name}, {clearance} internal clearance."
                        ),
                        "attributes": _attrs(
                            series=bore, seal=seal_name, clearance=clearance
                        ),
                        "unit": "pcs",
                        "price": _price(6.5, 1 + CLEARANCES.index(clearance) * 0.2, rng),
                    }
                )
    return items


def _seals(rng: random.Random) -> list[dict]:
    items = []
    for inner, cross in OR_SIZES:
        for mat_code, mat_label, mat_name, multiplier in ELASTOMERS:
            items.append(
                {
                    "family": f"SEA-OR-{inner}X{cross}",
                    "grade_rank": multiplier,
                    "sku": f"OM-SEA-OR-{inner}X{cross}-{mat_code}".replace(".", ""),
                    "name": f"O-ring {inner}x{cross} {mat_label}",
                    "category": "seals",
                    "description": (
                        f"O-ring, {inner} mm inner diameter, {cross} mm cross section, "
                        f"{mat_name}."
                    ),
                    "attributes": _attrs(
                        inner_diameter=f"{inner} mm",
                        cross_section=f"{cross} mm",
                        material=mat_name,
                    ),
                    "unit": "pcs",
                    "price": _price(0.35, multiplier, rng),
                }
            )
    return items


def _valves(rng: random.Random) -> list[dict]:
    items = []
    for code, kind, base in VALVE_KINDS:
        for dn in DN_SIZES:
            for mat_code, mat_label, mat_name, multiplier in BODY_MATERIALS:
                items.append(
                    {
                        "family": f"VAL-{code}-{dn}",
                        "grade_rank": multiplier,
                        "sku": f"OM-VAL-{code}-{dn}-{mat_code}",
                        "name": f"{kind} {dn} {mat_label}",
                        "category": "valves",
                        "description": (
                            f"{kind}, nominal bore {dn}, {mat_name} body."
                        ),
                        "attributes": _attrs(
                            type=kind.lower(), nominal_bore=dn, material=mat_name
                        ),
                        "unit": "pcs",
                        "price": _price(base, multiplier, rng),
                    }
                )
    return items


def _fittings(rng: random.Random) -> list[dict]:
    items = []
    for code, kind, base in FITTING_KINDS:
        for thread in G_THREADS:
            for mat_code, mat_label, mat_name, multiplier in BODY_MATERIALS:
                items.append(
                    {
                        "family": f"FIT-{code}-{thread}",
                        "grade_rank": multiplier,
                        "sku": f"OM-FIT-{code}-{thread.replace('/', '')}-{mat_code}",
                        "name": f"{kind} {thread} {mat_label}",
                        "category": "fittings",
                        "description": f"{kind} fitting, {thread} thread, {mat_name}.",
                        "attributes": _attrs(
                            type=kind.lower(), connection=thread, material=mat_name
                        ),
                        "unit": "pcs",
                        "price": _price(base, multiplier, rng),
                    }
                )
    return items


def _sensors(rng: random.Random) -> list[dict]:
    items = []
    for code, kind, base in SENSOR_KINDS:
        for body in ["M8", "M12", "M18", "M30"]:
            for output in ["PNP", "NPN"]:
                for contact in ["NO", "NC"]:
                    for distance in ["2mm", "4mm", "8mm"]:
                        items.append(
                            {
                                "sku": f"OM-SEN-{code}-{body}-{output}-{contact}-{distance.upper()}",
                                "name": f"{kind} {body} {output} {contact} {distance}",
                                "category": "sensors",
                                "description": (
                                    f"{kind}, {body} barrel, {output} output, "
                                    f"{contact} contact, {distance} sensing distance."
                                ),
                                "attributes": _attrs(
                                    body_size=body,
                                    output=output,
                                    contact=contact,
                                    sensing_distance=distance,
                                ),
                                "unit": "pcs",
                                "price": _price(base, 1.0, rng),
                            }
                        )
    return items


def _cables(rng: random.Random) -> list[dict]:
    items = []
    for connector in ["M8", "M12"]:
        for pins in [3, 4, 5, 8]:
            for length in [1, 2, 3, 5, 10, 15, 20]:
                for jacket in ["PUR", "PVC", "TPE"]:
                    items.append(
                        {
                            "sku": f"OM-CAB-{connector}-{pins}P-{jacket}-{length}M",
                            "name": f"{connector} sensor cable {pins}-pin {jacket} {length} m",
                            "category": "cables",
                            "description": (
                                f"{connector} sensor cable, {pins}-pin, {jacket} jacket, "
                                f"{length} m."
                            ),
                            "attributes": _attrs(
                                connector=connector,
                                pins=str(pins),
                                jacket=jacket,
                                length=f"{length} m",
                            ),
                            "unit": "pcs",
                            "price": _price(4.0 + length * 0.9, 1.0, rng),
                        }
                    )
    return items


def _motors(rng: random.Random) -> list[dict]:
    items = []
    for kw in ["0.18", "0.25", "0.37", "0.55", "0.75", "1.1", "1.5", "2.2", "3.0", "4.0", "5.5", "7.5"]:
        for mount in ["B3", "B5", "B14", "B34"]:
            for efficiency in ["IE2", "IE3", "IE4"]:
                for poles in ["2p", "4p"]:
                    items.append(
                        {
                            "sku": f"OM-MOT-3PH-{kw.replace('.', '')}KW-{mount}-{efficiency}-{poles.upper()}",
                            "name": f"Three-phase motor {kw} kW {mount} {efficiency} {poles}",
                            "category": "motors",
                            "description": (
                                f"Three-phase asynchronous motor, {kw} kW, {mount} mounting, "
                                f"{efficiency} efficiency class, {poles} poles."
                            ),
                            "attributes": _attrs(
                                power=f"{kw} kW",
                                mounting=mount,
                                efficiency=efficiency,
                                poles=poles,
                            ),
                            "unit": "pcs",
                            "price": _price(95.0 + float(kw) * 68, 1.0, rng),
                        }
                    )
    return items


BUILDERS = [_fasteners, _bearings, _seals, _valves, _fittings, _sensors, _cables, _motors]


class Command(BaseCommand):
    """Regenerates the catalog fixture. This is an authoring tool, not part of
    a deploy.

    The generated catalog is written to seed_data/generated_catalog.json and
    checked in, and `load_catalog` is what actually populates a database from
    it. That split matters:

    - SKUs become stable. Corrections, learned preferences and every
      context.md refer to catalog items by SKU. If the generator were re-run
      on each deploy and any list in this file were ever edited, SKUs would
      shift underneath a memory that points at them, and a customer's learned
      rules would quietly start referring to items that no longer exist.
    - The catalog outlives the database. Render's free Postgres is deleted 30
      days after creation; a file in the repo is not.
    - It can be read. A reviewer can open the fixture, diff it, and see
      exactly what the matcher is matching against.

    Regenerating deliberately (`--export`) is fine. Regenerating by accident,
    on every deploy, is what this prevents.
    """

    help = "Regenerate the catalog fixture (seed_data/generated_catalog.json). Authoring tool."

    def add_arguments(self, parser):
        parser.add_argument(
            "--export",
            action="store_true",
            help="Write the fixture to seed_data/generated_catalog.json (does not touch the database).",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete previously generated rows from the database first.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        rng = random.Random(SEED)

        if options["clear"]:
            deleted, _ = CatalogItem.objects.filter(id__startswith=GENERATED_PREFIX).delete()
            self.stdout.write(f"  cleared {deleted} previously generated items")

        # The hand-authored seed items own their SKUs. Never generate over one:
        # the sample orders and the labelled ground truth reference them by SKU.
        reserved_skus = set(
            CatalogItem.objects.exclude(id__startswith=GENERATED_PREFIX).values_list("sku", flat=True)
        )

        rows = []
        seen: set[str] = set()
        for build in BUILDERS:
            for row in build(rng):
                sku = row["sku"]
                if sku in reserved_skus or sku in seen:
                    continue
                seen.add(sku)
                rows.append(row)

        # Supersession: an item is retired but stays in the catalog, pointing at
        # the SKU that replaced it. This is "Produkte werden verbessert aber der
        # Vorgänger bleibt noch drin", and it is why a confident match can still
        # be the wrong SKU.
        #
        # The replacement is always the next grade UP within the same family
        # (same bolt, same size, same standard, tougher metal), because that is
        # how supersession actually happens. Replacing a hex bolt with a random
        # threaded rod, which an unconstrained pick does, is nonsense a reviewer
        # would spot instantly and would make the whole demo untrustworthy.
        by_family: dict[str, list[dict]] = {}
        for row in rows:
            if "family" in row:
                by_family.setdefault(row["family"], []).append(row)

        superseded_count = 0
        for siblings in by_family.values():
            if len(siblings) < 2:
                continue
            ladder = sorted(siblings, key=lambda r: r["grade_rank"])
            # Retire roughly one family in eight, and only ever a lower grade,
            # so there is always a stronger sibling to point at.
            if rng.random() > 0.12:
                continue
            index = rng.randrange(0, len(ladder) - 1)
            retired = ladder[index]
            replacement = ladder[index + 1]
            retired["status"] = rng.choice(["discontinued", "replacement-available"])
            retired["replacement_sku"] = replacement["sku"]
            superseded_count += 1

        # Flat, serializable records: the same shape whether they go straight to
        # the database or out to the fixture, so the two can never drift.
        records = [
            {
                "id": f"{GENERATED_PREFIX}{index:06d}",
                "sku": row["sku"],
                "name": row["name"],
                "category": row["category"],
                "description": row["description"],
                "manufacturer": rng.choice(MANUFACTURERS),
                "manufacturer_part_number": f"{rng.randint(10000, 99999)}-{rng.randint(100, 999)}",
                "attributes": row["attributes"],
                "default_unit": row["unit"],
                "price_amount": row["price"],
                "price_currency": "EUR",
                "status": row.get("status", "active"),
                "replacement_sku": row.get("replacement_sku", ""),
            }
            for index, row in enumerate(rows)
        ]

        if options["export"]:
            FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
            # JSON Lines: one compact item per line. Pretty-printed JSON was
            # 6.8 MB and a one-line change showed up as a rewrite of the whole
            # file; this is a third of the size and diffs one row at a time, so
            # a change to the generator is legible in review rather than a wall
            # of red.
            FIXTURE_PATH.write_text(
                "\n".join(
                    json.dumps(record, ensure_ascii=False, separators=(",", ":"))
                    for record in records
                )
                + "\n"
            )
            size_mb = FIXTURE_PATH.stat().st_size / 1_000_000
            self.stdout.write(
                self.style.SUCCESS(
                    f"Wrote {len(records)} items ({superseded_count} superseded) to "
                    f"{FIXTURE_PATH.name} ({size_mb:.1f} MB). "
                    f"Run `python manage.py load_catalog` to load it."
                )
            )
            return

        CatalogItem.objects.bulk_create(
            [CatalogItem(customer_part_numbers=[], **record) for record in records],
            batch_size=1000,
            ignore_conflicts=True,
        )

        total = CatalogItem.objects.count()
        active = CatalogItem.objects.filter(status="active").count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Generated {len(objects)} items ({superseded_count} superseded). "
                f"Catalog now holds {total} items, {active} active."
            )
        )
