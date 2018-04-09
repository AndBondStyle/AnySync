from django.views.generic import FormView
from .forms import LoginForm, RegisterForm

class LoginView(FormView):
    form_class = LoginForm
    template_name = 'login.html'

    def get_context_data(self, **kwargs):
        data = super(LoginView, self).get_context_data(**kwargs)
        data['login_form'] = data['form']
        return data


class RegisterView(FormView):
    form_class = RegisterForm
    template_name = 'login.html'

    def get_context_data(self, **kwargs):
        data = super(LoginView, self).get_context_data(**kwargs)
        data['register_form'] = data['form']
        return data


login = LoginView.as_view()
