from django.db import migrations


def drop_legacy_row_and_fix_sequence(apps, schema_editor):
    """seed_sample_data used to create one global SetupConfiguration row
    with an explicit id=1 (back when this was a singleton, pre-demo-session
    scoping). That explicit-id insert never advanced Postgres's id
    sequence, so the very first session-scoped row created through the
    ORM's normal auto-increment path collides with it (duplicate key on
    id=1) — a real crash found by testing the demo-session feature
    end-to-end, not a hypothetical. That legacy row is unused dead data
    now (every session creates and reads its own row via demo_session_id,
    see onboarding.views.SetupConfigurationViewSet), so this drops it and
    resets the sequence to a safe value in one pass.
    """
    SetupConfiguration = apps.get_model("onboarding", "SetupConfiguration")
    SetupConfiguration.objects.filter(demo_session_id="").delete()

    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            "SELECT setval("
            "  pg_get_serial_sequence('onboarding_setupconfiguration', 'id'),"
            "  COALESCE((SELECT MAX(id) FROM onboarding_setupconfiguration), 1),"
            "  (SELECT MAX(id) FROM onboarding_setupconfiguration) IS NOT NULL"
            ")"
        )


class Migration(migrations.Migration):
    dependencies = [
        ("onboarding", "0002_setupconfiguration_demo_session_id"),
    ]

    operations = [
        migrations.RunPython(
            drop_legacy_row_and_fix_sequence, reverse_code=migrations.RunPython.noop
        ),
    ]
