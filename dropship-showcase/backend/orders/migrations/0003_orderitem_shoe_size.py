# Generated migration for adding shoe_size field to OrderItem

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_order_orders_user_id_51663a_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='shoe_size',
            field=models.CharField(blank=True, default='', max_length=10),
        ),
    ]
