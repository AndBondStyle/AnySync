from . import ENV

# DEFAULTS

ENV.ENVIRON.setdefault('ENV_FILE', 'dev.env')

ENV.ENVIRON.setdefault('DJANGO_DEBUG', 'True')
ENV.ENVIRON.setdefault('DJANGO_ADMIN_URL', '^admin/')
ENV.ENVIRON.setdefault('DJANGO_SECRET_KEY', 'super-secret-key')
ENV.ENVIRON.setdefault('DJANGO_ALLOWED_HOSTS', '*')
ENV.ENVIRON.setdefault('SITE_URL', 'http://localhost')

ENV.ENVIRON.setdefault('DATABASE_URL', 'sqlite:///sqlite.db')
ENV.ENVIRON.setdefault('DJANGO_USE_AWS', 'False')
ENV.ENVIRON.setdefault('EMAIL_URL', 'consolemail://')

from .base import *

# SERVING

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'asgiref.inmemory.ChannelLayer',
        'ROUTING': 'config.routing.routing',
    },
}
