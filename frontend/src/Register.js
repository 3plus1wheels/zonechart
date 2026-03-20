import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Link } from 'react-router-dom';
import { AlertCircle, UserRoundPlus } from 'lucide-react';
import FloorlyLogo from './FloorlyLogo';
import './Auth.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const passwordTooShort = formData.password.length > 0 && formData.password.length < 8;
  const passwordsMismatch = formData.password2.length > 0 && formData.password !== formData.password2;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password2) {
      setError("Passwords don't match");
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    const result = await register(
      formData.username,
      formData.password,
      formData.password2,
      formData.email
    );
    
    if (!result.success) {
      try {
        const errorObj = JSON.parse(result.error);
        const errorMessages = Object.entries(errorObj)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        setError(errorMessages);
      } catch {
        setError(result.error || 'Registration failed. Please try again.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo-wrap">
          <FloorlyLogo size="sm" color="var(--color-primary)" />
        </div>
        <div className="auth-card-title-row">
          <UserRoundPlus className="auth-card-icon" />
          <h2>Create Account</h2>
        </div>
        <p className="auth-subtitle">Set up your Floorly workspace and start planning with precision.</p>
        {error && (
          <div className="error-message" style={{ whiteSpace: 'pre-line' }}>
            <AlertCircle />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <div className="auth-helper">At least 8 characters.</div>
            {passwordTooShort && <div className="field-error">Password is too short.</div>}
          </div>
          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              required
              disabled={loading}
            />
            {passwordsMismatch && <div className="field-error">Passwords do not match.</div>}
          </div>
          <button type="submit" disabled={loading || passwordTooShort || passwordsMismatch}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="toggle-text">
          Already have an account?{' '}
          <Link className="toggle-link" to="/login">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
