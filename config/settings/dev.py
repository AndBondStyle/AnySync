from .base import *

# GENERAL

DEBUG = ENV.bool('DJANGO_DEBUG', True)
ADMIN_URL = '^admin/'
SECRET_KEY = 'super-secret-key'
ALLOWED_HOSTS = ['*']
SITE_URL = 'http://localhost'

# SERVING

STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'asgiref.inmemory.ChannelLayer',
        'ROUTING': 'config.routing.routing',
    },
}
