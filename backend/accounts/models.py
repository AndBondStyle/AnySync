from django.contrib.auth.models import BaseUserManager, AbstractBaseUser, PermissionsMixin
from django.core.exceptions import ValidationError
from django.core import validators
from django.db import models

__all__ = [
    'User',
]


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, username, email, password, **extra):
        if not username: raise ValueError('Username required')
        if not email: raise ValueError('Email required')
        email = self.normalize_email(email)
        username = self.model.normalize_username(username)
        user = self.model(username=username, email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, username, email, password=None, **extra):
        extra.setdefault('is_staff', False)
        extra.setdefault('is_superuser', False)
        return self._create_user(username, email, password, **extra)

    def create_superuser(self, username, email, password, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('is_active', True)
        if extra.get('is_staff') is not True: raise ValueError('Superuser must have is_staff=True')
        if extra.get('is_superuser') is not True: raise ValueError('Superuser must have is_superuser=True')
        if extra.get('is_active') is not True: raise ValueError('Superuser must have is_active=True')
        return self._create_user(username, email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(
        'username',
        max_length=25,
        unique=True,
        help_text='3 to 25 characters: letters, digits and underscores only',
        validators=[
            validators.RegexValidator(
                regex='^\w+$',
                message='Username may contain only letters, numbers and underscores'
            ),
            validators.MinLengthValidator(
                limit_value=3,
                message='Username must be at least 3 characters long',
            ),
            validators.MaxLengthValidator(
                limit_value=25,
                message='Username must be shorter than 25 characters',
            ),
        ],
        error_messages={
            'unique': 'A user with that username already exists'
        },
    )
    email = models.EmailField(
        'email address',
        unique=True,
        error_messages={
            'unique': 'A user with that email address already exists'
        },
    )
    is_staff = models.BooleanField('staff status', default=False)
    is_active = models.BooleanField('active', default=False)
    date_joined = models.DateTimeField('date joined', auto_now_add=True)

    objects = UserManager()

    EMAIL_FIELD = 'email'
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def clean(self):
        username = self.get_username()
        self.username = self.normalize_username(username)
        self.email = User.objects.normalize_email(self.email)

    def validate_unique(self, exclude=None):
        super(User, self).validate_unique(exclude=None)
        qs = User.objects.filter(username__iexact=self.username)
        if qs.exists(): raise ValidationError(self.unique_error_message(User, ['username']))
        qs = User.objects.filter(email__iexact=self.email)
        if qs.exists(): raise ValidationError(self.unique_error_message(User, ['email']))

    get_full_name = get_short_name = lambda self: self.username

    def send_mail(self, subject, message, from_email=None, **kwargs):
        pass
        # send_mail(subject, message, from_email, [self.email], **kwargs)
