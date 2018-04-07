from channels.routing import get_default_application
from os import environ

environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.pro')
application = get_default_application()
