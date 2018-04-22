from backend.core.utils import Choices, Layer
from django.db import models

__all__ = [
    'Stream',
]


class Stream(models.Model):
    MODES = Choices('Empty', 'Once', 'Loop')

    title = models.CharField('title', max_length=50)
    preview = models.ImageField('preview', blank=True, null=True)
    media = None  # PK to media
    mode = models.CharField('mode', max_length=1, choices=MODES)
    start = models.IntegerField('start', blank=True, null=True)
    online = models.PositiveSmallIntegerField('online', default=0)

    class Meta:
        verbose_name = 'Stream'
        verbose_name_plural = 'Streams'

    __str__ = lambda self: 'Stream %s' % self.pk

    def save(self, **kwargs):
        if self.pk: Layer.group_send('stream-%s' % self.pk, {'type': 'update'})
        return super(Stream, self).save(**kwargs)
