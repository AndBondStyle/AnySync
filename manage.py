from django.core.management import execute_from_command_line
from os import environ, path
import sys

environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
current_path = path.dirname(path.abspath(__file__))
sys.path.append(path.join(current_path, 'anysync'))
execute_from_command_line(sys.argv)
