from django.db import models


class Employee(models.Model):
    name = models.CharField(max_length=255, unique=True)
    primary_job = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return self.name


class Shift(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='shifts')
    date = models.DateField()
    day_label = models.CharField(max_length=3, blank=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    role = models.CharField(max_length=255, blank=True)
    is_closing = models.BooleanField(default=False)

    class Meta:
        unique_together = ('employee', 'date', 'start_time')
        ordering = ['date', 'start_time']

    def __str__(self):
        return f"{self.employee.name} | {self.date} | {self.start_time}-{self.end_time}"
