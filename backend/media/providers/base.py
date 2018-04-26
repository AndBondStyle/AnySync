from django.core.files.storage import default_storage
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from urllib.parse import urlsplit, unquote
from sorl.thumbnail import get_thumbnail
from tempfile import NamedTemporaryFile
from ffmpy import FFmpeg, FFprobe
from django.conf import settings
from magic import from_buffer
from subprocess import PIPE
import requests

TEMP_DIR = str(settings.TEMP_DIR)


class RemoteProvider:
    name = 'RemoteProvider'
    slug = 'remote'

    @staticmethod
    def make_thumbnail(file, geometry):
        remote = default_storage.save('temp', file)
        image = get_thumbnail(remote, geometry, crop='center')
        return image

    @staticmethod
    def crop_video(file, start=None, end=None):
        pass

    def __init__(self, value, **options):
        self.value = value
        self.options = options
        self.url = None
        self.file = None
        self.audio = None
        self.video = None
        self.type = None
        self.title = None
        self.preview = None
        self.length = None

    def check(self):
        validator = URLValidator(
            schemes=['http', 'https'],
            message='Provided value is not valid URL',
        )
        validator(self.value)
        self.url = self.value

    def parse(self):
        yield from self.check_source()
        yield from self.download()
        yield from self.check_file()
        yield from self.process()

    def check_source(self):
        yield 'Checking source...'
        res = requests.head(self.url)
        if res.status_code != 200: raise ValidationError('Download error')
        size = res.headers.get('content-length')
        if size is None or not size.isdigit(): raise ValidationError('Download error')
        if int(size) > settings.SOURCE_MAX_SIZE: raise ValidationError('Source file too large')

    def download(self):
        yield 'Downloading...'
        res = requests.get(self.url, stream=True)
        if res.status_code != 200: raise ValidationError('Download error')
        self.file = NamedTemporaryFile(dir=TEMP_DIR)
        for size, chunk in enumerate(res, 1):
            self.file.write(chunk)
            if 128 * size >= settings.SOURCE_MAX_SIZE:
                raise ValidationError('Source file too large')

    def check_file(self):
        yield 'Checking file...'
        self.file.seek(0)
        mime = from_buffer(self.file.read(), mime=True)
        self.type = mime.split('/')[0]
        if self.type not in ('image', 'video', 'audio'):
            raise ValidationError('Unsupported file type')

    def split(self):
        yield 'Splitting audio & video...'
        self.audio = NamedTemporaryFile(dir=TEMP_DIR)
        self.video = NamedTemporaryFile(dir=TEMP_DIR)
        self.audio.close()
        self.video.close()
        ffmpeg = FFmpeg(
            inputs={self.file.name: None},
            outputs={
                self.audio.name: ['-map', '0:0', '-c:a', 'copy', '-f', 'mp4'],
                self.video.name: ['-map', '0:1', '-c:a', 'copy', '-f', 'mp3'],
            }
        )
        ffmpeg.run()
        self.audio = open(self.audio.name, 'rb')
        self.video = open(self.video.name, 'rb')

    def transcode(self):
        yield 'Converting audio...'
        audio = NamedTemporaryFile(dir=TEMP_DIR)
        ffmpeg = FFmpeg(
            inputs={self.file.name: None},
            outputs={
                self.video.name: ['-map', '0:1', '-c:a', 'copy', '-f', 'mp3'],
            }
        )
        ffmpeg.run()

    def process(self):
        yield 'Processing...'
        if self.type == 'video':
            yield from self.split()
        elif self.type == 'audio':
            yield from self.transcode()

    def extract_meta(self):
        last = urlsplit(self.url).path.split('/')[-1]
        self.title = unquote(last).strip() or 'Unnamed ' + self.type
        if self.type != 'image':
            yield 'Extracting duration...'
            ffmpeg = FFprobe(
                inputs={self.file.name: None},
                global_options=['-show_entries', 'format=duration'],
            )
            stdout, _ = ffmpeg.run(stdout=PIPE)
            stdout = stdout.decode('utf-8')
            key = lambda s: s.isdigit() or s == '.'
            self.length = float(''.join(filter(key, stdout)))
        if self.type == 'image':
            self.preview = self.crop(self.file, '600x350')
        elif self.type == 'video':
            yield 'Extracting preview thumbnail...'
            self.preview = NamedTemporaryFile(dir=str(settings.TEMP_DIR))
            self.preview.close()
            ffmpeg = FFmpeg(
                inputs={self.video.name: ['-ss', str(round(self.length / 2, 2))]},
                outputs={self.preview.name: ['-f', 'mjpeg', '-vframes', '1']},
            )
            ffmpeg.run()
            raw = open(self.preview.name, 'rb')
            self.preview = self.crop(raw, '600x350')
