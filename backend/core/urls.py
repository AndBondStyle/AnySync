from django.shortcuts import render, redirect
from django.conf.urls import url

urlpatterns = [
    url(r'^$', lambda r: redirect('/home/')),
    url(r'^home/$', lambda r: render(r, 'home.html'), name='home'),
]
