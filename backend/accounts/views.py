from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import redirect
from django.contrib import messages
from .forms import *

__all__ = [
    'auth',
    'logout',
]


class AuthView(LoginView):
    template_name = 'accounts/auth.html'

    def __init__(self, *args, **kwargs):
        super(AuthView, self).__init__(*args, **kwargs)
        self.signin_form = SignInForm(prefix='signin')
        self.signup_form = SignUpForm(prefix='signup')

    def post(self, *args, **kwargs):
        submit = self.request.POST.get('submit')
        if submit == 'sign in':
            self.signin_form = SignInForm(data=self.request.POST, prefix='signin')
            return super(AuthView, self).post(*args, **kwargs)
        elif submit == 'sign up':
            self.signup_form = SignUpForm(self.request.POST, prefix='signup')
            if self.signup_form.is_valid():
                user = self.signup_form.save()
                messages.success(self.request, 'Confirmation sent to %s' % user.email)
            return super(AuthView, self).get(*args, **kwargs)
        return redirect('.')

    def form_valid(self, form):
        user = form.get_user()
        messages.success(self.request, 'Logged in as %s <%s>' % (user.username, user.email))
        return super(AuthView, self).form_valid(form)

    def get_form(self, form_class=None):
        return self.signin_form

    def get_context_data(self, **kwargs):
        data = super(AuthView, self).get_context_data(**kwargs)
        data['signin_form'] = self.signin_form
        data['signup_form'] = self.signup_form
        return data


auth = AuthView.as_view()
logout = LogoutView.as_view()
