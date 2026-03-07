from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('schedule', '0003_staffzone'),
    ]

    operations = [
        migrations.RemoveField(model_name='staffzone', name='flex'),
        migrations.RemoveField(model_name='staffzone', name='office'),
    ]
