from backend.core.consumers import WebsocketConsumer
from backend.core.utils import get_object_safe
from django.utils.html import escape
from .models import Stream
from time import time
import re


# Stream page consumer managing media updates and chat
class StreamConsumer(WebsocketConsumer):
    def connect(self):
        pk = self.scope['url_route']['kwargs']['pk']
        self.group = 'stream-%s' % pk
        self.group_add(self.group, self.channel_name)
        self.stream = get_object_safe(Stream, pk=pk)
        if self.stream is None: return self.close()
        self.stream.online += 1
        self.stream.save()
        self.accept()
        self.group_send(self.group, {
            'type': 'update',
            'mode': 'online',
        })
        if self.scope['user'].is_authenticated:
            self.group_send(self.group, {
                'type': 'chat_message',
                'username': '[CHAT]',
                'class': 'text-muted',
                'text': self.scope['user'].username + ' joined the stream',
            })

    def on_chat_message(self, data):
        if not self.scope['user'].is_authenticated:
            self.send('chat-message', {
                'username': '[CHAT]',
                'class': 'text-danger',
                'text': 'You must be logged in to send messages',
            })
        else:
            last_message = self.scope['session'].get('last_message', 0)
            if time() - last_message < 1: return self.send('chat-message', {
                'username': '[CHAT]',
                'class': 'text-danger',
                'text': 'You\'re sending messages too quickly - please calm down a bit',
            })
            username = self.scope['user'].username + ':'
            css_class = 'text-admin' if self.scope['user'].is_staff else 'text-dark'
            text = re.sub('\s+', ' ', escape(data.get('text', ''))).strip()
            if len(text) == 0: return self.send('chat-message', {
                'username': '[CHAT]',
                'class': 'text-danger',
                'text': 'Empty messages not allowed',
            })
            if len(text) > 200: return self.send('chat-message', {
                'username': '[CHAT]',
                'class': 'text-danger',
                'text': 'Message must be no longer than 200 symbols',
            })
            self.scope['session']['last_message'] = round(time())
            self.scope['session'].save()
            self.group_send(self.group, {
                'type': 'chat_message',
                'username': username,
                'class': css_class,
                'text': data['text'],
            })

    def chat_message(self, data):
        self.send('chat-message', data)

    def disconnect(self, code):
        self.channel_layer.group_discard(self.group, self.channel_name)
        if self.stream is not None:
            self.stream.refresh_from_db()
            self.stream.online -= 1
            self.stream.save()
        self.group_send(self.group, {
            'type': 'update',
            'mode': 'online',
        })
        if self.scope['user'].is_authenticated:
            self.group_send(self.group, {
                'type': 'chat_message',
                'username': '[CHAT]',
                'class': 'text-muted',
                'text': self.scope['user'].username + ' left the stream',
            })

    def update(self, data):
        if data['mode'] == 'online':
            self.stream.refresh_from_db()
            print('Online:', self.stream.online)
            self.send('update-online', {'value': self.stream.online})
