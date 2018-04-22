from django.shortcuts import render, redirect
from django.urls import path
from .views import *

urlpatterns = [
    path('', lambda r: redirect('/home/')),
    path('home/', home, name='home'),
    path('stream/<int:pk>/', stream, name='stream'),
]
