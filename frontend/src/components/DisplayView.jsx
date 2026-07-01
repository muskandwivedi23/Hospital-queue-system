import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX, Monitor, Tv, ArrowRight, Play } from 'lucide-react';

export default function DisplayView({ ticketsState, setTicketsState }) {
  const [isMuted, setIsMuted] = useState(true);
  const [lastCalledId, setLastCalledId] = useState(null);
  const [flashTicket, setFlashTicket] = useState(null);
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const playChimeAndAnnounce = (ticket) => {
    if (isMuted) return;

    try {
      // 1. Play professional ding-dong chime using Web Audio API
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playTone = (freq, time, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
      };

      const now = audioCtx.currentTime;
      // High note then lower note for classic chime: E5 (659.25 Hz) then C5 (523.25 Hz)
      playTone(659.25, now, 0.4);
      playTone(523.25, now + 0.35, 0.6);

      // 2. Announce ticket after chime
      setTimeout(() => {
        if (!synthRef.current) return;
        // Cancel anything currently playing to prevent pile-up
        synthRef.current.cancel();

        const announcementText = `Ticket number ${ticket.ticket_number.split('-').join(' ')}, please proceed to ${ticket.room_number}`;
        const utterance = new SpeechSynthesisUtterance(announcementText);
        
        // Select an English voice if available
        const voices = synthRef.current.getVoices();
        const englishVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        
        utterance.rate = 0.9;  // Slightly slower for clarity
        utterance.pitch = 1.0;
        synthRef.current.speak(utterance);
      }, 950);

    } catch (e) {
      console.error('Audio Context Error:', e);
    }
  };

  // Watch for calling tickets and trigger voice announcements
  const activeCallingTicket = ticketsState.calling[0]; // Most recent calling ticket
  
  useEffect(() => {
    if (activeCallingTicket && activeCallingTicket.id !== lastCalledId) {
      setLastCalledId(activeCallingTicket.id);
      
      // Trigger flash effect
      setFlashTicket(activeCallingTicket.id);
      const timer = setTimeout(() => setFlashTicket(null), 8000); // Flash for 8 seconds

      // Play audio announcement
      playChimeAndAnnounce(activeCallingTicket);

      return () => clearTimeout(timer);
    }
  }, [activeCallingTicket, lastCalledId, isMuted]);

  // Handle manual recall announcement
  useEffect(() => {
    // Standard setup handles this because called_at updates and shifts the ticket to the top
  }, [ticketsState.calling]);

  return (
    <div className="view-container animate-slide-in" style={{ padding: '1rem', maxWidth: '1600px' }}>
      
      {/* Top Banner Control */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: 'hsl(var(--bg-surface))',
        border: '1px solid hsl(var(--border-color))',
        padding: '0.75rem 1.5rem',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--text-secondary))' }}>
          <Tv size={20} className="logo-icon" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Patient Display Screen
          </span>
        </div>
        
        <button 
          onClick={() => {
            setIsMuted(!isMuted);
            // In modern browsers, voice synthesis requires user interaction before playing
            if (isMuted && synthRef.current) {
              const u = new SpeechSynthesisUtterance("");
              synthRef.current.speak(u);
            }
          }}
          className={`btn ${isMuted ? 'btn-secondary' : 'btn-accent-cyan'}`}
          style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
        >
          {isMuted ? (
            <>
              <VolumeX size={16} /> Enable Sound Announcements (Muted)
            </>
          ) : (
            <>
              <Volume2 size={16} /> Voice Announcements Active (Unmuted)
            </>
          )}
        </button>
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'stretch' }}>
        
        {/* Main Announcements / Currently Calling */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className={`glass-card ${flashTicket ? 'animate-flash-glow' : ''}`} style={{ 
            flex: 1, 
            padding: '3rem', 
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '450px',
            transition: 'all 0.5s ease',
            borderWidth: '2px',
            borderColor: flashTicket ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'
          }}>
            {activeCallingTicket ? (
              <div>
                <span className="badge badge-calling animate-pulse-slow" style={{ fontSize: '1rem', padding: '0.5rem 1.2rem', marginBottom: '1.5rem' }}>
                  Now Serving / Procede
                </span>
                
                <h2 style={{ 
                  fontSize: '9rem', 
                  fontWeight: 900, 
                  lineHeight: 1,
                  margin: '1rem 0',
                  color: 'white',
                  textShadow: flashTicket ? '0 0 40px hsl(var(--primary) / 0.6)' : '0 0 20px hsl(var(--primary) / 0.3)',
                  transition: 'text-shadow 0.3s ease'
                }}>
                  {activeCallingTicket.ticket_number}
                </h2>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '2rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', textTransform: 'uppercase' }}>Department</p>
                    <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{activeCallingTicket.department_name}</h3>
                  </div>
                  
                  <div style={{ width: '2px', height: '50px', backgroundColor: 'hsl(var(--border-color))' }} />
                  
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', textTransform: 'uppercase' }}>Proceed To</p>
                    <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'hsl(var(--accent-cyan))' }}>{activeCallingTicket.room_number}</h3>
                  </div>
                </div>

                <div style={{ marginTop: '2.5rem', fontSize: '1.2rem', color: 'hsl(var(--text-secondary))' }}>
                  Patient: <span style={{ fontWeight: 600, color: 'white' }}>{activeCallingTicket.patient_name}</span>
                </div>
              </div>
            ) : (
              <div style={{ opacity: 0.5 }}>
                <Monitor size={80} style={{ color: 'hsl(var(--text-muted))', marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '2rem', color: 'hsl(var(--text-secondary))' }}>No Active Calls</h3>
                <p style={{ color: 'hsl(var(--text-muted))', marginTop: '0.5rem' }}>Doctors are currently not calling any patients.</p>
              </div>
            )}
          </div>

          {/* Sub Grid for other Active Room numbers */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'hsl(var(--text-secondary))', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Other Rooms Status
            </h3>
            {ticketsState.calling.length > 1 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {ticketsState.calling.slice(1, 4).map((ticket) => (
                  <div key={ticket.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    backgroundColor: 'hsl(var(--bg-surface))',
                    border: '1px solid hsl(var(--border-color))',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1.25rem'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{ticket.ticket_number}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>{ticket.department_name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge badge-calling" style={{ fontSize: '0.9rem', padding: '0.3rem 0.6rem' }}>
                        {ticket.room_number}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                No other active rooms calling.
              </p>
            )}
          </div>
        </div>

        {/* Right Sidebar - Queue/Waiting Board */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <h3 style={{ 
            fontSize: '1.2rem', 
            marginBottom: '1rem', 
            borderBottom: '1px solid hsl(var(--border-color))', 
            paddingBottom: '0.75rem',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <span>Waiting List</span>
            <span style={{ 
              fontSize: '0.8rem', 
              backgroundColor: 'hsl(var(--accent-cyan-glow))', 
              color: 'hsl(var(--accent-cyan))', 
              border: '1px solid hsl(var(--accent-cyan) / 0.2)',
              padding: '0.2rem 0.6rem', 
              borderRadius: '9999px' 
            }}>
              {ticketsState.waiting.length} Waiting
            </span>
          </h3>

          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.75rem',
            maxHeight: '520px'
          }}>
            {ticketsState.waiting.length > 0 ? (
              ticketsState.waiting.map((ticket) => (
                <div key={ticket.id} className="animate-slide-in" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '0.85rem 1rem', 
                  backgroundColor: 'hsl(var(--bg-surface) / 0.5)', 
                  border: '1px solid hsl(var(--border-color))', 
                  borderRadius: 'var(--radius-md)' 
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{ticket.ticket_number}</span>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
                        ({new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
                      {ticket.patient_name}
                    </div>
                  </div>
                  <div>
                    <span className="badge badge-waiting" style={{ fontSize: '0.75rem' }}>
                      {ticket.department_name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'hsl(var(--text-muted))' }}>
                <p style={{ fontSize: '0.9rem' }}>No patients waiting.</p>
              </div>
            )}
          </div>

          {/* Recently Completed Roll */}
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1rem' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'hsl(var(--text-secondary))', textTransform: 'uppercase', marginBottom: '0.50rem' }}>
              Recently Served
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {ticketsState.recentHistory.slice(0, 5).map((t) => (
                <div key={t.id} style={{ 
                  backgroundColor: 'hsl(var(--bg-surface))', 
                  border: '1px solid hsl(var(--border-color))', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.8rem',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <span style={{ fontWeight: 700 }}>{t.ticket_number}</span>
                  <span style={{ fontSize: '0.7rem', color: t.status === 'completed' ? 'hsl(var(--accent-emerald))' : 'hsl(var(--accent-rose))' }}>
                    ●
                  </span>
                </div>
              ))}
              {ticketsState.recentHistory.length === 0 && (
                <span style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))' }}>No history yet today.</span>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
