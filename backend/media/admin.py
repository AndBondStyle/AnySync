from django.contrib import admin
from .models import *


class ContentAdmin(admin.ModelAdmin):
    list_display = ['pk', 'type', 'length']


class MediaAdmin(admin.ModelAdmin):
    list_display = ['title', 'align', 'length']
    readonly_fields = ['length']


admin.site.register(Content, ContentAdmin)
admin.site.register(Media, MediaAdmin)
