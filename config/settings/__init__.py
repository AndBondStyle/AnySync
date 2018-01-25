from environ import Env

ENV = Env()
settings = ENV.str('DJANGO_SETTINGS_MODULE')
if settings == 'config.settings.dev': ENV.read_env('dev.env')
