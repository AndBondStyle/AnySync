from django.urls import path
from .views import *

urlpatterns = [
    path('auth/', auth, name='auth'),
    path('logout/', logout, name='logout'),
    path('reset/', reset, name='reset'),
    path('confirm/<slug:key>/', confirm, name='confirm'),
]
