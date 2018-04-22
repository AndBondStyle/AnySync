from django.views.generic import ListView, DetailView
from backend.streams.models import Stream

__all__ = [
    'home',
    'stream',
]


class HomeView(ListView):
    model = Stream
    allow_empty = True
    context_object_name = 'streams'
    template_name = 'core/home.html'


class StreamView(DetailView):
    model = Stream
    context_object_name = 'stream'
    template_name = 'core/stream.html'


home = HomeView.as_view()
stream = StreamView.as_view()
