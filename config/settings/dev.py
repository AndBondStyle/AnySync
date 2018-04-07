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

# AMAZON S3

if ENV.bool('DJANGO_USE_AWS'):
    from storages.backends.s3boto3 import S3Boto3Storage

    StaticStorage = type('StaticStorage', (S3Boto3Storage,), {'location': STATIC_LOCATION})
    MediaStorage = type('MediaStorage', (S3Boto3Storage,), {'location': MEDIA_LOCATION, 'file_overwrite': False})

    STATICFILES_STORAGE = 'config.settings.dev.StaticStorage'
    DEFAULT_FILE_STORAGE = 'config.settings.dev.MediaStorage'
