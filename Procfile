web: daphne -b 0.0.0.0 -p $PORT config.asgi:application
worker: python manage.py runworker core
release: python manage.py migrate
