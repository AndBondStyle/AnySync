from django.conf.urls import url, include
from django.conf import settings
from django.contrib import admin

urlpatterns = [
    url(settings.ADMIN_URL, admin.site.urls),
    url(r'^', include('backend.core.urls')),
    url(r'^accounts/', include('backend.accounts.urls')),
]

if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


from channels.routing import ProtocolTypeRouter, ChannelNameRouter
from backend.core.consumers import CoreConsumer

application = ProtocolTypeRouter({
    'channel': ChannelNameRouter({
        'core': CoreConsumer,
    }),
})
