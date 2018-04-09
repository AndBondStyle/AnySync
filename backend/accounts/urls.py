from django.conf.urls import url
from .views import *

urlpatterns = [
    url(r'^auth/$', auth, name='auth'),
    url(r'^logout/$', logout, name='logout'),
    url(r'^reset/$', reset, name='reset'),
]
