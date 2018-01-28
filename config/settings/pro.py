from . import ENV

# DEFAULTS

ENV.ENVIRON.setdefault('DJANGO_DEBUG', True)
ENV.ENVIRON.setdefault('DJANGO_ADMIN_URL', '^admin/')
ENV.ENVIRON.setdefault('DJANGO_SECRET_KEY', 'super-secret-key')
ENV.ENVIRON.setdefault('DJANGO_ALLOWED_HOSTS', '*')
ENV.ENVIRON.setdefault('SITE_URL', 'http://localhost')

ENV.ENVIRON.setdefault('DATABASE_URL', 'sqlite:///sqlite.db')
ENV.ENVIRON.setdefault('DJANGO_USE_AWS', False)
ENV.ENVIRON.setdefault('EMAIL_URL', 'filemail://')

from .base import *

# EXTRA APPS & MIDDLEWARE

INSTALLED_APPS += ['raven.contrib.django.raven_compat']
RAVEN_MIDDLEWARE = ['raven.contrib.django.raven_compat.middleware.SentryResponseErrorIdMiddleware']
MIDDLEWARE = RAVEN_MIDDLEWARE + MIDDLEWARE

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

REDIS_LOCATION = ENV.str('REDIS_URL') + '/0'

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_LOCATION,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'IGNORE_EXCEPTIONS': True,
        }
    }
}

# SERVING

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'asgi_redis.RedisChannelLayer',
        'ROUTING': 'config.routing.routing',
        'CONFIG': {
            'hosts': [REDIS_LOCATION],
        },
    },
}

# RAVEN & SENTRY

SENTRY_CLIENT = 'raven.contrib.django.raven_compat.DjangoClient'
RAVEN_CONFIG = {
    'dsn': ENV.str('SENTRY_DSN'),
    'release': VERSION,
}
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'root': {
        'level': 'WARNING',
        'handlers': ['sentry'],
    },
    'formatters': {
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s',
        },
        'simple': {
            'format': '%(levelname)s %(message)s'
        },
    },
    'handlers': {
        'sentry': {
            'level': 'ERROR',
            'class': 'raven.contrib.django.raven_compat.handlers.SentryHandler',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        }
    },
    'loggers': {
        'django.db.backends': {
            'level': 'ERROR',
            'handlers': ['console'],
            'propagate': False,
        },
        'raven': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'sentry.errors': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
    },
}
