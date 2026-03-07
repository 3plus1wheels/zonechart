from django.urls import path
from .views import ShiftListView, EmployeeListView, ImportScheduleView, InspectScheduleView, WorkbookView, StaffZoneView

urlpatterns = [
    path('shifts/', ShiftListView.as_view(), name='shift_list'),
    path('employees/', EmployeeListView.as_view(), name='employee_list'),
    path('import/', ImportScheduleView.as_view(), name='import_schedule'),
    path('inspect/', InspectScheduleView.as_view(), name='inspect_schedule'),
    path('workbook/', WorkbookView.as_view(), name='workbook'),
    path('staff/', StaffZoneView.as_view(), name='staff_zones'),
    path('staff/<int:employee_id>/', StaffZoneView.as_view(), name='staff_zone_update'),
]
