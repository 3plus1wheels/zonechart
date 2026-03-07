import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Schedule.css';

const HOUR_START = 6;   // 6 AM
const HOUR_END = 23;    // 11 PM
const TOTAL_HOURS = HOUR_END - HOUR_START;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

const ROLE_COLORS = [
  '#61dafb', '#4caf50', '#ff9800', '#e91e63',
  '#9c27b0', '#00bcd4', '#ff5722', '#8bc34a',
  '#ffc107', '#03a9f4', '#f44336', '#3f51b5',
];

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToPos(minutes) {
  const startMin = HOUR_START * 60;
  const totalMin = TOTAL_HOURS * 60;
  return Math.max(0, Math.min(100, ((minutes - startMin) / totalMin) * 100));
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toYMD(date) {
  // Use local date parts to avoid UTC-offset shifting the day
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ScheduleTab() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importTraceback, setImportTraceback] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState(null);
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [tooltip, setTooltip] = useState(null);
  const [viewMode, setViewMode] = useState('gantt'); // 'gantt' | 'day'
  const [selectedDay, setSelectedDay] = useState('Mon');
  const fileInputRef = useRef(null);
  const inspectFileInputRef = useRef(null);

  const token = localStorage.getItem('access_token');

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/schedule/shifts/?week_start=${toYMD(weekStart)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch shifts');
      const data = await res.json();
      setShifts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weekStart, token]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Build role → color map
  const roleColors = {};
  const roles = [...new Set(shifts.map(s => s.role).filter(Boolean))];
  roles.forEach((role, i) => {
    roleColors[role] = ROLE_COLORS[i % ROLE_COLORS.length];
  });

  // Group shifts by day_label
  const shiftsByDay = {};
  DAYS.forEach(d => { shiftsByDay[d] = []; });
  shifts.forEach(s => {
    if (shiftsByDay[s.day_label]) shiftsByDay[s.day_label].push(s);
  });

  // Unique employees with their job
  const employeeMap = {};
  shifts.forEach(s => {
    if (!employeeMap[s.employee_name]) {
      employeeMap[s.employee_name] = s.primary_job || '';
    }
  });
  const employees = Object.keys(employeeMap).sort();

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i));

  const handlePrevWeek = () => setWeekStart(w => addDays(w, -7));
  const handleNextWeek = () => setWeekStart(w => addDays(w, 7));
  const handleToday = () => setWeekStart(getMondayOfWeek(new Date()));

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportTraceback(null);
    setInspectResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/schedule/import/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.traceback) setImportTraceback(data.traceback);
        throw new Error(data.error || 'Import failed');
      }
      setImportResult(data);
      if ((data.shifts_created ?? 0) > 0 || (data.shifts_updated ?? 0) > 0) {
        if (data.week_start) {
          // Navigate to the imported week — useEffect will re-fetch automatically
          setWeekStart(new Date(data.week_start + 'T00:00:00'));
        } else {
          fetchShifts();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleInspect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setInspecting(true);
    setInspectResult(null);
    setImportResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/schedule/inspect/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Inspect failed');
      setInspectResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setInspecting(false);
      e.target.value = '';
    }
  };

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => HOUR_START + i);

  // ─── Gantt (weekly) view ───────────────────────────────────────────
  const renderGantt = () => (
    <div className="gantt-wrapper">
      <div className="gantt-day-headers">
        <div className="gantt-name-col" />
        {DAYS.map((day, i) => (
          <div key={day} className="gantt-day-header">
            <span className="day-abbr">{day}</span>
            <span className="day-date">{formatShortDate(weekDates[i])}</span>
          </div>
        ))}
      </div>

      <div className="gantt-body">
        {employees.length === 0 ? (
          <div className="no-data">No shifts for this week. Import an XLSX to get started.</div>
        ) : (
          employees.map(emp => {
            const empShifts = shifts.filter(s => s.employee_name === emp);
            return (
              <div key={emp} className="gantt-row">
                <div className="gantt-name-col" title={`${emp}${employeeMap[emp] ? ' — ' + employeeMap[emp] : ''}`}>
                  <span className="gantt-emp-name">{emp}</span>
                  {employeeMap[emp] && <span className="gantt-emp-job">{employeeMap[emp]}</span>}
                </div>
                {DAYS.map(day => {
                  const dayShifts = empShifts.filter(s => s.day_label === day);
                  return (
                    <div key={day} className="gantt-cell">
                      {dayShifts.map(shift => {
                        const startMin = timeToMinutes(shift.start_time);
                        const endMin = timeToMinutes(shift.end_time);
                        const left = minutesToPos(startMin);
                        const width = minutesToPos(endMin) - left;
                        const color = roleColors[shift.role] || '#61dafb';
                        return (
                          <div
                            key={shift.id}
                            className={`shift-bar${shift.is_closing ? ' closing' : ''}`}
                            style={{ left: `${left}%`, width: `${Math.max(width, 2)}%`, backgroundColor: color }}
                            onMouseEnter={e => setTooltip({ shift, x: e.clientX, y: e.clientY })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            <span className="shift-bar-label">
                              {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                            </span>
                          </div>
                        );
                      })}
                      {/* Hour grid lines */}
                      {hours.map(h => (
                        <div
                          key={h}
                          className="gantt-gridline"
                          style={{ left: `${minutesToPos(h * 60)}%` }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Time axis */}
      <div className="gantt-time-axis">
        <div className="gantt-name-col" />
        <div className="gantt-time-track">
          {hours.map(h => (
            <div key={h} className="gantt-hour-label" style={{ left: `${minutesToPos(h * 60)}%` }}>
              {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Day view ────────────────────────────────────────────────────
  const renderDayView = () => {
    const dayShifts = shiftsByDay[selectedDay] || [];

    return (
      <div className="day-view">
        <div className="day-tabs">
          {DAYS.map((day, i) => (
            <button
              key={day}
              className={`day-tab${selectedDay === day ? ' active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              <span>{day}</span>
              <span className="day-tab-date">{formatShortDate(weekDates[i])}</span>
            </button>
          ))}
        </div>

        <div className="day-timeline">
          <div className="day-hours">
            {hours.map(h => (
              <div key={h} className="day-hour">
                <span>{h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}</span>
              </div>
            ))}
          </div>
          <div className="day-shifts">
            {hours.map(h => (
              <div key={h} className="day-hour-row">
                {dayShifts
                  .filter(s => {
                    const startH = Math.floor(timeToMinutes(s.start_time) / 60);
                    return startH === h;
                  })
                  .map(s => {
                    const color = roleColors[s.role] || '#61dafb';
                    return (
                      <div
                        key={s.id}
                        className={`day-shift-card${s.is_closing ? ' closing' : ''}`}
                        style={{ borderLeft: `4px solid ${color}` }}
                        onMouseEnter={e => setTooltip({ shift: s, x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <span className="day-shift-name">{s.employee_name}</span>
                        <span className="day-shift-time">{formatTime(s.start_time)} – {formatTime(s.end_time)}</span>
                        {s.role && <span className="day-shift-role" style={{ color }}>{s.role}</span>}
                        {s.is_closing && <span className="closing-badge">Closing</span>}
                      </div>
                    );
                  })}
              </div>
            ))}
            {dayShifts.length === 0 && (
              <div className="no-data">No shifts for {DAY_FULL[selectedDay]}.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="schedule-tab">
      {/* Header */}
      <div className="schedule-header">
        <div className="schedule-header-left">
          <h2>Schedule</h2>
          <div className="week-nav">
            <button onClick={handlePrevWeek} title="Previous week">‹</button>
            <span className="week-label">
              {formatShortDate(weekStart)} – {formatShortDate(addDays(weekStart, 6))}
            </span>
            <button onClick={handleNextWeek} title="Next week">›</button>
            <button className="today-btn" onClick={handleToday}>Today</button>
          </div>
        </div>

        <div className="schedule-header-right">
          <div className="view-toggle">
            <button
              className={viewMode === 'gantt' ? 'active' : ''}
              onClick={() => setViewMode('gantt')}
            >📊 Weekly</button>
            <button
              className={viewMode === 'day' ? 'active' : ''}
              onClick={() => setViewMode('day')}
            >📅 Day</button>
          </div>

          <button
            className="import-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? '⏳ Importing...' : '📥 Import XLSX'}
          </button>
          <button
            className="inspect-btn"
            onClick={() => inspectFileInputRef.current?.click()}
            disabled={inspecting}
            title="Inspect XLSX structure without saving — use this to debug format issues"
          >
            {inspecting ? '🔍 Inspecting...' : '🔍 Inspect'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <input
            ref={inspectFileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={handleInspect}
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="schedule-error">
          <span>⚠️ {error}</span>
          {importTraceback && (
            <pre className="schedule-traceback">{importTraceback}</pre>
          )}
        </div>
      )}
      {importResult && (() => {
        const created = importResult.shifts_created ?? 0;
        const updated = importResult.shifts_updated ?? 0;
        const empNew = importResult.employees_created ?? 0;
        const parsed = importResult.parsed_count ?? 0;
        const hasData = created > 0 || updated > 0;
        return (
          <div className={hasData ? 'schedule-success' : 'schedule-warning'}>
            {hasData
              ? `✅ Import done — ${created} shifts created, ${updated} updated, ${empNew} new employees.`
              : `⚠️ File parsed (${parsed} records found) but no shifts were stored. The XLSX column layout may not match the expected format. Try the 🔍 Inspect button to view the raw sheet structure.`
            }
          </div>
        );
      })()}
      {inspectResult && (
        <div className="inspect-panel">
          <div className="inspect-header">
            <strong>🔍 Inspect Results</strong>
            <span>— {inspectResult.parsed_count} shifts parsed from {inspectResult.sheets?.length} sheet(s)</span>
            <button className="inspect-close" onClick={() => setInspectResult(null)}>✕</button>
          </div>

          {/* Raw sheet preview */}
          {inspectResult.sheets?.map((sheet, si) => (
            <div key={si} className="inspect-sheet">
              <div className="inspect-sheet-title">{sheet.name} ({sheet.max_row} rows × {sheet.max_col} cols)</div>
              <div className="inspect-table-wrap">
                <table className="inspect-table">
                  <thead><tr><th>#</th>{sheet.preview[0]?.map((_, ci) => <th key={ci}>{ci}</th>)}</tr></thead>
                  <tbody>
                    {sheet.preview.map((row, ri) => (
                      <tr key={ri}>
                        <td className="inspect-rownum">{ri + 1}</td>
                        {row.map((cell, ci) => <td key={ci}>{cell ?? ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Parser trace */}
          {inspectResult.trace && (
            <div className="inspect-trace">
              <div className="inspect-sheet-title">Parser trace (first 40 rows)</div>
              {inspectResult.trace.map((entry, i) => {
                if (entry.type === 'empty') return null;
                if (entry.type === 'employee') return (
                  <div key={i} className="trace-employee">
                    <div className="trace-emp-name">Row {entry.row}: 👤 {entry.name} — {entry.job}</div>
                    <div className="trace-time-cells">
                      {Object.entries(entry.time_cells).map(([day, info]) => (
                        <span key={day} className={`trace-cell ${info.matched ? 'match' : 'nomatch'}`}>
                          {day}: {info.matched ? `✅ ${info.groups?.[0]}–${info.groups?.[1]}` : `❌ ${info.raw}`}
                        </span>
                      ))}
                    </div>
                  </div>
                );
                if (entry.type === 'col_header') return (
                  <div key={i} className="trace-header">
                    Row {entry.row}: 📅 Date header — dates found: {Object.keys(entry.day_dates).join(', ') || 'NONE'}
                    {entry.date_row_raw && (
                      <div className="trace-date-raw">Raw date row: {entry.date_row_raw.filter(v => v !== 'None').join(' | ')}</div>
                    )}
                  </div>
                );
                if (entry.type === 'section_header') return (
                  <div key={i} className="trace-section">Row {entry.row}: ⏭ Section: {entry.val}</div>
                );
                return <div key={i} className="trace-other">Row {entry.row}: {entry.type} {entry.col0 || ''}</div>;
              })}
            </div>
          )}

          {inspectResult.sample_records?.length > 0 && (
            <div className="inspect-parsed">
              <strong>Sample parsed records ({inspectResult.parsed_count} total):</strong>
              <pre>{JSON.stringify(inspectResult.sample_records, null, 2)}</pre>
            </div>
          )}

          {inspectResult.error && (
            <div className="schedule-error">Error: {inspectResult.error}<br/><pre style={{fontSize:11}}>{inspectResult.traceback}</pre></div>
          )}
        </div>
      )}

      {/* Legend */}
      {roles.length > 0 && (
        <div className="schedule-legend">
          {roles.map(role => (
            <span key={role} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: roleColors[role] }} />
              {role}
            </span>
          ))}
          <span className="legend-item">
            <span className="legend-dot closing-dot" />
            Closing shift
          </span>
        </div>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="schedule-loading">Loading shifts…</div>
      ) : (
        <div className="schedule-content">
          {viewMode === 'gantt' ? renderGantt() : renderDayView()}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="shift-tooltip"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
        >
          <strong>{tooltip.shift.employee_name}</strong>
          {tooltip.shift.primary_job && <div style={{color:'#aaa',fontSize:12}}>{tooltip.shift.primary_job}</div>}
          <div>{formatTime(tooltip.shift.start_time)} – {formatTime(tooltip.shift.end_time)}</div>
          {tooltip.shift.role && <div>Role: {tooltip.shift.role}</div>}
          {tooltip.shift.is_closing && <div className="tooltip-closing">⭐ Closing</div>}
        </div>
      )}
    </div>
  );
}

export default ScheduleTab;
