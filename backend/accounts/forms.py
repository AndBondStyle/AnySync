from django.forms import ModelForm, Form, EmailField, ValidationError
from django.contrib.auth import forms as auth_forms
from backend.core.utils import get_object_safe
from .models import *

__all__ = [
    'SignInForm',
    'SignUpForm',
    'ResetPasswordForm',
    'SetPasswordForm',
]


class SignInForm(auth_forms.AuthenticationForm):
    error_messages = {
        'invalid_login': 'Authentication failed',
        'inactive': 'This account is not activated yet',
    }

    def __init__(self, *args, **kwargs):
        super(SignInForm, self).__init__(*args, **kwargs)
        self.fields['username'].label = 'Email or username'
        self.fields['username'].widget.attrs['autofocus'] = False


class SignUpForm(ModelForm):
    class Meta:
        model = User
        fields = ['username', 'email']


class ResetPasswordForm(Form):
    email = EmailField(label='Email', max_length=254)

    def clean(self):
        email = self.cleaned_data['email']
        self.user = get_object_safe(User, email__iexact=email)
        if self.user is None: raise ValidationError('User with given email does not exist')
        if not self.user.is_active: raise ValidationError('User account is not activated yet')
        confirmation = get_object_safe(Confirmation, user=self.user)
        if confirmation is not None: raise ValidationError('Confirmation already sent')
        return self.cleaned_data


class SetPasswordForm(auth_forms.SetPasswordForm):
    def __init__(self, *args, **kwargs):
        super(SetPasswordForm, self).__init__(*args, **kwargs)
        self.fields['new_password1'].label = 'Password'
        self.fields['new_password2'].label = 'Password confirmation'
