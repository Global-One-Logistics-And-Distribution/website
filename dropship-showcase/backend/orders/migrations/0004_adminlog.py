# Generated migration for AdminLog model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('orders', '0003_orderitem_shoe_size'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdminLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('product_create', 'Product Created'), ('product_update', 'Product Updated'), ('product_delete', 'Product Deleted'), ('order_create', 'Order Created'), ('order_update', 'Order Updated'), ('order_status_change', 'Order Status Changed'), ('user_create', 'User Created'), ('user_update', 'User Updated'), ('user_delete', 'User Deleted')], max_length=50)),
                ('target_model', models.CharField(blank=True, default='', max_length=50)),
                ('target_id', models.PositiveIntegerField(blank=True, null=True)),
                ('description', models.TextField(blank=True, default='')),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='admin_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'admin_logs',
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='adminlog',
            index=models.Index(fields=['user', 'timestamp'], name='admin_logs_user_id_0e1821_idx'),
        ),
        migrations.AddIndex(
            model_name='adminlog',
            index=models.Index(fields=['action', 'timestamp'], name='admin_logs_action_15c41c_idx'),
        ),
        migrations.AddIndex(
            model_name='adminlog',
            index=models.Index(fields=['target_model', 'target_id'], name='admin_logs_target__bdb4cb_idx'),
        ),
    ]
