from channels import asgi
from os import environ

environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.pro')
channel_layer = asgi.get_channel_layer()
