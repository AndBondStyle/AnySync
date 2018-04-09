from django.contrib.auth.forms import AuthenticationForm, SetPasswordForm
from django.forms import ModelForm
from .models import *

__all__ = [
    'SignInForm',
    'SignUpForm',
]


class SignInForm(AuthenticationForm):
    error_messages = {
        'invalid_login': 'Authentication failed',
        'inactive': 'This account is not activated (yet)',
    }

    def __init__(self, *args, **kwargs):
        super(SignInForm, self).__init__(*args, **kwargs)
        self.fields['username'].label = 'Email or username'


class SignUpForm(ModelForm):
    class Meta:
        model = User
        fields = ['username', 'email']
