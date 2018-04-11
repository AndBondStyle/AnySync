from django.contrib.auth.admin import UserAdmin as AuthUserAdmin
from django.contrib import admin
from .models import *


class UserAdmin(AuthUserAdmin):
    list_display = ['username', 'email', 'is_active']
    search_fields = ['username', 'email']
    ordering = ['username']

    fieldsets = [
        ['Personal info', {'fields': ['username', 'email']}],
        ['Tags and permissions', {'fields': ['is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions']}],
        ['Important dates', {'fields': ['last_login', 'date_joined']}],
        ['Security', {'fields': ['password']}]
    ]

    add_fieldsets = [
        [None, {'fields': ['username', 'email', 'password1', 'password2'], 'classes': ['wide']}],
    ]


admin.site.register(User, UserAdmin)
admin.site.register(Confirmation)
