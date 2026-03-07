import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import './Workbook.css';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ZONE_OPTIONS = ['WOMENS', 'MENS', 'FITS', 'CASH', 'GREET', 'FLEX', 'OFFICE', 'TASK', 'STYLIST', 'CEL', 'BOH'];

// ─── Hourly segments configuration ───────────────────────────────────────────
// Each segment: label shown in header, start hour (24h), end hour (24h)
const DEFAULT_SEGMENTS = [
  { label: '10am - 11am', start: 10, end: 11 },
  { label: '11am - 12pm', start: 11, end: 12 },
  { label: '12pm - 1pm',  start: 12, end: 13 },
  { label: '1pm - 2pm',   start: 13, end: 14 },
  { label: '2pm - 3pm',   start: 14, end: 15 },
  { label: '3pm - 4pm',   start: 15, end: 16 },
  { label: '4pm - 5pm',   start: 16, end: 17 },
  { label: '5pm - 6pm',   start: 17, end: 18 },
  { label: '6pm - 7pm',   start: 18, end: 19 },
  { label: '7pm - 8pm',   start: 19, end: 20 },
  { label: '8pm - 9pm',   start: 20, end: 21 },
];

// Default contribution percentages (must total 100)
const DEFAULT_CONTRIBUTIONS = [3, 6, 8, 9, 12, 15, 12, 9, 9, 9, 8];

