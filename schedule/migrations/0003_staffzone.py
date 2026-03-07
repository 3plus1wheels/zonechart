from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('schedule', '0002_remove_shift_is_closing'),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffZone',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mens',   models.SmallIntegerField(default=0)),
                ('womens', models.SmallIntegerField(default=0)),
                ('flex',   models.SmallIntegerField(default=0)),
                ('cash',   models.SmallIntegerField(default=0)),
                ('fits',   models.SmallIntegerField(default=0)),
                ('greet',  models.SmallIntegerField(default=0)),
                ('office', models.SmallIntegerField(default=0)),
                ('boh',    models.SmallIntegerField(default=0)),
                ('employee', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='zones',
                    to='schedule.employee',
                )),
            ],
        ),
    ]
