"""The embedding column becomes raw float32 bytes instead of a JSON array.

Dropped and re-added rather than altered in place: Postgres has no cast from
jsonb to bytea, so an AlterField would fail on deploy. The vectors are the one
thing in this database that is safe to throw away — embed_catalog re-buys every
item that has no vector, which is about $0.006 for the whole 10k catalog and one
extra minute on the next build. Nothing else references them.

Why it is worth a migration at all: as JSON, a vector comes back from the driver
as 384 boxed Python floats, so building the semantic index allocated ~3.9 million
float objects and cost 86 MB of resident memory to produce a 15 MB matrix. The
allocator never returned it. On Render's 512 MB free instance that was most of
the reason the worker got SIGKILLed on the first pasted order.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogs", "0002_catalogitem_embedding_catalogitem_embedding_hash"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="catalogitem",
            name="embedding",
        ),
        migrations.AddField(
            model_name="catalogitem",
            name="embedding",
            field=models.BinaryField(blank=True, null=True),
        ),
    ]
