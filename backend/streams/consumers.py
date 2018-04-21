from backend.core.utils import WebsocketConsumer


class StreamConsumer(WebsocketConsumer):
    def connect(self):
        id = self.scope['url_route']['kwargs'].get('id')
        print('Connection to stream ID', id)
        self.accept()

    def disconnect(self, code):
        pass

    def update(self):
        pass
