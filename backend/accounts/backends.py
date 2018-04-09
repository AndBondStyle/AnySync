from django.contrib.auth.backends import ModelBackend, UserModel
from django.db.models import Q


class DualAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, *kwargs):
        try:
            user = UserModel.objects.get(Q(username__iexact=username) | Q(email__iexact=username))
        except UserModel.DoesNotExist:
            UserModel().set_password(password)
            return
        else:
            if not user.check_password(password): return
            if not self.user_can_authenticate(user): return
            return user
