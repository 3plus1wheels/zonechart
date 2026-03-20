import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Inbox, LoaderCircle, Users } from 'lucide-react';
import API_BASE from './config';
import './Staff.css';

const ZONES = ['mens', 'womens', 'cash', 'fits', 'greet', 'boh'];
const ZONE_LABELS = ['MENS', 'WOMENS', 'CASH', 'FITS', 'GREET', 'BOH'];

const LEVEL_LABELS = ['No experience', 'Have training', 'Good', 'Expert'];
const LEVEL_CLASS  = ['lv0', 'lv1', 'lv2', 'lv3'];

function displayName(raw) {
  if (!raw) return raw;
  if (raw.includes(',')) {
    const [last, first] = raw.split(',');
    return `${first.trim()} ${last.trim()}`;
  }
  return raw;
}

export default function Staff() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState({});   // { employee_id: true }

  const token = localStorage.getItem('access_token');

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/schedule/staff/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setRows(await res.json());
      setError(null);
    } catch (e) {
      setError('Failed to load staff data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleChange = async (employeeId, zone, newLevel) => {
    const prevLevel = rows.find(r => r.employee_id === employeeId)?.[zone] ?? 0;
    const nextLevel = parseInt(newLevel, 10);

    // Optimistic update
    setRows(prev =>
      prev.map(r =>
        r.employee_id === employeeId ? { ...r, [zone]: nextLevel } : r
      )
    );

    setSaving(prev => ({ ...prev, [employeeId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/schedule/staff/${employeeId}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [zone]: nextLevel }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
    } catch {
      // Revert on failure
      setRows(prev =>
        prev.map(r =>
          r.employee_id === employeeId ? { ...r, [zone]: prevLevel } : r
        )
      );
    } finally {
      setSaving(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  return (
    <div className="staff-wrap">
      <div className="staff-header">
        <h2 className="staff-title">Staff Skills</h2>
        <p className="staff-subtitle">Select each staff member's skill level per zone</p>
      </div>

      {error && (
        <div className="state-card inline error">
          <AlertTriangle className="state-icon" />
          <div>
            <p className="state-title">Unable to load staff</p>
            <p className="state-copy">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="state-card inline">
          <LoaderCircle className="state-icon" />
          <div>
            <p className="state-title">Loading staff matrix</p>
            <p className="state-copy">Syncing latest employee skill levels.</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="state-card inline">
          <Inbox className="state-icon" />
          <div>
            <p className="state-title">No staff records yet</p>
            <p className="state-copy">Import a schedule to populate your team and start assigning zone confidence.</p>
          </div>
        </div>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th className="staff-name-col">Name</th>
                {ZONE_LABELS.map(z => (
                  <th key={z} className="staff-zone-col">{z}</th>
                ))}
                <th className="staff-zone-col">ROLE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.employee_id} className={saving[row.employee_id] ? 'saving' : ''}>
                  <td className="staff-name-cell">{displayName(row.name)}</td>
                  {ZONES.map(zone => {
                    const level = row[zone] ?? 0;
                    return (
                      <td key={zone} className={`staff-zone-cell ${LEVEL_CLASS[level]}`}>
                        <select
                          value={level}
                          onChange={e => handleChange(row.employee_id, zone, e.target.value)}
                          className={`zone-select ${LEVEL_CLASS[level]}`}
                          disabled={!!saving[row.employee_id]}
                        >
                          {LEVEL_LABELS.map((label, i) => (
                            <option key={i} value={i}>{label}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                  <td className="staff-name-cell" style={{ fontWeight: 500, color: '#6f6f78' }}>
                    <Users style={{ width: 14, height: 14, marginRight: 6, verticalAlign: 'text-bottom' }} />
                    {row.primary_job || 'Associate'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
