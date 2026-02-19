import tempfile
import os

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
import openpyxl

from .models import Employee, Shift
from .serializers import ShiftSerializer, EmployeeSerializer
from .parsers import parse_schedule_xlsx


# ---------------------------------------------------------------------------
# Helper: save uploaded file to a temp path
# ---------------------------------------------------------------------------
def _save_temp(xlsx_file):
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        for chunk in xlsx_file.chunks():
            tmp.write(chunk)
        return tmp.name


class ShiftListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_filter = request.query_params.get('date')
        week_start = request.query_params.get('week_start')

        shifts = Shift.objects.select_related('employee').all()

        if date_filter:
            shifts = shifts.filter(date=date_filter)
        elif week_start:
            from datetime import datetime, timedelta
            try:
                start = datetime.strptime(week_start, '%Y-%m-%d').date()
                end = start + timedelta(days=6)
                shifts = shifts.filter(date__range=[start, end])
            except ValueError:
                pass

        serializer = ShiftSerializer(shifts, many=True)
        return Response(serializer.data)


class EmployeeListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employees = Employee.objects.prefetch_related('shifts').all()
        serializer = EmployeeSerializer(employees, many=True)
        return Response(serializer.data)


class ImportScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        xlsx_file = request.FILES.get('file')
        if not xlsx_file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not xlsx_file.name.endswith('.xlsx'):
            return Response({'error': 'File must be an .xlsx file.'}, status=status.HTTP_400_BAD_REQUEST)

        clear = request.data.get('clear', 'false').lower() == 'true'

        tmp_path = _save_temp(xlsx_file)

        try:
            records = parse_schedule_xlsx(tmp_path)
        except Exception as exc:
            os.unlink(tmp_path)
            return Response({'error': f'Failed to parse XLSX: {exc}'}, status=status.HTTP_400_BAD_REQUEST)
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        parsed_count = len(records)
        if not records:
            return Response({
                'message': 'No shifts found in file. The XLSX layout may not match the expected format.',
                'shifts_created': 0,
                'shifts_updated': 0,
                'employees_created': 0,
                'parsed_count': 0,
            })

        employees_created = 0
        shifts_created = 0
        shifts_updated = 0

        with transaction.atomic():
            if clear:
                Shift.objects.all().delete()

            for record in records:
                if not record.get('date'):
                    continue

                employee, emp_new = Employee.objects.update_or_create(
                    name=record['employee_name'],
                    defaults={'primary_job': record['primary_job']},
                )
                if emp_new:
                    employees_created += 1

                _, shift_new = Shift.objects.update_or_create(
                    employee=employee,
                    date=record['date'],
                    start_time=record['start_time'],
                    defaults={
                        'end_time': record['end_time'],
                        'day_label': record['day_label'],
                        'role': record['role'],
                        'is_closing': record['is_closing'],
                    },
                )
                if shift_new:
                    shifts_created += 1
                else:
                    shifts_updated += 1

        return Response({
            'message': 'Import successful.',
            'employees_created': employees_created,
            'shifts_created': shifts_created,
            'shifts_updated': shifts_updated,
            'parsed_count': parsed_count,
        }, status=status.HTTP_201_CREATED)


class InspectScheduleView(APIView):
    """POST an XLSX — returns raw sheet structure and first parsed records for debugging."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        xlsx_file = request.FILES.get('file')
        if not xlsx_file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        tmp_path = _save_temp(xlsx_file)
        result = {}

        try:
            # Raw sheet peek
            wb = openpyxl.load_workbook(tmp_path, data_only=False)
            sheets = []
            for ws in wb.worksheets:
                rows_preview = []
                for row in ws.iter_rows(min_row=1, max_row=15, values_only=True):
                    rows_preview.append([repr(c) if c is not None else None for c in row])
                sheets.append({'name': ws.title, 'max_row': ws.max_row, 'max_col': ws.max_column, 'preview': rows_preview})
            result['sheets'] = sheets

            # Trace parse logic
            from .parsers import (
                _is_empty, _is_section_header, _is_column_header,
                _extract_dates, _extract_employee_shifts, _str_cell, DAY_COLS, TIME_RANGE_RE
            )
            wb2 = openpyxl.load_workbook(tmp_path, data_only=False)
            trace = []
            for ws in wb2.worksheets:
                raw_rows = [tuple(ws[rn]) for rn in range(1, ws.max_row + 1)]
                day_dates = {}
                for ri, row in enumerate(raw_rows):
                    row_label = ri + 1
                    if _is_empty(row):
                        trace.append({'row': row_label, 'type': 'empty'})
                        continue
                    if _is_section_header(row):
                        trace.append({'row': row_label, 'type': 'section_header', 'val': _str_cell(row, 0)})
                        continue
                    if _is_column_header(row):
                        date_row = raw_rows[ri + 1] if ri + 1 < len(raw_rows) else None
                        day_dates = _extract_dates(date_row) if date_row is not None else {}
                        # Dump the raw cell values of the date row for diagnosis
                        date_row_raw = [repr(_cell(date_row, ci)) for ci in range(len(date_row))] if date_row is not None else []
                        trace.append({'row': row_label, 'type': 'col_header', 'day_dates': {k: str(v) for k, v in day_dates.items()}, 'date_row_raw': date_row_raw})
                        continue
                    name = _str_cell(row, 0)
                    if name:
                        # Check time cells
                        time_cells = {}
                        for day, (tc, cc) in DAY_COLS.items():
                            raw = _str_cell(row, tc)
                            close = _str_cell(row, cc)
                            m = TIME_RANGE_RE.search(raw) if raw else None
                            time_cells[day] = {
                                'raw': repr(raw),
                                'close_raw': repr(close),
                                'matched': bool(m),
                                'groups': list(m.groups()) if m else None,
                            }
                        trace.append({'row': row_label, 'type': 'employee', 'name': name, 'job': _str_cell(row, 3), 'time_cells': time_cells})
                    else:
                        trace.append({'row': row_label, 'type': 'continuation', 'col0': repr(_str_cell(row, 0))})
            result['trace'] = trace[:40]  # limit

            # Parser output
            records = parse_schedule_xlsx(tmp_path)
            result['parsed_count'] = len(records)
            result['sample_records'] = [
                {k: str(v) for k, v in r.items()} for r in records[:10]
            ]
        except Exception as exc:
            import traceback
            result['error'] = str(exc)
            result['traceback'] = traceback.format_exc()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return Response(result)
