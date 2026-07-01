import React, { useState, useEffect } from 'react';
import { Plus, Trash2, RotateCcw, BarChart3, Activity, Settings, UserCheck, AlertTriangle } from 'lucide-react';

export default function AdminView({ departments, onResetQueue, onDeptCreated, user }) {
  const [stats, setStats] = useState({
    summary: { total_tickets: 0, completed_count: 0, noshow_count: 0, waiting_count: 0, calling_count: 0 },
    deptStats: []
  });
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptPrefix, setNewDeptPrefix] = useState('');
  const [newDeptRoom, setNewDeptRoom] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Error fetching admin statistics:', e);
    }
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchStats();
      const interval = setInterval(fetchStats, 5000); // Auto-refresh statistics every 5 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!newDeptName || !newDeptPrefix || !newDeptRoom) return;

    setIsSubmittingDept(true);
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDeptName,
          code_prefix: newDeptPrefix,
          room_number: newDeptRoom
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to create department');
        return;
      }

      const createdDept = await res.json();
      setNewDeptName('');
      setNewDeptPrefix('');
      setNewDeptRoom('');
      if (onDeptCreated) onDeptCreated(createdDept);
      fetchStats();
    } catch (e) {
      console.error(e);
      alert('Error creating department');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleReset = async () => {
    const confirmReset = window.confirm(
      "WARNING: This will permanently DELETE all active, waiting, and completed tickets. This action cannot be undone.\n\nAre you sure you want to reset all queues?"
    );
    if (!confirmReset) return;

    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (res.ok) {
        alert('All queues have been successfully reset.');
        if (onResetQueue) onResetQueue();
        fetchStats();
      } else {
        alert('Failed to reset queues.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="view-container animate-slide-in" style={{ textAlign: 'center', padding: '5rem 0' }}>
        <div className="glass-card" style={{ maxWidth: '450px', margin: '0 auto', padding: '3rem' }}>
          <AlertTriangle size={48} style={{ color: 'hsl(var(--accent-amber))', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>
            Please log in as an administrator on the **Staff Portal** to access this dashboard.
          </p>
        </div>
      </div>
    );
  }

  const summary = stats.summary || { total_tickets: 0, completed_count: 0, noshow_count: 0, waiting_count: 0, calling_count: 0 };
  const deptStats = stats.deptStats || [];

  return (
    <div className="view-container animate-slide-in">
      
      {/* Admin Title Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Admin <span className="text-gradient">Analytics & Controls</span>
          </h1>
          <p style={{ color: 'hsl(var(--text-secondary))' }}>
            Monitor queue performance metrics and configure clinical units.
          </p>
        </div>
        
        <button 
          onClick={handleReset} 
          className="btn btn-accent-rose" 
          style={{ gap: '0.5rem' }}
          disabled={isResetting}
        >
          <RotateCcw size={16} /> Reset Queue Database
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--primary))', marginBottom: '0.5rem' }}>
            <Activity size={20} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>TODAY</span>
          </div>
          <h4 style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', fontWeight: 600 }}>Total Patients</h4>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{summary.total_tickets || 0}</h2>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--accent-emerald))', marginBottom: '0.5rem' }}>
            <UserCheck size={20} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>SUCCESS</span>
          </div>
          <h4 style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', fontWeight: 600 }}>Consulted</h4>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{summary.completed_count || 0}</h2>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--accent-cyan))', marginBottom: '0.5rem' }}>
            <BarChart3 size={20} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>WAITING</span>
          </div>
          <h4 style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', fontWeight: 600 }}>Pending Queue</h4>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{summary.waiting_count || 0}</h2>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'hsl(var(--accent-rose))', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(var(--text-muted))' }}>ABSENT</span>
          </div>
          <h4 style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.9rem', fontWeight: 600 }}>No Show</h4>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white' }}>{summary.noshow_count || 0}</h2>
        </div>

      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* Department Queue Metrics Chart */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'hsl(var(--primary))' }} />
            Department Load & Timings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {deptStats.length > 0 ? (
              deptStats.map((dept) => {
                const total = summary.total_tickets || 1; // avoid divide by zero
                const percentage = Math.round(((dept.total_tickets || 0) / total) * 100);
                const waitMin = dept.avg_wait_seconds ? Math.round(dept.avg_wait_seconds / 60) : 0;
                const serviceMin = dept.avg_service_seconds ? Math.round(dept.avg_service_seconds / 60) : 0;

                return (
                  <div key={dept.department_name} style={{ borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div>
                        <span style={{ fontWeight: 700, color: 'white' }}>{dept.department_name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginLeft: '0.5rem' }}>
                          [{dept.code_prefix}]
                        </span>
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {dept.total_tickets} ticket(s) ({percentage}%)
                      </span>
                    </div>

                    {/* Custom progress bar representing ticket volume share */}
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: 'hsl(var(--bg-surface-hover))', 
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ 
                        width: `${percentage}%`, 
                        height: '100%', 
                        background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent-cyan)))',
                        borderRadius: '9999px',
                        boxShadow: '0 0 8px hsl(var(--primary) / 0.5)'
                      }} />
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                      <span>Avg. Wait: <strong style={{ color: 'white' }}>{waitMin} min</strong></span>
                      <span>Avg. Consultation: <strong style={{ color: 'white' }}>{serviceMin} min</strong></span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>
                No active metrics for departments. Try creating tickets to see analytics.
              </p>
            )}
          </div>
        </div>

        {/* Create Department Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} style={{ color: 'hsl(var(--accent-cyan))' }} />
              Add Department
            </h3>
            
            <form onSubmit={handleAddDept}>
              <div className="form-group">
                <label className="form-label">Department Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dentistry"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Code Prefix (2-3 chars)</label>
                <input
                  type="text"
                  maxLength={3}
                  className="form-input"
                  placeholder="e.g. DEN"
                  value={newDeptPrefix}
                  onChange={(e) => setNewDeptPrefix(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Room / Counter Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Room 105 or Cabin B"
                  value={newDeptRoom}
                  onChange={(e) => setNewDeptRoom(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn" 
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
                disabled={isSubmittingDept || !newDeptName || !newDeptPrefix || !newDeptRoom}
              >
                <Plus size={16} /> Add Department
              </button>
            </form>
          </div>

          {/* Department List */}
          <div className="glass-card" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ fontSize: '1rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.05em' }}>
              Clinical Units List
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '180px' }}>
              {departments.map((dept) => (
                <div key={dept.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.5rem 0.75rem', 
                  backgroundColor: 'hsl(var(--bg-surface-hover) / 0.4)', 
                  border: '1px solid hsl(var(--border-color))',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dept.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginLeft: '0.5rem' }}>
                      ({dept.code_prefix})
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'hsl(var(--accent-cyan))', fontWeight: 500 }}>
                    {dept.room_number}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
