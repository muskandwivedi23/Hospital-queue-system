import React, { useState, useEffect } from 'react';
import { Ticket, Users, ArrowRight, Printer, CheckCircle } from 'lucide-react';

export default function KioskView({ departments, onTicketCreated }) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Auto-hide ticket preview after 10 seconds
  useEffect(() => {
    let timer;
    if (showReceipt) {
      timer = setTimeout(() => {
        setShowReceipt(false);
        setLastTicket(null);
      }, 10000);
    }
    return () => clearTimeout(timer);
  }, [showReceipt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!patientName || !selectedDeptId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/tickets/kiosk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: patientName,
          patient_phone: patientPhone,
          department_id: parseInt(selectedDeptId, 10),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'Failed to generate ticket');
        return;
      }

      const ticket = await response.json();
      setLastTicket(ticket);
      setShowReceipt(true);
      setPatientName('');
      setPatientPhone('');
      setSelectedDeptId('');
      
      if (onTicketCreated) onTicketCreated(ticket);
    } catch (err) {
      console.error(err);
      alert('Error connecting to the server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDept = departments.find(d => d.id === parseInt(selectedDeptId, 10));

  return (
    <div className="view-container animate-slide-in">
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Header Block */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ 
            display: 'inline-flex', 
            padding: '1rem', 
            borderRadius: '50%', 
            backgroundColor: 'hsl(var(--primary-glow))',
            color: 'hsl(var(--primary))',
            marginBottom: '1rem',
            boxShadow: '0 0 20px hsl(var(--primary) / 0.15)'
          }}>
            <Ticket size={40} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Self-Service <span className="text-gradient">Ticket Kiosk</span>
          </h1>
          <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '1.1rem' }}>
            Generate your virtual queue number to see a doctor or request services.
          </p>
        </div>

        <div className="grid-2">
          {/* Ticket Generation Form */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Create Your Ticket
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Patient Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. John Doe"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. +1 555-0199"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Department / Service</label>
                <select
                  className="form-select"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.room_number})
                    </option>
                  ))}
                </select>
              </div>

              {selectedDept && (
                <div style={{ 
                  backgroundColor: 'hsl(var(--primary-glow))', 
                  border: '1px solid hsl(var(--primary) / 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '0.9rem'
                }}>
                  <Users size={18} style={{ color: 'hsl(var(--primary))' }} />
                  <div>
                    <span style={{ fontWeight: 600, color: 'hsl(var(--text-primary))' }}>Destination: </span>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>
                      Proceed to <strong>{selectedDept.room_number}</strong> once called.
                    </span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn" 
                style={{ width: '100%', padding: '1rem' }}
                disabled={isSubmitting || !patientName || !selectedDeptId}
              >
                {isSubmitting ? 'Generating...' : 'Get Ticket Number'}
                <ArrowRight size={20} />
              </button>
            </form>
          </div>

          {/* Ticket Dispenser Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {showReceipt && lastTicket ? (
              <div 
                className="glass-card animate-slide-in" 
                style={{ 
                  border: '2px dashed hsl(var(--primary) / 0.4)',
                  padding: '2.5rem',
                  background: 'linear-gradient(to bottom, hsl(var(--bg-surface)), hsl(var(--bg-surface) / 0.95))',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Print Banner Top */}
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: '6px', 
                  background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent-cyan)))'
                }} />
                
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <CheckCircle size={32} style={{ color: 'hsl(var(--accent-emerald))', marginBottom: '0.5rem' }} />
                  <p style={{ color: 'hsl(var(--accent-emerald))', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Ticket Generated
                  </p>
                </div>

                <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                  <p style={{ color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                    YOUR TOKEN NUMBER
                  </p>
                  <h3 style={{ 
                    fontSize: '4rem', 
                    fontWeight: 900, 
                    color: 'white', 
                    textShadow: '0 0 20px hsl(var(--primary) / 0.4)',
                    letterSpacing: '0.05em' 
                  }}>
                    {lastTicket.ticket_number}
                  </h3>
                </div>

                <div style={{ borderTop: '1px dashed hsl(var(--border-color))', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Patient Name:</span>
                    <span style={{ fontWeight: 600 }}>{lastTicket.patient_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Department:</span>
                    <span style={{ fontWeight: 600 }}>{lastTicket.department_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Destination:</span>
                    <span style={{ fontWeight: 600, color: 'hsl(var(--accent-cyan))' }}>{lastTicket.room_number}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>Time Issued:</span>
                    <span style={{ color: 'hsl(var(--text-muted))' }}>
                      {new Date(lastTicket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Simulated barcode for premium appearance */}
                <div style={{ 
                  marginTop: '2.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  opacity: 0.5 
                }}>
                  <div style={{ 
                    width: '100%', 
                    height: '40px', 
                    background: 'repeating-linear-gradient(90deg, #fff, #fff 2px, transparent 2px, transparent 8px, #fff 8px, #fff 10px, transparent 10px, transparent 14px)' 
                  }} />
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', letterSpacing: '0.2em' }}>MEDFLOW-SYSTEM-{lastTicket.id}</span>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    onClick={() => window.print()}
                    className="btn btn-secondary" 
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  >
                    <Printer size={16} /> Print Receipt
                  </button>
                </div>
              </div>
            ) : (
              <div 
                className="glass-card" 
                style={{ 
                  height: '100%', 
                  minHeight: '350px',
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderStyle: 'dashed',
                  opacity: 0.7,
                  textAlign: 'center',
                  padding: '2rem'
                }}
              >
                <div style={{ color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>
                  <Printer size={48} />
                </div>
                <h3 style={{ fontSize: '1.2rem', color: 'hsl(var(--text-secondary))', marginBottom: '0.5rem' }}>Ticket Dispenser Ready</h3>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', maxWidth: '280px' }}>
                  Fill in your information and choose a service to get your paper receipt and join the queue.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
