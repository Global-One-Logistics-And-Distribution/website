"""Test settings - uses PostgreSQL via DATABASE_URL."""
from . import settings as base_settings

for name in dir(base_settings):
    if name.isupper():
        globals()[name] = getattr(base_settings, name)
