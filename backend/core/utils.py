from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils.text import slugify


class Choices:
    def __init__(self, *values):
        self.choices = {}
        for i, value in enumerate(values):
            db_value = str(i)
            const_value = value
            if isinstance(value, tuple):
                const_value, value = value
            self.choices[db_value] = value
            attr = slugify(const_value).replace('-', '_').upper()
            setattr(self, attr, db_value)

    def __iter__(self):
        items = sorted(self.choices.items(), key=lambda x: x[0])
        for i in items: yield i

    def __getitem__(self, item):
        return self.choices[item]


def get_object_safe(klass, *args, default=None, error=None, **kwargs):
    try:
        object = klass.objects.get(*args, **kwargs)
        return object
    except:
        if error is not None: raise error
        return default


def send_sync(channel, message):
    layer = get_channel_layer()
    sync = async_to_sync(layer.send)
    return sync(channel, message)
