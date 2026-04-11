from django.db import migrations


def drop_redundant_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    drop_statements = [
        "DROP INDEX CONCURRENTLY IF EXISTS admin_logs_user_id_7cc6dd52;",
        "DROP INDEX CONCURRENTLY IF EXISTS auth_group_permissions_group_id_b120cbf9;",
        "DROP INDEX CONCURRENTLY IF EXISTS auth_permission_content_type_id_2f476e4b;",
        "DROP INDEX CONCURRENTLY IF EXISTS cart_items_user_id_74745f54;",
        "DROP INDEX CONCURRENTLY IF EXISTS order_items_order_id_412ad78b;",
        "DROP INDEX CONCURRENTLY IF EXISTS orders_user_id_7e2523fb;",
        "DROP INDEX CONCURRENTLY IF EXISTS products_is_active_4d0bbafa;",
        "DROP INDEX CONCURRENTLY IF EXISTS users_groups_user_id_f500bee5;",
        "DROP INDEX CONCURRENTLY IF EXISTS users_user_permissions_user_id_92473840;",
        "DROP INDEX CONCURRENTLY IF EXISTS wishlist_items_user_id_fb64a501;",
    ]

    with schema_editor.connection.cursor() as cursor:
        for statement in drop_statements:
            cursor.execute(statement)


def recreate_redundant_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    create_statements = [
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS admin_logs_user_id_7cc6dd52 ON admin_logs (user_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS auth_group_permissions_group_id_b120cbf9 ON auth_group_permissions (group_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS auth_permission_content_type_id_2f476e4b ON auth_permission (content_type_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS cart_items_user_id_74745f54 ON cart_items (user_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS order_items_order_id_412ad78b ON order_items (order_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS orders_user_id_7e2523fb ON orders (user_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS products_is_active_4d0bbafa ON products (is_active);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS users_groups_user_id_f500bee5 ON users_groups (user_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS users_user_permissions_user_id_92473840 ON users_user_permissions (user_id);",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS wishlist_items_user_id_fb64a501 ON wishlist_items (user_id);",
    ]

    with schema_editor.connection.cursor() as cursor:
        for statement in create_statements:
            cursor.execute(statement)


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("accounts", "0002_user_email_verification_code_and_more"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("cart", "0004_normalize_selected_size"),
        ("orders", "0006_alter_order_shipping_email_and_more"),
        ("products", "0003_product_size_stock"),
        ("wishlist", "0002_wishlistitem_wishlist_it_user_id_b5f68a_idx_and_more"),
    ]

    operations = [
        migrations.RunPython(drop_redundant_indexes, recreate_redundant_indexes),
    ]
