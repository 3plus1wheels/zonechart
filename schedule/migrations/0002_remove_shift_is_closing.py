from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('schedule', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='shift',
            name='is_closing',
        ),
    ]
