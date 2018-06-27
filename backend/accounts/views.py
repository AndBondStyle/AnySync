from django.contrib.auth.views import LoginView, LogoutView
from django.views.generic import View, FormView
from backend.core.utils import get_object_safe
from django.shortcuts import redirect, render
from django.contrib.auth import login
from django.contrib import messages
from django.http import Http404
from .models import *
from .forms import *

__all__ = [
    'auth',
    'logout',
    'reset',
    'confirm',
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
                Confirmation.create(self.request, user, Confirmation.TYPES.ACTIVATE)
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


class ResetView(FormView):
    form_class = ResetPasswordForm
    template_name = 'accounts/reset.html'

    def form_valid(self, form):
        email = form.cleaned_data['email']
        Confirmation.create(self.request, form.user, Confirmation.TYPES.RESET)
        messages.success(self.request, 'Password reset link sent to %s' % email)
        return redirect('.')


class ConfirmView(View):
    def dispatch(self, *args, **kwargs):
        key = kwargs.get('key')
        self.confirmation = get_object_safe(Confirmation, error=Http404, key=key)
        if self.confirmation.expired:
            self.confirmation.delete()
            messages.error(self.request, 'Confirmation link expired')
            return redirect('login')
        return super(ConfirmView, self).dispatch(*args, **kwargs)

    def get(self, *args, **kwargs):
        TYPE, TYPES = self.confirmation.type, Confirmation.TYPES
        if TYPE == TYPES.ACTIVATE or TYPE == TYPES.RESET:
            form = SetPasswordForm(self.confirmation.user)
            return render(self.request, 'accounts/password.html', {'form': form})
        return redirect('home')

    def post(self, *args, **kwargs):
        TYPE, TYPES = self.confirmation.type, Confirmation.TYPES
        if TYPE == TYPES.ACTIVATE or TYPE == TYPES.RESET:
            form = SetPasswordForm(self.confirmation.user, data=self.request.POST)
            if form.is_valid():
                if TYPE == TYPES.ACTIVATE:
                    messages.success(self.request, 'Account successfully activated')
                    self.confirmation.user.is_active = True
                elif TYPE == TYPES.RESET:
                    messages.success(self.request, 'Password successfully updated')
                form.save()
                self.confirmation.delete()
                self.confirmation.user.backend = 'backend.accounts.backends.DualAuthBackend'
                login(self.request, self.confirmation.user)
                return redirect('home')
            return render(self.request, 'accounts/password.html', {'form': form})
        return redirect('home')


auth = AuthView.as_view()
logout = LogoutView.as_view()
reset = ResetView.as_view()
confirm = ConfirmView.as_view()