// Default KPI rows shown in Hourly Segments (user can remove or add custom ones)
const DEFAULT_KPI_ROWS = [
  { id: 'traffic',      label: 'TRAFFIC',                 key: 'traffic'      },
  { id: 'transactions', label: 'TRANSACTIONS',            key: 'transactions' },
  { id: 'conversion',   label: 'CONVERSION',              key: 'conversion',  computed: 'conversion' },
  { id: 'upt',          label: 'UPT',                     key: 'upt'          },
  { id: 'atv',          label: 'ATV',                     key: 'atv',         format: 'currency' },
  { id: 'other',        label: 'OTHER:',                  key: 'other'        },
  { id: 'actual',       label: 'HOURLY SALES ACTUAL',     key: 'actual',      format: 'currency' },
  { id: 'cel',          label: 'CEL SIGN-OFF (INITIALS)', key: 'cel'          },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function parseCurrency(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(String(val).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

function formatCurrency(n) {
  if (n === null || n === undefined || n === '') return '';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPct(n) {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toFixed(0) + '%';
}

// Editable cell that can switch between display and input mode
function EditCell({ value, onChange, format, className, style, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const inputRef = useRef(null);

  const startEdit = () => {
    setRaw(value !== null && value !== undefined && value !== '' ? String(value) : '');
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const num = parseFloat(String(raw).replace(/[$,%]/g, ''));
    onChange(isNaN(num) ? '' : num);
    setEditing(false);
  };

  if (editing) {
    return (
      <td className={className} style={style}>
        <input
          ref={inputRef}
          className="wb-inline-input"
          value={raw}
          onChange={e => setRaw(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          placeholder={placeholder}
        />
      </td>
    );
  }

  const display = value !== '' && value !== null && value !== undefined
    ? (format ? format(value) : value)
    : <span className="wb-cell-empty">{placeholder || '—'}</span>;

  return (
    <td className={`${className || ''} wb-editable`} style={style} onClick={startEdit} title="Click to edit">
      {display}
    </td>
  );
}

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

// ─── Today's Goals panel ─────────────────────────────────────────────────────
function TodaysGoals({ goals, onChange, segments }) {
  // goals: { daySalesTarget, stretchTarget, lastYearSales, lastYearTraffic,
  //           trafficTrend, projectedTraffic, transactionGoal, conversionTarget,
  //           upt, atv, monthSalesPlan, monthToDateSales }
  const set = (key) => (val) => onChange({ ...goals, [key]: val });

  const pctOfPlan = goals.monthSalesPlan && goals.monthToDateSales
    ? ((parseCurrency(goals.monthToDateSales) / parseCurrency(goals.monthSalesPlan)) * 100).toFixed(1) + '%'
    : '';
  const monthToGo = goals.monthSalesPlan && goals.monthToDateSales
    ? formatCurrency(parseCurrency(goals.monthSalesPlan) - parseCurrency(goals.monthToDateSales))
    : '';

  // Compute projected traffic from last year + trend
  const computedProjected = (() => {
    const ly = parseCurrency(goals.lastYearTraffic);
    const trend = goals.trafficTrend !== '' && goals.trafficTrend !== null && goals.trafficTrend !== undefined
      ? parseFloat(goals.trafficTrend) : null;
    if (ly !== null && trend !== null) return Math.round(ly * (1 + trend / 100));
    return null;
  })();

  return (
    <div className="wb-goals-panel">
      <div className="wb-goals-header">TODAY'S GOALS</div>
      <table className="wb-goals-table">
        <tbody>
          <tr>
            <td className="wb-goals-label">DATE</td>
            <td className="wb-goals-value wb-goals-plain">{new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }).replace(/\//g, '.')}</td>
          </tr>
          <tr className="wb-goals-highlight">
            <td className="wb-goals-label">DAY SALES TARGET</td>
            <EditCell value={goals.daySalesTarget} onChange={set('daySalesTarget')} format={formatCurrency} className="wb-goals-value" placeholder="$0" />
          </tr>
          <tr className="wb-goals-highlight">
            <td className="wb-goals-label">STRETCH TARGET</td>
            <EditCell value={goals.stretchTarget} onChange={set('stretchTarget')} format={formatCurrency} className="wb-goals-value" placeholder="$0" />
          </tr>
          <tr>
            <td className="wb-goals-label">LAST YEAR SALES</td>
            <EditCell value={goals.lastYearSales} onChange={set('lastYearSales')} format={formatCurrency} className="wb-goals-value" placeholder="$0" />
          </tr>
          <tr>
            <td className="wb-goals-label">LAST YEAR TRAFFIC</td>
            <EditCell value={goals.lastYearTraffic} onChange={set('lastYearTraffic')} className="wb-goals-value" placeholder="0" />
          </tr>
          <tr>
            <td className="wb-goals-label">CURRENT TRAFFIC TREND (+/-)</td>
            <EditCell value={goals.trafficTrend} onChange={set('trafficTrend')} format={v => v + '%'} className="wb-goals-value" placeholder="0%" />
          </tr>
          <tr className="wb-goals-computed">
            <td className="wb-goals-label">PROJECTED TRAFFIC</td>
            <td className="wb-goals-value">{computedProjected !== null ? computedProjected : (goals.projectedTraffic || '—')}</td>
          </tr>
          <tr className="wb-goals-highlight">
            <td className="wb-goals-label">TRANSACTION GOAL</td>
            <EditCell value={goals.transactionGoal} onChange={set('transactionGoal')} className="wb-goals-value" placeholder="0" />
          </tr>
          <tr>
            <td className="wb-goals-label">CONVERSION TARGET</td>
            <EditCell value={goals.conversionTarget} onChange={set('conversionTarget')} format={v => v + '%'} className="wb-goals-value" placeholder="0%" />
          </tr>
          <tr>
            <td className="wb-goals-label">UPT</td>
            <EditCell value={goals.upt} onChange={set('upt')} className="wb-goals-value" placeholder="0.00" />
          </tr>
          <tr>
            <td className="wb-goals-label">ATV</td>
            <EditCell value={goals.atv} onChange={set('atv')} format={formatCurrency} className="wb-goals-value" placeholder="$0" />
          </tr>

          {/* Month to date */}
          <tr>
            <td colSpan={2} className="wb-goals-section-header">MONTH TO DATE PERFORMANCE</td>
          </tr>
          <tr>
            <td className="wb-goals-label">MONTH SALES PLAN</td>
            <EditCell value={goals.monthSalesPlan} onChange={set('monthSalesPlan')} format={formatCurrency} className="wb-goals-value" placeholder="$0" />
          </tr>
          <tr>
            <td className="wb-goals-label">MONTH TO DATE SALES</td>
            <EditCell value={goals.monthToDateSales} onChange={set('monthToDateSales')} format={formatCurrency} className="wb-goals-value" placeholder="$0" />
          </tr>
          <tr>
            <td className="wb-goals-label">% TO MONTH SALES PLAN</td>
            <td className="wb-goals-value">{pctOfPlan || '—'}</td>
          </tr>
          <tr>
            <td className="wb-goals-label">MONTH TO GO</td>
            <td className="wb-goals-value">{monthToGo || '—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Hourly Segments panel ────────────────────────────────────────────────────
function HourlySegments({ goals, hourly, setHourly, segments, kpiRows }) {
  const daySales   = parseCurrency(goals.daySalesTarget) || 0;
  const dayStretch = parseCurrency(goals.stretchTarget)  || 0;

  const contribs = segments.map((_, i) => hourly[i]?.pct ?? DEFAULT_CONTRIBUTIONS[i] ?? 0);
  const totalPct = contribs.reduce((a, b) => a + b, 0);

  const cumSalesTarget = [];
  const cumStretchTarget = [];
  let runSales = 0, runStretch = 0;
  contribs.forEach(pct => {
    runSales   += daySales   * (pct / 100);
    runStretch += dayStretch * (pct / 100);
    cumSalesTarget.push(runSales);
    cumStretchTarget.push(runStretch);
  });

  const cumActual = [];
  let runActual = 0;
  segments.forEach((_, i) => {
    const a = parseCurrency(hourly[i]?.actual);
    runActual += (a || 0);
    cumActual.push(a !== null ? runActual : null);
  });

  const setCell = (i, key) => (val) => {
    setHourly(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  };

  // Fixed header rows (always shown)
  const fixedRows = [
    {
      label: 'HOURLY SALES CONTRIBUTION %', highlight: true,
      cells: segments.map((_, i) => ({ value: contribs[i], format: formatPct, onChange: setCell(i, 'pct'), editable: true })),
      extra: totalPct !== 100 ? <span className="wb-hs-warning">{totalPct}%</span> : <span className="wb-hs-ok">100%</span>,
    },
    {
      label: 'CUMULATIVE SALES TARGET', highlight: true,
      cells: segments.map((_, i) => ({ value: cumSalesTarget[i] || '', format: v => formatCurrency(Math.round(v)), editable: false })),
    },
    {
      label: 'CUMULATIVE STRETCH TARGET',
      cells: segments.map((_, i) => ({ value: cumStretchTarget[i] || '', format: v => formatCurrency(Math.round(v)), editable: false })),
    },
    {
      label: 'CUMULATIVE SALES ACTUAL',
      cells: segments.map((_, i) => ({ value: cumActual[i], format: v => formatCurrency(Math.round(v)), editable: false, derived: true })),
    },
    { spacer: true },
  ];

  // Configurable KPI rows
  const kpiRowDefs = kpiRows.map(row => {
    if (row.computed === 'conversion') {
      return {
        label: row.label,
        cells: segments.map((_, i) => {
          const tr = parseFloat(hourly[i]?.traffic);
          const tx = parseFloat(hourly[i]?.transactions);
          const cv = (!isNaN(tr) && tr > 0 && !isNaN(tx)) ? formatPct((tx / tr) * 100) : '';
          return { value: cv, editable: false, derived: true };
        }),
      };
    }
    const fmt = row.format === 'currency' ? (v => formatCurrency(v)) : undefined;
    return {
      label: row.label,
      cells: segments.map((_, i) => ({
        value: hourly[i]?.[row.key] ?? '',
        onChange: setCell(i, row.key),
        format: fmt,
        editable: true,
      })),
    };
  });

  const allRows = [...fixedRows, ...kpiRowDefs];
  const nonSpacerCount = allRows.filter(r => !r.spacer).length;

  return (
    <div className="wb-hs-wrap">
      <table className="wb-hs-table">
        <thead>
          <tr>
            <th className="wb-hs-section-title" colSpan={segments.length + 2}>HOURLY SEGMENTS</th>
          </tr>
          <tr>
            <th className="wb-hs-row-label">HOURS OF OPERATIONS</th>
            {segments.map((seg, i) => (
              <th key={i} className="wb-hs-col-header">{seg.label}</th>
            ))}
            <th className="wb-hs-notes-header">NOTES &amp; OBSERVATIONS<br/><span className="wb-hs-notes-sub">Complete throughout the day</span></th>
          </tr>
        </thead>
        <tbody>
          {allRows.map((row, ri) => {
            if (row.spacer) return <tr key={ri} className="wb-hs-spacer"><td colSpan={segments.length + 2} /></tr>;
            return (
              <tr key={ri} className={row.highlight ? 'wb-hs-highlight' : ''}>
                <td className="wb-hs-row-label">{row.label}{row.extra && <span style={{ marginLeft: 8 }}>{row.extra}</span>}</td>
                {row.cells.map((cell, ci) => {
                  if (cell.editable && cell.onChange) {
                    return (
                      <EditCell
                        key={ci}
                        value={cell.value}
                        onChange={cell.onChange}
                        format={cell.format}
                        className={`wb-hs-cell${cell.derived ? ' wb-hs-derived' : ''}`}
                      />
                    );
                  }
                  const display = cell.value !== '' && cell.value !== null && cell.value !== undefined
                    ? (cell.format ? cell.format(cell.value) : cell.value)
                    : '';
                  return (
                    <td key={ci} className={`wb-hs-cell${cell.derived ? ' wb-hs-derived' : ''}`}>{display}</td>
                  );
                })}
                {ri === 0 ? <td className="wb-hs-notes-cell" rowSpan={nonSpacerCount} /> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Workbook component ──────────────────────────────────────────────────
export default function Workbook() {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [activeDay, setActiveDay] = useState('Mon');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [overrides, setOverrides] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // KPI row configuration — shared across all days
  const [kpiRows, setKpiRows] = useState(DEFAULT_KPI_ROWS);
  const [editingKpis, setEditingKpis] = useState(false);
  const [newKpiLabel, setNewKpiLabel] = useState('');

  // Goals state (persists per day in local storage key)
  const [goals, setGoals] = useState({
    daySalesTarget: '', stretchTarget: '', lastYearSales: '',
    lastYearTraffic: '', trafficTrend: '', projectedTraffic: '',
    transactionGoal: '', conversionTarget: '', upt: '', atv: '',
    monthSalesPlan: '', monthToDateSales: '',
  });

  // Hourly state: array of per-segment objects
  const [hourly, setHourly] = useState(() => DEFAULT_SEGMENTS.map((_, i) => ({
    pct: DEFAULT_CONTRIBUTIONS[i] ?? 0,
    actual: '', traffic: '', transactions: '', upt: '', atv: '', other: '', cel: '',
  })));

  const segments = DEFAULT_SEGMENTS;

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

  const handlePrint = () => window.print();

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/schedule/import/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Import failed');
      setImportResult(result);
      if ((result.shifts_created ?? 0) > 0 || (result.shifts_updated ?? 0) > 0) {
        if (result.week_start) {
          setWeekStart(new Date(result.week_start + 'T00:00:00'));
        } else {
          fetchWorkbook();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

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
        <div className="wb-topbar-actions">
          {hasOverrides && (
            <button className="wb-reset-btn" onClick={() => setOverrides({})}>
              Reset overrides
            </button>
          )}
          <button
            className="wb-import-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            title="Import XLSX schedule"
          >
            {importing ? '⏳ Importing…' : '📥 Import XLSX'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button
            className={`wb-customize-btn${editingKpis ? ' active' : ''}`}
            onClick={() => setEditingKpis(e => !e)}
            title="Customize KPI rows"
          >
            ⚙ KPIs
          </button>
          <button className="wb-print-btn" onClick={handlePrint} title="Print workbook">
            🖨️ Print
          </button>
        </div>
      </div>
      {importResult && (
        <div className="wb-import-result">
          ✅ Imported: {importResult.shifts_created ?? 0} created, {importResult.shifts_updated ?? 0} updated
        </div>
      )}

      {/* ── KPI editor panel ── */}
      {editingKpis && (
        <div className="wb-kpi-editor">
          <div className="wb-kpi-editor-title">Customize KPI Rows <span className="wb-kpi-editor-sub">(changes apply to all days)</span></div>
          <div className="wb-kpi-list">
            {kpiRows.map((row, i) => (
              <div key={row.id} className="wb-kpi-item">
                <span className="wb-kpi-item-label">{row.label}</span>
                <button
                  className="wb-kpi-remove-btn"
                  onClick={() => setKpiRows(prev => prev.filter((_, j) => j !== i))}
                  title="Remove row"
                >✕</button>
              </div>
            ))}
          </div>
          <div className="wb-kpi-add">
            <input
              className="wb-kpi-add-input"
              value={newKpiLabel}
              onChange={e => setNewKpiLabel(e.target.value)}
              placeholder="New KPI label…"
              onKeyDown={e => {
                if (e.key === 'Enter' && newKpiLabel.trim()) {
                  const id = 'custom_' + Date.now();
                  setKpiRows(prev => [...prev, { id, label: newKpiLabel.trim().toUpperCase(), key: id }]);
                  setNewKpiLabel('');
                }
              }}
            />
            <button
              className="wb-kpi-add-btn"
              onClick={() => {
                if (!newKpiLabel.trim()) return;
                const id = 'custom_' + Date.now();
                setKpiRows(prev => [...prev, { id, label: newKpiLabel.trim().toUpperCase(), key: id }]);
                setNewKpiLabel('');
              }}
            >+ Add</button>
            <button
              className="wb-kpi-reset-btn"
              onClick={() => setKpiRows(DEFAULT_KPI_ROWS)}
              title="Restore all default rows"
            >Reset defaults</button>
          </div>
        </div>
      )}

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

      {/* ── Hourly Segments (top panel) ── */}
      <HourlySegments goals={goals} hourly={hourly} setHourly={setHourly} segments={segments} kpiRows={kpiRows} />

      {/* ── Main body: Goals + Zone Chart side by side ── */}
      <div className="wb-body-layout">
        {/* Left: Today's Goals */}
        <TodaysGoals goals={goals} onChange={setGoals} segments={segments} />

        {/* Right: Zone chart */}
        <div className="wb-zone-section">
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

          {!data && !loading && !error && (
            <div className="wb-no-data">No data. Import a schedule first.</div>
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
      </div>
    </div>
  );
}
