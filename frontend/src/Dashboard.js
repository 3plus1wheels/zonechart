import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import ScheduleTab from './ScheduleTab';
import './App.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', description: '' });
  const { user, logout } = useAuth();

  const API_URL = 'http://127.0.0.1:8000/api/items/';

  // Fetch items from API
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setItems(data.results || data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch items. Make sure Django server is running.');
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new item
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create item');
      }
      
      const data = await response.json();
      setItems([data, ...items]);
      setNewItem({ name: '', description: '' });
      setError(null);
    } catch (err) {
      setError('Failed to create item. Make sure Django server is running.');
      console.error('Error creating item:', err);
    }
  };

  // Delete item
  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}${id}/`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      
      setItems(items.filter(item => item.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete item.');
      console.error('Error deleting item:', err);
    }
  };

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
            className={`nav-tab${activeTab === 'schedule' ? ' active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`nav-tab${activeTab === 'items' ? ' active' : ''}`}
            onClick={() => setActiveTab('items')}
          >
            Items
          </button>
        </nav>
      </header>

      <main className="tab-content">
        {activeTab === 'schedule' && <ScheduleTab />}

        {activeTab === 'items' && (
          <div className="items-tab">
            {error && <div className="error-message">{error}</div>}

            <div className="form-container">
              <h2>Add New Item</h2>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Item name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
                <button type="submit">Add Item</button>
              </form>
            </div>

            <div className="items-container">
              <h2>Items ({loading ? '…' : items.length})</h2>
              {loading ? (
                <p>Loading...</p>
              ) : items.length === 0 ? (
                <p>No items yet. Create one above!</p>
              ) : (
                <ul className="items-list">
                  {items.map((item) => (
                    <li key={item.id} className="item-card">
                      <h3>{item.name}</h3>
                      <p>{item.description || 'No description'}</p>
                      <div className="item-meta">
                        <span>Status: {item.is_active ? '✅ Active' : '❌ Inactive'}</span>
                        <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                      <button className="delete-btn" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
