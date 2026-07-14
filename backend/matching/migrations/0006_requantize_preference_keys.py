"""Re-key existing learned preferences now that the quantity is not part of the key.

normalized_request is computed when a correction is recorded and stored, so
changing the normalizer only affects new writes. Every preference taught before
this migration is still filed under a key with the order quantity in it
("200x sechskantschraube m8x40 inox"), and would never be found again by a
reorder of a different count. This walks them forward.

Two rows can collide once the quantity is gone: the same customer corrected the
same request text at two different quantities, which used to be two rows and is
now one. They are merged rather than dropped, because both were the reviewer
saying the same thing and the counts are evidence.

Reversing this cannot restore the quantities (they are not recorded anywhere
else), so the backward migration is a no-op rather than a lie.
"""

from django.db import migrations


def rekey(apps, schema_editor):
    CustomerPreference = apps.get_model("matching", "CustomerPreference")

    # Imported here, not at module scope: this is application code, and a
    # migration that reaches into it at import time breaks when that code moves.
    from matching.memory import normalize_request_text

    survivors = {}
    for pref in CustomerPreference.objects.all().order_by("id"):
        key = (pref.demo_session_id, pref.customer_key, normalize_request_text(pref.normalized_request), pref.sku)
        winner = survivors.get(key)

        if winner is None:
            pref.normalized_request = key[2]
            pref.save(update_fields=["normalized_request"])
            survivors[key] = pref
            continue

        # Same customer, same request once the count is stripped, same SKU:
        # one preference taught twice. Fold the evidence together.
        winner.times_chosen += pref.times_chosen
        winner.times_rejected += pref.times_rejected
        winner.pinned = winner.pinned or pref.pinned
        winner.save(update_fields=["times_chosen", "times_rejected", "pinned"])
        pref.delete()


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("matching", "0005_customercontextfile"),
    ]

    operations = [
        migrations.RunPython(rekey, noop),
    ]
