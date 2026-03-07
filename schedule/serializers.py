from rest_framework import serializers
from .models import Employee, Shift, StaffZone, ZONE_FIELDS


class ShiftSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    primary_job = serializers.CharField(source='employee.primary_job', read_only=True)

    class Meta:
        model = Shift
        fields = ['id', 'employee_name', 'primary_job', 'date', 'day_label', 'start_time', 'end_time', 'role']


class EmployeeSerializer(serializers.ModelSerializer):
    shifts = ShiftSerializer(many=True, read_only=True)

    class Meta:
        model = Employee
        fields = ['id', 'name', 'primary_job', 'shifts']


class StaffZoneSerializer(serializers.ModelSerializer):
    employee_id = serializers.IntegerField(source='employee.id', read_only=True)
    name = serializers.CharField(source='employee.name', read_only=True)

    class Meta:
        model = StaffZone
        fields = ['employee_id', 'name'] + ZONE_FIELDS
