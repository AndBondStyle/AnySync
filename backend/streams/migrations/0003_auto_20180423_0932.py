# Generated by Django 2.0.4 on 2018-04-23 09:32

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('streams', '0002_auto_20180421_1920'),
    ]

    operations = [
        migrations.AlterField(
            model_name='stream',
            name='preview',
            field=models.ImageField(blank=True, null=True, upload_to='', verbose_name='preview'),
        ),
    ]
