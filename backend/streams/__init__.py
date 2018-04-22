from django.apps import AppConfig


class Config(AppConfig):
    name = 'backend.streams'

    def ready(self):
        from .models import Stream
        Stream.objects.all().update(online=0)

default_app_config = 'backend.streams.Config'
