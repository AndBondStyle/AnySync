from django.conf.urls import url, include
from django.conf import settings
from django.contrib import admin

urlpatterns = [
    url(settings.ADMIN_URL, admin.site.urls),
]
