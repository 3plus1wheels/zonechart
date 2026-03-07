import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import './Workbook.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ZONE_OPTIONS = ['WOMENS', 'MENS', 'FITS', 'CASH', 'GREET', 'FLEX', 'OFFICE', 'TASK', 'STYLIST', 'CEL', 'BOH'];

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const ZONE_STYLE = {
  WOMENS:  { bg: '#e91e63', text: '#fff' },
  MENS:    { bg: '#1976d2', text: '#fff' },
  FITS:    { bg: '#7b1fa2', text: '#fff' },
  CASH:    { bg: '#00897b', text: '#fff' },
  GREET:   { bg: '#f57c00', text: '#fff' },
  FLEX:    { bg: '#b2dfdb', text: '#1b5e20' },
  OFFICE:  { bg: '#455a64', text: '#fff' },
  TASK:    { bg: '#6d4c41', text: '#fff' },
  STYLIST: { bg: '#4caf50', text: '#fff' },
  CEL:     { bg: '#0288d1', text: '#fff' },
  BOH:     { bg: '#ff9800', text: '#fff' },
};

function zoneStyle(zone) {
  return ZONE_STYLE[zone] || { bg: '#555', text: '#fff' };
}

function ZoneCell({ zone, cellKey, overrides, setOverrides }) {
  const [open, setOpen] = useState(false);
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const cellRef = useRef(null);
  const effective = overrides[cellKey] || zone;
  const isOverridden = !!overrides[cellKey];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (cellRef.current && cellRef.current.contains(e.target)) return;
      if (e.target.closest('.wb-zone-picker')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on scroll/resize so picker doesn't drift
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  if (!zone) return <td className="wb-hour-cell" />;

  const s = zoneStyle(effective);

  const handleClick = () => {
    if (!open && cellRef.current) {
      const rect = cellRef.current.getBoundingClientRect();
      setPickerPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(o => !o);
  };

  const picker = open ? ReactDOM.createPortal(
    <div
      className="wb-zone-picker"
      style={{ top: pickerPos.top, left: pickerPos.left }}
      onMouseDown={e => e.stopPropagation()}
    >
      {ZONE_OPTIONS.map(z => {
        const zs = zoneStyle(z);
        return (
          <div
            key={z}
            className={`wb-zone-option${effective === z ? ' selected' : ''}`}
            style={{ backgroundColor: zs.bg, color: zs.text }}
            onClick={() => { setOverrides(prev => ({ ...prev, [cellKey]: z })); setOpen(false); }}
          >
            {z}
          </div>
        );
      })}
    </div>,
    document.body
  ) : null;

  return (
    <td
      ref={cellRef}
      className={`wb-hour-cell wb-hour-clickable${isOverridden ? ' wb-overridden' : ''}`}
      style={{ backgroundColor: s.bg, color: s.text }}
      onClick={handleClick}
    >
      {effective}
      {picker}
    </td>
  );
}

export default function Workbook() {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [activeDay, setActiveDay] = useState('Mon');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [overrides, setOverrides] = useState({});

  const token = localStorage.getItem('access_token');

  const fetchWorkbook = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOverrides({});
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/schedule/workbook/?week_start=${toYMD(weekStart)}&day=${activeDay}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to fetch workbook');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [weekStart, activeDay, token]);

  useEffect(() => { fetchWorkbook(); }, [fetchWorkbook]);

  const weekDates = DAYS.map((_, i) => addDays(weekStart, i));
  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="wb-root">
      {/* ── Week nav ── */}
      <div className="wb-topbar">
        <div className="wb-week-nav">
          <button onClick={() => setWeekStart(w => addDays(w, -7))}>‹</button>
          <span className="wb-week-label">
            {formatShortDate(weekStart)} – {formatShortDate(addDays(weekStart, 6))}
          </span>
          <button onClick={() => setWeekStart(w => addDays(w, 7))}>›</button>
          <button className="wb-today-btn" onClick={() => setWeekStart(getMondayOfWeek(new Date()))}>Today</button>
        </div>
        {hasOverrides && (
          <button className="wb-reset-btn" onClick={() => setOverrides({})}>
            Reset overrides
          </button>
        )}
      </div>

      {/* ── Day tabs ── */}
      <div className="wb-day-tabs">
        {DAYS.map((day, i) => (
          <button
            key={day}
            className={`wb-day-tab${activeDay === day ? ' active' : ''}`}
            onClick={() => setActiveDay(day)}
          >
            <span className="wb-day-abbr">{day}</span>
            <span className="wb-day-date">{formatShortDate(weekDates[i])}</span>
          </button>
        ))}
      </div>

      {/* ── Zone chart ── */}
      {loading && <div className="wb-status">Loading…</div>}
      {error   && <div className="wb-error">⚠️ {error}</div>}

      {data && !loading && (
        <div className="wb-table-wrap">
          <table className="wb-table">
            <thead>
              <tr>
                <th className="wb-zone-header" colSpan={2 + data.col_headers.length}>
                  ZONE CHART — {data.day.toUpperCase()}&nbsp;&nbsp;
                  <span className="wb-zone-date">{data.date}</span>
                </th>
              </tr>
              <tr>
                <th className="wb-col-name">Name</th>
                <th className="wb-col-shift">Shift</th>
                {data.col_headers.map(h => (
                  <th key={h} className="wb-col-hour">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={2 + data.col_headers.length} className="wb-no-data">
                    No shifts for {data.day} {data.date}. Import a schedule first.
                  </td>
                </tr>
              ) : (
                data.rows.map((row, ri) => (
                  <tr key={ri}>
                    <td className="wb-name-cell">{row.name}</td>
                    <td className="wb-shift-cell">{row.shift}</td>
                    {data.hours.map(h => {
                      const zone = row.zones[String(h)];
                      const cellKey = `${ri}_${h}`;
                      return (
                        <ZoneCell
                          key={h}
                          zone={zone}
                          cellKey={cellKey}
                          overrides={overrides}
                          setOverrides={setOverrides}
                        />
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="wb-legend">
        {Object.entries(ZONE_STYLE).map(([zone, s]) => (
          <span key={zone} className="wb-legend-item" style={{ backgroundColor: s.bg, color: s.text }}>
            {zone}
          </span>
        ))}
      </div>
    </div>
  );
}
