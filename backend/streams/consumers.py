from backend.core.consumers import WebsocketConsumer
from backend.core.utils import get_object_safe
from channels.auth import AuthMiddlewareStack
from .models import Stream


# Stream page consumer managing media updates and chat
@AuthMiddlewareStack
class StreamConsumer(WebsocketConsumer):
    def connect(self):
        pk = self.scope['url_route']['kwargs']['pk']
        print('Connect to Stream', pk)
        self.stream = get_object_safe(Stream, pk=pk)
        if self.stream is None: return self.close()
        self.stream.online += 1
        self.stream.save()
        return self.accept()

    def disconnect(self, code):
        if self.stream is not None:
            self.stream.online -= 1
            self.stream.save()
