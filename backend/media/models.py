from backend.core.utils import Choices
from django.db import models

__all__ = [
    'Content',
    'Media',
]


class Content(models.Model):
    TYPES = Choices('Image', 'Audio', 'Video')

    def upload_to(self, filename): return '%s/%s' % (self.pk or 'temp', filename)

    type = models.CharField('type', max_length=1, choices=TYPES)
    file = models.FileField('file', blank=True, null=True, upload_to=upload_to)
    length = models.IntegerField('length', blank=True, null=True)

    class Meta:
        verbose_name = 'Content'
        verbose_name_plural = 'Contents'


class Media(models.Model):
    ALIGNS = Choices('Audio', 'Video')

    align = models.CharField('align', max_length=1, choices=ALIGNS)
    title = models.CharField('title', max_length=50)
    audio = models.ForeignKey(Content, models.CASCADE, 'medias_audio', verbose_name='audio', blank=True, null=True)
    video = models.ForeignKey(Content, models.CASCADE, 'medias_video', verbose_name='video', blank=True, null=True)

    @property
    def length(self):
        if self.align == self.ALIGNS.AUDIO:
            return self.audio or self.audio.length
        elif self.align == self.ALIGNS.VIDEO:
            return self.video or self.video.length

    class Meta:
        verbose_name = 'Media'
        verbose_name_plural = 'Medias'
