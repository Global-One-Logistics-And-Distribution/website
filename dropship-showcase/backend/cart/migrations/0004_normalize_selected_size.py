from django.db import migrations, models



def normalize_selected_size(apps, schema_editor):
    CartItem = apps.get_model("cart", "CartItem")
    CartItem.objects.filter(selected_size__isnull=True).update(selected_size="")


class Migration(migrations.Migration):

    dependencies = [
        ("cart", "0003_cartitem_selected_size"),
    ]

    operations = [
        migrations.RunPython(normalize_selected_size, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="cartitem",
            name="selected_size",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
    ]
