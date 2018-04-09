from django.shortcuts import render, redirect
from django.contrib.messages import error
from django.conf.urls import url
from .views import login

urlpatterns = [
    url(r'^$', lambda r: redirect('/home/')),
    url(r'^home/$', lambda r: render(r, 'core/home.html'), name='home'),
    url(r'^login/$', login, name='login'),
]
