from environ import Env

# Variables in this file are accessible from any settings file inside this package
# They could be used to set default values and to avoid repeating setting declarations
# For now, there's just one ENV variable containing django-environ's environment wrapper

ENV = Env()
