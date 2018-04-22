from django.templatetags.static import StaticNode
from django.template import Library
from django.conf import settings

register = Library()
version = settings.VERSION


class CoreStaticNode(StaticNode):
    @classmethod
    def handle_simple(cls, name):
        raw = StaticNode.handle_simple(name)
        return raw + '?v=' + version


@register.tag
def static(parser, token):
    return CoreStaticNode.handle_token(parser, token)
