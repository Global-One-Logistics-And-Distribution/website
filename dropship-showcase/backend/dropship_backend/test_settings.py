"""Test settings - uses SQLite to avoid requiring PostgreSQL in CI."""
from . import settings as base_settings

for name in dir(base_settings):
    if name.isupper():
        globals()[name] = getattr(base_settings, name)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
