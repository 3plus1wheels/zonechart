import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { Palette, Settings } from 'lucide-react';
import Workbook from './Workbook';
import Staff from './Staff';
import API_BASE from './config';
import FloorlyLogo from './FloorlyLogo';
import { applyTheme, isValidHex, normalizeTheme, THEME_HEX_FIELDS, THEME_PRESETS } from './theme';
import './App.css';

const PRESET_ORDER = ['classic', 'ocean', 'forest'];

function ThemeSettingsModal({
  open,
  selectedPreset,
  customTheme,
  saving,
  onClose,
  onSelectPreset,
  onCustomChange,
  onSave,
}) {
  const customValid = useMemo(
    () => THEME_HEX_FIELDS.every((field) => isValidHex(customTheme[field])),
    [customTheme]
  );

  if (!open) return null;

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h3>Theme Settings</h3>
          <button className="settings-close-btn" onClick={onClose}>Close</button>
        </div>

        <p className="settings-help">Pick one of the most popular schemes, or enter custom hex colors.</p>

        <div className="theme-preset-grid">
          {PRESET_ORDER.map((key) => {
            const preset = THEME_PRESETS[key];
            const active = selectedPreset === key;
            return (
              <button
                key={key}
                className={`theme-preset-card${active ? ' active' : ''}`}
                onClick={() => onSelectPreset(key)}
              >
                <span className="theme-preset-name">{preset.label}</span>
                <span className="theme-swatch-row">
                  <span style={{ background: preset.colors.color_primary }} />
                  <span style={{ background: preset.colors.color_accent }} />
                  <span style={{ background: preset.colors.color_background }} />
                  <span style={{ background: preset.colors.color_text }} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="theme-custom-panel">
          <div className="theme-custom-title">Custom (Hex)</div>
          <div className="theme-custom-grid">
            {THEME_HEX_FIELDS.map((field) => {
              const label = field.replace('color_', '').replace('_', ' ');
              const value = customTheme[field] || '';
              const valid = isValidHex(value);

              return (
                <label key={field} className="theme-hex-field">
                  <span>{label}</span>
                  <div className="theme-hex-input-wrap">
                    <span className="theme-hex-chip" style={{ background: valid ? value : '#ffffff' }} />
                    <input
                      value={value}
                      onChange={(e) => onCustomChange(field, e.target.value)}
                      className={valid ? '' : 'invalid'}
                      placeholder="#000000"
                    />
                  </div>
                </label>
              );
            })}
          </div>
          {!customValid && <p className="settings-error">All custom colors must be valid `#RRGGBB` values.</p>}
        </div>

        <div className="settings-actions-row">
          <button className="settings-save-btn" disabled={saving || !customValid} onClick={onSave}>
            {saving ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState('workbook');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('classic');
  const [customTheme, setCustomTheme] = useState({ ...THEME_PRESETS.classic.colors });
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeMessage, setThemeMessage] = useState('');
  const { user, logout } = useAuth();

  useEffect(() => {
    const pref = normalizeTheme(user?.theme_preference);
    setSelectedPreset(pref.preset || 'classic');
    setCustomTheme({
      color_primary: pref.color_primary,
      color_accent: pref.color_accent,
      color_background: pref.color_background,
      color_surface: pref.color_surface,
      color_card: pref.color_card,
      color_text: pref.color_text,
      color_muted: pref.color_muted,
    });
    applyTheme(pref);
  }, [user]);

  const applyPreset = (presetKey) => {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    setSelectedPreset(presetKey);
    setCustomTheme({ ...preset.colors });
    applyTheme({ preset: presetKey, ...preset.colors });
  };

  const handleCustomChange = (field, value) => {
    const next = { ...customTheme, [field]: value };
    setSelectedPreset('custom');
    setCustomTheme(next);
    const canPreview = THEME_HEX_FIELDS.every((name) => isValidHex(next[name]));
    if (canPreview) {
      applyTheme({ preset: 'custom', ...next });
    }
  };

  const saveTheme = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const payload = {
      preset: selectedPreset,
      ...customTheme,
    };

    setSavingTheme(true);
    setThemeMessage('');

    try {
      const res = await fetch(`${API_BASE}/api/auth/theme/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to save theme.');
      }

      const saved = await res.json();
      applyTheme(saved);
      setThemeMessage('Theme saved to your account.');
      setTimeout(() => setThemeMessage(''), 2500);
      setSettingsOpen(false);
    } catch (err) {
      setThemeMessage(err.message || 'Unable to save theme.');
    } finally {
      setSavingTheme(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-top">
          <div className="header-brand">
            <FloorlyLogo size="md" color="var(--color-primary)" className="header-logo" />
            <p className="header-subtitle">Daily retail floor execution dashboard</p>
          </div>
          <div className="user-info">
            <button className="settings-btn" onClick={() => setSettingsOpen(true)}>
              <Settings size={14} />
              Settings
            </button>
            <span className="user-greeting">{user?.username}</span>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>
        {themeMessage && (
          <div className="theme-message">
            <Palette size={14} />
            {themeMessage}
          </div>
        )}

        <nav className="nav-tabs">
          <button
            className={`nav-tab${activeTab === 'workbook' ? ' active' : ''}`}
            onClick={() => setActiveTab('workbook')}
          >
            Workbook
          </button>
          <button
            className={`nav-tab${activeTab === 'staff' ? ' active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            Staff
          </button>
        </nav>
      </header>

      <main className="tab-content">
        {activeTab === 'workbook' && <Workbook />}
        {activeTab === 'staff'    && <Staff />}
      </main>

      <ThemeSettingsModal
        open={settingsOpen}
        selectedPreset={selectedPreset}
        customTheme={customTheme}
        saving={savingTheme}
        onClose={() => setSettingsOpen(false)}
        onSelectPreset={applyPreset}
        onCustomChange={handleCustomChange}
        onSave={saveTheme}
      />
    </div>
  );
}

export default Dashboard;
