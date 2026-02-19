"""
schedule/parsers.py
--------------------
Parses the "Employee Schedule – Weekly" XLSX report produced by the WFM system.

Sheet layout (0-indexed columns):
  0  – Employee name (only on the employee's FIRST row in their block)
  3  – Primary Job   (same row as name)

  Day columns (time/role share the same col; closing flag is offset):
  ┌─────┬──────────┬───────────┐
  │ Day │ time_col │ close_col │
  ├─────┼──────────┼───────────┤
  │ Mon │    5     │     8     │
  │ Tue │    9     │    11     │
  │ Wed │   12     │    15     │
  │ Thu │   16     │    17     │
  │ Fri │   18     │    19     │
  │ Sat │   20     │    21     │
  │ Sun │   22     │    24     │
  └─────┴──────────┴───────────┘

  NOTE: The date header row places dates near (but not always exactly at)
  the time columns — so _extract_dates scans ALL columns for date values
  and assigns them left-to-right to Mon…Sun.
"""

import re
from datetime import datetime, date, time
from typing import Optional

import openpyxl

# ---------------------------------------------------------------------------
# Column map: day label → (time/role col, closing-flag col)
# ---------------------------------------------------------------------------
DAY_COLS: dict[str, tuple[int, int]] = {
    "Mon": (5,  8),
    "Tue": (9,  11),
    "Wed": (12, 15),
    "Thu": (16, 17),
    "Fri": (18, 19),
    "Sat": (20, 21),
    "Sun": (22, 24),
}

DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

TIME_RANGE_RE = re.compile(
    r"(\d{1,2}:\d{2}\s*[AP]M)\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2}\s*[AP]M)", re.IGNORECASE
)

SKIP_NAME_VALUES = {
    "Time Period :", "Time Period:", "Query :", "Query:",
    "Currency Code :", "Currency Code:",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_time(raw: str) -> Optional[time]:
    raw = raw.strip().replace('\u00a0', ' ').replace('\u2013', '-').replace('\u2014', '-').upper()
    for fmt in ("%I:%M %p", "%I:%M%p"):
        try:
            return datetime.strptime(raw, fmt).time()
        except ValueError:
            continue
    return None


def _parse_date_cell(v) -> Optional[date]:
    """Return a date from a cell value (datetime, date, serial float, or date string)."""
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    # Excel serial date number (days since 1899-12-30)
    if isinstance(v, (int, float)) and 40000 < v < 60000:
        try:
            from datetime import timedelta
            return (date(1899, 12, 30) + timedelta(days=int(v)))
        except Exception:
            pass
    if isinstance(v, str):
        v = v.strip()
        for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(v, fmt).date()
            except ValueError:
                continue
    return None


def _cell(row: tuple, idx: int):
    try:
        v = row[idx]
        return v.value if hasattr(v, "value") else v
    except IndexError:
        return None


def _str_cell(row: tuple, idx: int) -> str:
    v = _cell(row, idx)
    if v is None:
        return ""
    s = str(v).strip()
    s = s.replace('\u00a0', ' ').replace('\u200b', '').replace('\ufeff', '')
    return s


def _is_section_header(row: tuple) -> bool:
    first = _str_cell(row, 0)
    return first.startswith("LS&Co.") or first in SKIP_NAME_VALUES


def _is_column_header(row: tuple) -> bool:
    return _str_cell(row, 0).lower() == "employee"


def _extract_dates(row: tuple) -> dict[str, date]:
    """
    Scan ALL columns in the date-header row for date/datetime values and
    assign them left-to-right to Mon…Sun.  This is intentionally position-
    agnostic so off-by-one column shifts in the report don't break parsing.
    """
    found_dates: list[date] = []
    for i in range(len(row)):
        d = _parse_date_cell(_cell(row, i))
        if d is not None and d not in found_dates:
            found_dates.append(d)

    dates: dict[str, date] = {}
    for i, day in enumerate(DAY_ORDER):
        if i < len(found_dates):
            dates[day] = found_dates[i]
    return dates


def _is_empty(row: tuple) -> bool:
    return all(_cell(row, i) is None for i in range(len(row)))


# ---------------------------------------------------------------------------
# Employee block extractor
# ---------------------------------------------------------------------------

def _extract_employee_shifts(
    block: list[tuple],
    day_dates: dict[str, date],
    employee_name: str,
    primary_job: str,
) -> list[dict]:
    shifts = []
    # Each employee block has pairs: time_row + optional role_row
    pairs = [(block[i], block[i + 1] if i + 1 < len(block) else None)
             for i in range(0, len(block), 2)]

    for time_row, role_row in pairs:
        for day_label, (time_col, close_col) in DAY_COLS.items():
            raw_time = _str_cell(time_row, time_col)
            m = TIME_RANGE_RE.search(raw_time)
            if not m:
                continue

            start_t = _parse_time(m.group(1))
            end_t = _parse_time(m.group(2))
            if not start_t or not end_t:
                continue

            shift_date = day_dates.get(day_label)
            if not shift_date:
                continue

            role = _str_cell(role_row, time_col) if role_row else ""
            close_val = _str_cell(time_row, close_col).lower()
            is_closing = close_val == "x"

            shifts.append({
                "employee_name": employee_name,
                "primary_job": primary_job,
                "day_label": day_label,
                "date": shift_date,
                "start_time": start_t,
                "end_time": end_t,
                "role": role,
                "is_closing": is_closing,
            })

    return shifts


# ---------------------------------------------------------------------------
# Main parser
# ---------------------------------------------------------------------------

def parse_schedule_xlsx(filepath: str) -> list[dict]:
    """Parse every sheet in the XLSX and return a flat list of shift dicts."""
    wb = openpyxl.load_workbook(filepath, data_only=False)
    all_shifts: list[dict] = []

    for ws in wb.worksheets:
        rows = [tuple(ws[row_num]) for row_num in range(1, ws.max_row + 1)]
        all_shifts.extend(_parse_rows(rows))

    return all_shifts


def _parse_rows(rows: list[tuple]) -> list[dict]:
    """
    Walk the row list handling multiple sub-table blocks within a single sheet.
    A sheet may contain several "Employee / dates / employee rows..." blocks
    (one per store location, etc.).  Each block is re-started when we see a
    fresh column-header row.
    """
    shifts: list[dict] = []
    day_dates: dict[str, date] = {}
    i = 0

    while i < len(rows):
        row = rows[i]

        if _is_empty(row):
            i += 1
            continue

        # Must check column header BEFORE section header — 'Employee' row
        # is a column header, not a section header to skip.
        if _is_column_header(row):
            # The very next row holds the date values for this block
            if i + 1 < len(rows):
                day_dates = _extract_dates(rows[i + 1])
            i += 2
            continue

        if _is_section_header(row):
            i += 1
            continue

        name = _str_cell(row, 0)
        if name and name not in SKIP_NAME_VALUES:
            primary_job = _str_cell(row, 3)

            # Collect the continuation rows belonging to this employee
            block = [row]
            j = i + 1
            while j < len(rows):
                nxt = rows[j]
                if (_is_empty(nxt) or _is_section_header(nxt)
                        or _is_column_header(nxt) or _str_cell(nxt, 0)):
                    break
                block.append(nxt)
                j += 1

            shifts.extend(
                _extract_employee_shifts(block, day_dates, name, primary_job)
            )
            i = j
            continue

        i += 1

    return shifts
