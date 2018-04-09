from environ import Env
import warnings


# Variables in this file are accessible from any settings file inside this package
# They could be used to set default values and to avoid repeating setting declarations
# For now, there's just one ENV variable containing django-environ's environment wrapper

class Environ(Env):
    @classmethod
    def read_env(cls, env_file=None, **overrides):
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            super(Environ, cls).read_env(env_file)
        for key, value in overrides.items():
            cls.ENVIRON.setdefault(key, value)


ENV = Environ()
