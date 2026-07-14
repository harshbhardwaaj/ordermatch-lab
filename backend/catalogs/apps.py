from django.apps import AppConfig


class CatalogsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "catalogs"

    def ready(self):
        """Any write to a catalog item drops the cached catalog and the indexes
        built from it (catalogs.snapshot). Without this, holding the catalog
        across requests would be a correctness bug waiting for the first person
        to edit an item.
        """
        from django.db.models.signals import post_delete, post_save

        from .models import CatalogItem
        from .snapshot import invalidate

        post_save.connect(invalidate, sender=CatalogItem, dispatch_uid="catalog-snapshot")
        post_delete.connect(invalidate, sender=CatalogItem, dispatch_uid="catalog-snapshot")
