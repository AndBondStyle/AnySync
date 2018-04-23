from . import ENV
from environ import Path

# GENERAL

ROOT_DIR = Path(__file__) - 3
APPS_DIR = ROOT_DIR.path('backend')
TEMP_DIR = ROOT_DIR.path('temp')

ROOT_URLCONF = 'config.routing'
ASGI_APPLICATION = 'config.routing.application'

DEBUG = ENV.bool('DJANGO_DEBUG')
ADMIN_URL = ENV.str('DJANGO_ADMIN_URL')
SECRET_KEY = ENV.str('DJANGO_SECRET_KEY')
ALLOWED_HOSTS = ENV.list('DJANGO_ALLOWED_HOSTS')
SITE_URL = ENV.str('SITE_URL', ALLOWED_HOSTS[0])
VERSION = ENV.str('VERSION')

DATABASES = {'default': ENV.db('DATABASE_URL')}
DATABASES['default']['ATOMIC_REQUESTS'] = True

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {'hosts': [ENV.str('REDIS_URL')]},
    }
}

TIME_ZONE = ENV.str('TZ', 'UTC')
USE_I18N = False
USE_L10N = False
USE_TZ = False

# APPS

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',

    'channels',
    'widget_tweaks',
    'sorl.thumbnail',

    'backend.core',
    'backend.accounts',
    'backend.media',
    'backend.streams',
]

# MIDDLEWARE

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# TEMPLATES

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            str(ROOT_DIR.path('frontend', 'templates')),
        ],
        'OPTIONS': {
            'debug': DEBUG,
            'libraries': {
                'core.tags': 'backend.core.tags',
            },
            'loaders': [
                'django.template.loaders.filesystem.Loader',
                'django.template.loaders.app_directories.Loader',
            ],
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# STATIC & MEDIA

STATIC_URL = '/static/'
STATIC_LOCATION = 'static'
STATIC_ROOT = str(ROOT_DIR.path('static'))
STATICFILES_DIRS = [str(ROOT_DIR.path('frontend', 'static'))]

MEDIA_URL = '/media/'
MEDIA_LOCATION = 'media'
MEDIA_ROOT = str(ROOT_DIR.path('frontend', 'media'))

# AMAZON S3

if ENV.bool('DJANGO_USE_AWS'):
    AWS_STORAGE_BUCKET_NAME = ENV('AWS_BUCKET_NAME')
    AWS_S3_REGION_NAME = ENV('AWS_REGION_NAME')
    AWS_ACCESS_KEY_ID = ENV('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = ENV('AWS_SECRET_ACCESS_KEY')
    AWS_QUERYSTRING_AUTH = False

# PASSWORDS

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
    'django.contrib.auth.hashers.BCryptPasswordHasher',
]

AUTH_PASSWORD_VALIDATORS = [
    # {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    # {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    # {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    # {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# EMAIL

EMAIL_CONFIG = ENV.email('EMAIL_URL')

EMAIL_BACKEND = EMAIL_CONFIG.get('EMAIL_BACKEND')
EMAIL_HOST = EMAIL_CONFIG.get('EMAIL_HOST')
EMAIL_PORT = EMAIL_CONFIG.get('EMAIL_PORT')
EMAIL_HOST_USER = EMAIL_CONFIG.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = EMAIL_CONFIG.get('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = EMAIL_CONFIG.get('EMAIL_USE_TLS', False)
EMAIL_FILE_PATH = str(ROOT_DIR.path('emails'))

DEFAULT_FROM_EMAIL = '"AnySync" <{}>'.format(EMAIL_HOST_USER)

# MISC

AUTH_USER_MODEL = 'accounts.User'
AUTHENTICATION_BACKENDS = ['backend.accounts.backends.DualAuthBackend']
AUTH_LOGIN_URL = '/accounts/auth/'
LOGIN_REDIRECT_URL = '/home/'

AUTOSLUG_SLUGIFY_FUNCTION = 'slugify.slugify'

from django.contrib.messages import constants as messages

MESSAGE_TAGS = {
    messages.DEBUG: 'alert-info',
    messages.INFO: 'alert-info',
    messages.SUCCESS: 'alert-success',
    messages.WARNING: 'alert-warning',
    messages.ERROR: 'alert-danger',
}
