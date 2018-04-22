from channels.generic.websocket import AsyncWebsocketConsumer, JsonWebsocketConsumer
from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template
from channels.consumer import SyncConsumer
from django.template import Template
from time import time
import re


# Long-running tasks handler
class CoreConsumer(SyncConsumer):
    def send_mail(self, message):
        template = get_template(message['template'])
        html = template.render(message['context'])
        lines = open(template.origin.name).readlines()
        raw = ''.join(lines[1:])  # Skip the "extends" tag
        context = message['context'].copy()
        context['target'] = Template(raw)
        text = get_template('emails/plain.html').render(context)
        text = re.sub('\s*\n\s*', '\n', text)
        subject = '[AnySync] ' + message['subject']
        email = EmailMultiAlternatives(subject, to=[message['email']])
        email.attach_alternative(text, 'text/plain')
        email.attach_alternative(html, 'text/html')
        email.send()


# Simple yet powerful time sync backend
class SyncConsumer(AsyncWebsocketConsumer):
    async def receive(self, **kwargs):
        data = str(round(time() * 1000))
        await self.send(data)


# Socket.io-like backend handler
class WebsocketConsumer(JsonWebsocketConsumer):
    def receive_json(self, content, **kwargs):
        event = content.get('event')
        if event is None or type(event) != str: return
        callback = getattr(self, 'on_' + event, None)
        if callback is None or not callable(callback): return
        return callback(data=content.get('data'))

    def send(self, event, data=None):
        message = {'event': event, 'data': data}
        return super(WebsocketConsumer, self).send_json(message)
