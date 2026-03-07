from django.db import models


class Employee(models.Model):
    name = models.CharField(max_length=255, unique=True)
    primary_job = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name


ZONE_FIELDS = ['mens', 'womens', 'cash', 'fits', 'greet', 'boh']


class StaffZone(models.Model):
    """Skill/knowledge level for each store zone per employee. 0=none 1=basic 2=competent 3=expert"""
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='zones')
    mens    = models.SmallIntegerField(default=0)
    womens  = models.SmallIntegerField(default=0)
    cash    = models.SmallIntegerField(default=0)
    fits    = models.SmallIntegerField(default=0)
    greet   = models.SmallIntegerField(default=0)
    boh     = models.SmallIntegerField(default=0)

    def __str__(self):
        return f"Zones({self.employee.name})"


class Shift(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='shifts')
    date = models.DateField()
    day_label = models.CharField(max_length=3, blank=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    role = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('employee', 'date', 'start_time')
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.employee.name} | {self.date} | {self.start_time}-{self.end_time}"
