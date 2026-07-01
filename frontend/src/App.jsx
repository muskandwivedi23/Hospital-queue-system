import React, { useState, useEffect } from 'react';
import { Activity, Ticket, Tv, ShieldAlert, User, LogOut } from 'lucide-react';
import KioskView from './components/KioskView';
import DisplayView from './components/DisplayView';
import StaffView from './components/StaffView';
import AdminView from './components/AdminView';

function App() {
  const [currentView, setCurrentView] = useState('kiosk');
  const [departments, setDepartments] = useState([]);
  const [ticketsState, setTicketsState] = useState({
    waiting: [],
    calling: [],
    recentHistory: []
  });
  
  // Persisted staff session
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('medflow_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Fetch initial system state
  const fetchInitialData = async () => {
    try {
      const deptsRes = await fetch('/api/departments');
      if (deptsRes.ok) {
        const depts = await deptsRes.ok ? await deptsRes.json() : [];
        setDepartments(depts);
      }

      const ticketsRes = await fetch('/api/tickets/state');
      if (ticketsRes.ok) {
        const state = await ticketsRes.json();
        setTicketsState(state);
      }
    } catch (e) {
      console.error('Failed to load initial system data:', e);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Connect to SSE stream for real-time broadcasts
    const eventSource = new EventSource('/api/tickets/live');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('SSE message received:', payload);
        const { type, data } = payload;

        switch (type) {
          case 'connected':
            console.log('Successfully connected to SSE stream');
            break;
          
          case 'TICKET_CREATED':
            setTicketsState(prev => ({
              ...prev,
              waiting: [...prev.waiting, data]
            }));
            break;

          case 'TICKET_CALLING':
          case 'TICKET_RECALLED':
            setTicketsState(prev => {
              // Remove the ticket from waiting list (if it was waiting)
              const newWaiting = prev.waiting.filter(t => t.id !== data.id);
              
              // Remove this department's tickets from calling list to avoid duplicates
              const filteredCalling = prev.calling.filter(t => t.id !== data.id && t.department_id !== data.department_id);
              
              // Add to the front of calling list
              return {
                ...prev,
                waiting: newWaiting,
                calling: [data, ...filteredCalling]
              };
            });
            break;

          case 'TICKET_COMPLETED':
          case 'TICKET_NOSHOW':
            setTicketsState(prev => {
              // Remove from calling
              const newCalling = prev.calling.filter(t => t.id !== data.id);
              
              // Add to recentHistory list (limit to 10 entries)
              const newHistory = [data, ...prev.recentHistory.filter(t => t.id !== data.id)].slice(0, 10);
              
              return {
                ...prev,
                calling: newCalling,
                recentHistory: newHistory
              };
            });
            break;

          case 'TICKET_TRANSFERRED':
            setTicketsState(prev => {
              // Remove from calling (as it was in session when transferred)
              const newCalling = prev.calling.filter(t => t.id !== data.id);
              // Add back to waiting list
              return {
                ...prev,
                calling: newCalling,
                waiting: [...prev.waiting, data]
              };
            });
            break;

          case 'DEPARTMENT_CREATED':
            setDepartments(prev => [...prev, data]);
            break;

          case 'QUEUE_RESET':
            setTicketsState({
              waiting: [],
              calling: [],
              recentHistory: []
            });
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('Error handling SSE update:', e);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error, closing...', err);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('medflow_user', JSON.stringify(userData));
    // If admin, switch to admin dashboard. If doctor, switch to staff console
    if (userData.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('staff');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('medflow_user');
    setCurrentView('staff');
  };

  const handleResetQueue = () => {
    setTicketsState({
      waiting: [],
      calling: [],
      recentHistory: []
    });
  };

  const handleDeptCreated = (newDept) => {
    setDepartments(prev => [...prev, newDept]);
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="logo-container" onClick={() => setCurrentView('kiosk')}>
          <Activity className="logo-icon" size={24} />
          <span className="logo-text">MedFlow</span>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-btn ${currentView === 'kiosk' ? 'active' : ''}`}
            onClick={() => setCurrentView('kiosk')}
          >
            <Ticket className="btn-icon" size={16} />
            <span>Kiosk Portal</span>
          </button>
          
          <button 
            className={`nav-btn ${currentView === 'display' ? 'active' : ''}`}
            onClick={() => setCurrentView('display')}
          >
            <Tv className="btn-icon" size={16} />
            <span>Public TV Display</span>
          </button>
          
          <button 
            className={`nav-btn ${currentView === 'staff' ? 'active' : ''}`}
            onClick={() => setCurrentView('staff')}
          >
            <User className="btn-icon" size={16} />
            <span>Staff Portal</span>
          </button>

          {user && user.role === 'admin' && (
            <button 
              className={`nav-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              <ShieldAlert className="btn-icon" size={16} />
              <span>Admin Panel</span>
            </button>
          )}
        </div>

        {/* User Badge or Status indicator */}
        <div>
          {user ? (
            <div className="user-tag">
              <span className="status-dot"></span>
              <span>Dr. {user.username}</span>
              <button 
                onClick={handleLogout} 
                title="Sign out"
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'hsl(var(--accent-rose))', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  marginLeft: '0.25rem' 
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div className="user-tag" style={{ borderStyle: 'dashed' }}>
              <span className="status-dot" style={{ backgroundColor: 'hsl(var(--text-muted))', boxShadow: 'none' }}></span>
              <span style={{ color: 'hsl(var(--text-muted))' }}>Guest Mode</span>
            </div>
          )}
        </div>
      </nav>

      {/* Main View Router */}
      <main style={{ flex: 1 }}>
        {currentView === 'kiosk' && (
          <KioskView departments={departments} />
        )}
        
        {currentView === 'display' && (
          <DisplayView ticketsState={ticketsState} />
        )}
        
        {currentView === 'staff' && (
          <StaffView 
            departments={departments} 
            ticketsState={ticketsState}
            user={user}
            onLogin={handleLogin}
            onLogout={handleLogout}
          />
        )}
        
        {currentView === 'admin' && (
          <AdminView 
            departments={departments}
            user={user}
            onResetQueue={handleResetQueue}
            onDeptCreated={handleDeptCreated}
          />
        )}
      </main>
    </div>
  );
}

export default App;
