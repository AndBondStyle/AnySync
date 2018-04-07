from channels.routing import ProtocolTypeRouter
from django.conf.urls import url
from django.conf import settings
from django.contrib import admin

urlpatterns = [
    url(settings.ADMIN_URL, admin.site.urls),
]

application = ProtocolTypeRouter({})
