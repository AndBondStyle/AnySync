from . import ENV

# DEFAULTS

DEFAULTS = {
    'DJANGO_DEBUG': 'False',
    'DJANGO_USE_AWS': 'True',
    'VERSION': ENV.str('HEROKU_RELEASE_VERSION', 'pro'),
}

ENV_FILE = ENV.str('ENV_FILE', None)
if ENV_FILE is not None: ENV.read_env(ENV_FILE)
for key, value in DEFAULTS.items(): ENV.ENVIRON.setdefault(key, value)

from .base import *

# AMAZON S3

if ENV.bool('DJANGO_USE_AWS'):
    from storages.backends.s3boto3 import S3Boto3Storage

    StaticStorage = type('StaticStorage', (S3Boto3Storage,), {'location': STATIC_LOCATION})
    MediaStorage = type('MediaStorage', (S3Boto3Storage,), {'location': MEDIA_LOCATION, 'file_overwrite': False})

    STATICFILES_STORAGE = 'config.settings.pro.StaticStorage'
    DEFAULT_FILE_STORAGE = 'config.settings.pro.MediaStorage'

# SECURITY

SECURE_HSTS_SECONDS = 3600
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SECURE_SSL_REDIRECT = True
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
X_FRAME_OPTIONS = 'DENY'

# CACHING

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': ENV.str('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'IGNORE_EXCEPTIONS': True,
            'DB': 0,
        }
    }
}

# SERVING

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [ENV.str('REDIS_URL') + '/1'],
        },
    },
}

# RAVEN & SENTRY

INSTALLED_APPS += ['raven.contrib.django.raven_compat']
RAVEN_MIDDLEWARE = ['raven.contrib.django.raven_compat.middleware.SentryResponseErrorIdMiddleware']
MIDDLEWARE = RAVEN_MIDDLEWARE + MIDDLEWARE

SENTRY_CLIENT = 'raven.contrib.django.raven_compat.DjangoClient'
RAVEN_CONFIG = {
    'dsn': ENV.str('SENTRY_DSN'),
    'release': VERSION,
}
