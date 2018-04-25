from django.core.validators import RegexValidator
from .base import RemoteProvider


class YouTubeProvider(RemoteProvider):
    name = 'YouTube'
    slug = 'youtube'
    validators = [
        RegexValidator(
            r'^(?:https?:\/\/)?(?:m\.|www\.)?(?:youtu\.be\/|youtube\.com\/'
            r'(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((?:\w|-){11})(\?\S*)?$',
            message='Invalid YouTube URL'
        ),
    ]
