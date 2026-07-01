import React, { useState } from 'react';
import { User, LogOut, PhoneCall, Check, UserX, AlertTriangle, ArrowRightLeft, Users, Play } from 'lucide-react';

export default function StaffView({ departments, ticketsState, user, onLogin, onLogout }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [transferDeptId, setTransferDeptId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    setIsLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const err = await res.json();
        setLoginError(err.error || 'Login failed');
        return;
      }

      const userData = await res.json();
      onLogin(userData);
    } catch (err) {
      console.error(err);
      setLoginError('Error connecting to authentication server');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // If user is not logged in, show the login card
  if (!user) {
    return (
      <div className="view-container animate-slide-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              display: 'inline-flex', 
              padding: '0.75rem', 
              borderRadius: '50%', 
              backgroundColor: 'hsl(var(--primary-glow))',
              color: 'hsl(var(--primary))',
              marginBottom: '1rem'
            }}>
              <User size={32} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Staff Console</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Access doctor portals and clinical desk dashboards.
            </p>
          </div>

          {loginError && (
            <div style={{ 
              backgroundColor: 'hsl(var(--accent-rose-glow))',
              border: '1px solid hsl(var(--accent-rose) / 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'hsl(var(--accent-rose))',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. doctor1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn" 
              style={{ width: '100%', marginTop: '1rem', padding: '0.8rem' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>
            <p>Admin credentials: <strong>admin</strong> / <strong>admin123</strong></p>
            <p>Doctor credentials: <strong>doctor1</strong> / <strong>doc123</strong></p>
          </div>
        </div>
      </div>
    );
  }

  // Admin users are directed to the admin page or told they can switch views
  if (user.role === 'admin') {
    return (
      <div className="view-container animate-slide-in">
        <div className="glass-card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
          <div style={{ color: 'hsl(var(--accent-amber))', marginBottom: '1.5rem' }}>
            <AlertTriangle size={48} />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Administrator Account</h2>
          <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem' }}>
            You are signed in as an Admin. Admin accounts manage global settings, departments, and metrics.
            Please use the <strong>Admin Dashboard</strong> view from the navigation menu above to manage the system.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={onLogout}>
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Doctor Portal View
  const deptId = user.department_id;
  const myQueue = ticketsState.waiting.filter(t => t.department_id === deptId);
  const myCallingTicket = ticketsState.calling.find(t => t.department_id === deptId);

  const handleCallNext = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/tickets/call-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: deptId })
      });

      if (!res.ok) {
        if (res.status === 404) {
          alert('No patients waiting in queue for your department.');
        } else {
          alert('Error calling next patient');
        }
        return;
      }
      // State will update via SSE
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (actionType) => {
    if (!myCallingTicket || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tickets/${myCallingTicket.id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!res.ok) {
        alert(`Failed to ${actionType} ticket`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!myCallingTicket || !transferDeptId || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/tickets/${myCallingTicket.id}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department_id: parseInt(transferDeptId, 10) })
      });

      if (res.ok) {
        setTransferDeptId('');
      } else {
        alert('Failed to transfer patient');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const otherDepts = departments.filter(d => d.id !== deptId);

  return (
    <div className="view-container animate-slide-in">
      {/* Doctor Header Banner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border-color))',
        padding: '1rem 2rem',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'white' }}>Welcome, Dr. {user.username}</h2>
          <p style={{ color: 'hsl(var(--accent-cyan))', fontWeight: 600, fontSize: '0.95rem' }}>
            {user.department_name} desk • <span style={{ color: 'white' }}>{user.room_number}</span>
          </p>
        </div>
        <button className="btn btn-secondary" onClick={onLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="grid-2">
        {/* Call Controls & Active Ticket */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Call Panel */}
          <div className="glass-card" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-secondary))' }}>
              <span>Current Session</span>
            </h3>

            {myCallingTicket ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="badge badge-calling animate-pulse-slow" style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                    IN SESSION
                  </span>
                </div>
                
                <h1 style={{ fontSize: '6rem', fontWeight: 900, lineHeight: 1, color: 'white', margin: '0.5rem 0' }}>
                  {myCallingTicket.ticket_number}
                </h1>
                
                <p style={{ fontSize: '1.3rem', color: 'white', fontWeight: 600 }}>
                  {myCallingTicket.patient_name}
                </p>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginBottom: '2rem' }}>
                  Patient Contact: {myCallingTicket.patient_phone || 'None provided'}
                </p>

                {/* Operations Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => handleAction('complete')} 
                    className="btn btn-accent-emerald"
                    disabled={actionLoading}
                  >
                    <Check size={18} /> Complete Session
                  </button>
                  <button 
                    onClick={() => handleAction('noshow')} 
                    className="btn btn-accent-rose"
                    disabled={actionLoading}
                  >
                    <UserX size={18} /> Mark No-Show
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                  <button 
                    onClick={() => handleAction('recall')} 
                    className="btn btn-secondary" 
                    style={{ width: '100%', gap: '0.5rem' }}
                    disabled={actionLoading}
                  >
                    <PhoneCall size={16} style={{ color: 'hsl(var(--accent-cyan))' }} /> Recall (Repeat Announcement)
                  </button>
                </div>

                {/* Patient Transfer */}
                <div style={{ 
                  borderTop: '1px solid hsl(var(--border-color))', 
                  paddingTop: '1.5rem', 
                  textAlign: 'left' 
                }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'hsl(var(--text-secondary))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowRightLeft size={14} /> Transfer Patient
                  </h4>
                  <form onSubmit={handleTransfer} style={{ display: 'flex', gap: '0.75rem' }}>
                    <select
                      className="form-select"
                      style={{ flex: 1, padding: '0.5rem' }}
                      value={transferDeptId}
                      onChange={(e) => setTransferDeptId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose Target Dept --</option>
                      {otherDepts.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.room_number})</option>
                      ))}
                    </select>
                    <button 
                      type="submit" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.5rem 1rem' }}
                      disabled={actionLoading || !transferDeptId}
                    >
                      Transfer
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.7 }}>
                <Users size={64} style={{ color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.4rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.5rem' }}>No Active Patient</h3>
                <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  You are not serving anyone right now. Click "Call Next Patient" to summon the first person in queue.
                </p>
                <button 
                  onClick={handleCallNext} 
                  className="btn" 
                  style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                  disabled={actionLoading || myQueue.length === 0}
                >
                  Call Next Patient
                </button>
              </div>
            )}
          </div>

          {/* Call Next Button Bar (only shows if serving a patient) */}
          {myCallingTicket && (
            <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <button 
                onClick={handleCallNext} 
                className="btn btn-secondary" 
                style={{ width: '100%', border: '1px solid hsl(var(--primary) / 0.3)', color: 'white', backgroundColor: 'hsl(var(--primary-glow))' }}
                disabled={actionLoading || myQueue.length === 0}
              >
                Call Next Patient (Completes Current)
              </button>
            </div>
          )}

        </div>

        {/* Doctor's Queue List */}
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ 
            fontSize: '1.3rem', 
            marginBottom: '1.5rem', 
            borderBottom: '1px solid hsl(var(--border-color))', 
            paddingBottom: '0.75rem',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <span>Waiting Patients</span>
            <span style={{ 
              fontSize: '0.85rem', 
              backgroundColor: 'hsl(var(--primary-glow))', 
              color: 'hsl(var(--primary))', 
              border: '1px solid hsl(var(--primary) / 0.2)',
              padding: '0.2rem 0.6rem', 
              borderRadius: '9999px' 
            }}>
              {myQueue.length} Waiting
            </span>
          </h3>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '480px' }}>
            {myQueue.length > 0 ? (
              myQueue.map((ticket, index) => (
                <div key={ticket.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '1rem', 
                  backgroundColor: 'hsl(var(--bg-surface) / 0.5)', 
                  border: '1px solid hsl(var(--border-color))', 
                  borderRadius: 'var(--radius-md)' 
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'white' }}>{ticket.ticket_number}</span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        backgroundColor: 'hsl(var(--bg-surface-hover))', 
                        color: 'hsl(var(--text-secondary))',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px' 
                      }}>
                        #{index + 1} in line
                      </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'white', marginTop: '0.25rem' }}>
                      {ticket.patient_name}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', textAlign: 'right' }}>
                    Waiting: {Math.max(1, Math.round((new Date() - new Date(ticket.created_at)) / 60000))}m ago
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '5rem 0', color: 'hsl(var(--text-muted))' }}>
                <p>No patients in queue.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Patients will appear here when they register at the kiosk.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
