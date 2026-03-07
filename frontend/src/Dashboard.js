import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import Workbook from './Workbook';
import Staff from './Staff';
import './App.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('workbook');
  const { user, logout } = useAuth();

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-top">
          <h1>ZoneChart</h1>
          <div className="user-info">
            <span>Welcome, {user?.username}!</span>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>

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
    </div>
  );
}

export default Dashboard;
