from django.urls import path, include
from django.conf import settings
from django.contrib import admin

urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path('', include('backend.core.urls')),
    path('accounts/', include('backend.accounts.urls')),
]

if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


from channels.routing import ProtocolTypeRouter, URLRouter, ChannelNameRouter
from channels.auth import AuthMiddlewareStack
from backend.core.consumers import CoreConsumer

application = ProtocolTypeRouter({
    'websocket': AuthMiddlewareStack(
        URLRouter({
            # path('broadcast/'),
        })
    ),
    'channel': ChannelNameRouter({
        'core': CoreConsumer,
    }),
})
