from django.core.management import execute_from_command_line
from os import environ, path
from sys import argv

environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
current_path = path.dirname(path.abspath(__file__))
execute_from_command_line(argv)
