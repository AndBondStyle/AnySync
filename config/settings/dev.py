from . import ENV

# DEFAULTS

DEFAULTS = {
    'DJANGO_DEBUG': 'True',
    'DJANGO_ADMIN_URL': '^admin/',
    'DJANGO_SECRET_KEY': 'super-secret-key',
    'DJANGO_ALLOWED_HOSTS': '*',
    'SITE_URL': 'http://localhost',
    'DATABASE_URL': 'sqlite:///sqlite.db',
    'DJANGO_USE_AWS': 'False',
    'EMAIL_URL': 'filemail://',
    'VERSION': 'dev',
}

ENV.read_env(ENV.str('ENV_FILE', 'dev.env'), **DEFAULTS)

from .base import *

# SERVING

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'asgiref.inmemory.ChannelLayer',
        'ROUTING': 'config.routing.routing',
    },
}
