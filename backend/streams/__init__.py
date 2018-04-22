from django.apps import AppConfig
from django.db import connection


class Config(AppConfig):
    name = 'backend.streams'

    def ready(self):
        from .models import Stream
        tables = connection.introspection.table_names()
        if 'streams_stream' not in tables: return
        Stream.objects.all().update(online=0)

default_app_config = 'backend.streams.Config'
