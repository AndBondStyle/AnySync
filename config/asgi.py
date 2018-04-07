from channels.routing import get_default_application
from os import environ
import django

environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.pro')
django.setup()
application = get_default_application()
