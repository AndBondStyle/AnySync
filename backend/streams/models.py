from backend.core.utils import Choices, layer
from django.db import models


class Stream(models.Model):
    MODES = Choices('Empty', 'Once', 'Loop')

    title = models.CharField('title', max_length=50)
    slug = models.SlugField()
    preview = models.ImageField('preview', blank=True, null=True, default='default.png')
    media = None  # PK to media
    mode = models.CharField('mode', max_length=1, choices=MODES)
    start = models.DateTimeField('start', blank=True, null=True)
    static = models.BooleanField('static', default=False)

    def save(self, **kwargs):
        if self.pk: layer.group_send('stream-%s' % self.pk, {'type': 'update'})
        return super(Stream, self).save(**kwargs)
