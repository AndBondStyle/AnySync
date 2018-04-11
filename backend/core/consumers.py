from django.core.mail import EmailMultiAlternatives
from django.template.loader import get_template
from channels.consumer import SyncConsumer
from django.template import Template
import re


class CoreConsumer(SyncConsumer):
    def send_mail(self, message):
        template = get_template(message['template'])
        html = template.render(message['context'])
        raw = '\n'.join(open(template.origin.name).readlines()[1:])
        context = message['context'].copy()
        context['target'] = Template(raw)
        text = get_template('emails/plain.html').render(context)
        text = re.sub('\s*\n\s*', '\n', text)
        subject = '[AnySync] ' + message['subject']
        email = EmailMultiAlternatives(subject, to=[message['email']])
        email.attach_alternative(text, 'text/plain')
        email.attach_alternative(html, 'text/html')
        email.send()
