from django.contrib import admin
from .models import Employee, Shift


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['name', 'primary_job']
    search_fields = ['name']


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'day_label', 'start_time', 'end_time', 'role', 'is_closing']
    list_filter = ['date', 'day_label', 'is_closing']
    search_fields = ['employee__name', 'role']
