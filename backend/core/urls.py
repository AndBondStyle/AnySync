from django.shortcuts import render, redirect
from django.urls import path

urlpatterns = [
    path('', lambda r: redirect('/home/')),
    path('home/', lambda r: render(r, 'core/home.html'), name='home'),
]
