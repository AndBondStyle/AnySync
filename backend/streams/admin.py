from django.contrib import admin
from .models import *


class StreamAdmin(admin.ModelAdmin):
    list_display = ['title', 'mode', 'online']
    readonly_fields = ['online']


admin.site.register(Stream, StreamAdmin)
