from django.contrib.auth import forms as auth_forms
from django.forms import forms


class LoginForm(auth_forms.AuthenticationForm):
    def __init__(self, *args, **kwargs):
        super(LoginForm, self).__init__(*args, **kwargs)
        self.fields['username'].label = 'Email or username'


class RegisterForm(auth_forms.UserCreationForm):
    pass