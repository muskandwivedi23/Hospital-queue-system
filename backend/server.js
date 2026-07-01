import express from 'express';
import cors from 'cors';
import { initDb, query, run, get } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// List of connected SSE clients
let clients = [];

// Send Server-Sent Event to all connected clients
const broadcast = (type, data) => {
  const payload = JSON.stringify({ type, data });
  console.log(`Broadcasting: ${type}`);
  clients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
};

// SSE Endpoint for Live Updates
app.get('/api/tickets/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial ping/connection check
  res.write('data: {"type":"connected"}\n\n');

  clients.push(res);
  console.log(`Client connected to SSE stream. Total clients: ${clients.length}`);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log(`Client disconnected from SSE stream. Total clients: ${clients.length}`);
  });
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const user = await get(
      `SELECT u.id, u.username, u.password, u.role, u.department_id, d.name as department_name, d.room_number 
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.username = ?`,
      [username]
    );

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Don't send back the password
    const { password: _, ...userInfo } = user;
    res.json(userInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Department Routes
app.get('/api/departments', async (req, res) => {
  try {
    const depts = await query('SELECT * FROM departments WHERE is_active = 1');
    res.json(depts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/departments', async (req, res) => {
  const { name, code_prefix, room_number } = req.body;
  if (!name || !code_prefix || !room_number) {
    return res.status(400).json({ error: 'Name, code prefix, and room number are required' });
  }

  try {
    const result = await run(
      'INSERT INTO departments (name, code_prefix, room_number) VALUES (?, ?, ?)',
      [name, code_prefix.toUpperCase(), room_number]
    );
    const newDept = await get('SELECT * FROM departments WHERE id = ?', [result.id]);
    broadcast('DEPARTMENT_CREATED', newDept);
    res.status(201).json(newDept);
  } catch (error) {
    console.error(error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Department name or code prefix already exists' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Ticket Routes

// 1. Kiosk: Generate new ticket
app.post('/api/tickets/kiosk', async (req, res) => {
  const { patient_name, patient_phone, department_id } = req.body;
  if (!patient_name || !department_id) {
    return res.status(400).json({ error: 'Patient name and department are required' });
  }

  try {
    // Verify department exists and get code_prefix
    const dept = await get('SELECT * FROM departments WHERE id = ? AND is_active = 1', [department_id]);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found or inactive' });
    }

    // Get count of tickets for this department generated today to increment ticket index
    const dateQuery = await get(
      "SELECT COUNT(*) as count FROM tickets WHERE department_id = ? AND date(created_at) = date('now')",
      [department_id]
    );

    const ticketIndex = dateQuery.count + 1;
    // Format: e.g. GEN-101, PED-101 (start count at 100 or 1, let's start at 101 to look like typical token ranges, or 100 + index)
    const paddedNum = String(100 + ticketIndex);
    const ticketNumber = `${dept.code_prefix}-${paddedNum}`;

    const result = await run(
      `INSERT INTO tickets (ticket_number, patient_name, patient_phone, department_id, status)
       VALUES (?, ?, ?, ?, 'waiting')`,
      [ticketNumber, patient_name, patient_phone || null, department_id]
    );

    const newTicket = await get(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.id = ?`,
      [result.id]
    );

    broadcast('TICKET_CREATED', newTicket);
    res.status(201).json(newTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Doctor: Call next patient
app.post('/api/tickets/call-next', async (req, res) => {
  const { department_id } = req.body;
  if (!department_id) {
    return res.status(400).json({ error: 'Department ID is required' });
  }

  try {
    // 1. Auto-complete any existing ticket currently in 'calling' state for this department to clean up
    await run(
      `UPDATE tickets SET status = 'completed', completed_at = datetime('now') 
       WHERE department_id = ? AND status = 'calling'`,
      [department_id]
    );

    // 2. Fetch the oldest 'waiting' patient for this department
    const nextTicket = await get(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id
       WHERE t.department_id = ? AND t.status = 'waiting' 
       ORDER BY t.created_at ASC LIMIT 1`,
      [department_id]
    );

    if (!nextTicket) {
      return res.status(404).json({ message: 'No patients in the queue for this department' });
    }

    // 3. Update status of the next ticket to 'calling' and record called_at time
    await run(
      "UPDATE tickets SET status = 'calling', called_at = datetime('now') WHERE id = ?",
      [nextTicket.id]
    );

    const updatedTicket = { ...nextTicket, status: 'calling', called_at: new Date().toISOString() };
    broadcast('TICKET_CALLING', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Doctor: Recall patient (repeat voice and flash)
app.post('/api/tickets/:id/recall', async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await get(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.id = ?`,
      [id]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (ticket.status !== 'calling') {
      return res.status(400).json({ error: 'Only tickets in calling state can be recalled' });
    }

    // Update called_at to bubble it to top of announcements
    await run("UPDATE tickets SET called_at = datetime('now') WHERE id = ?", [id]);
    const updatedTicket = { ...ticket, called_at: new Date().toISOString() };

    broadcast('TICKET_RECALLED', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Doctor: Complete consultation
app.post('/api/tickets/:id/complete', async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await get('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await run(
      "UPDATE tickets SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
      [id]
    );

    const updatedTicket = await get(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.id = ?`,
      [id]
    );

    broadcast('TICKET_COMPLETED', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Doctor: Patient did not show up
app.post('/api/tickets/:id/noshow', async (req, res) => {
  const { id } = req.params;

  try {
    const ticket = await get('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await run(
      "UPDATE tickets SET status = 'noshow', completed_at = datetime('now') WHERE id = ?",
      [id]
    );

    const updatedTicket = await get(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.id = ?`,
      [id]
    );

    broadcast('TICKET_NOSHOW', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Doctor: Transfer patient to another department
app.post('/api/tickets/:id/transfer', async (req, res) => {
  const { id } = req.params;
  const { department_id } = req.body;

  if (!department_id) {
    return res.status(400).json({ error: 'Target department ID is required' });
  }

  try {
    const ticket = await get('SELECT * FROM tickets WHERE id = ?', [id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const dept = await get('SELECT * FROM departments WHERE id = ? AND is_active = 1', [department_id]);
    if (!dept) {
      return res.status(404).json({ error: 'Target department not found or inactive' });
    }

    // Determine new ticket number based on target department's count today
    const dateQuery = await get(
      "SELECT COUNT(*) as count FROM tickets WHERE department_id = ? AND date(created_at) = date('now')",
      [department_id]
    );
    const ticketIndex = dateQuery.count + 1;
    const paddedNum = String(100 + ticketIndex);
    const newTicketNumber = `${dept.code_prefix}-${paddedNum}`;

    // Update department, ticket number, status back to 'waiting', and reset called_at/completed_at
    await run(
      `UPDATE tickets 
       SET department_id = ?, ticket_number = ?, status = 'waiting', called_at = NULL, completed_at = NULL 
       WHERE id = ?`,
      [department_id, newTicketNumber, id]
    );

    const updatedTicket = await get(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.id = ?`,
      [id]
    );

    // Broadcast update: this constitutes a deletion from the old queue and addition to the new queue
    broadcast('TICKET_TRANSFERRED', updatedTicket);
    res.json(updatedTicket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Get state lists for frontend initialization
app.get('/api/tickets/state', async (req, res) => {
  try {
    // Current waiting tickets
    const waiting = await query(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.status = 'waiting' 
       ORDER BY t.created_at ASC`
    );

    // Current active (calling) tickets
    const calling = await query(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.status = 'calling' 
       ORDER BY t.called_at DESC`
    );

    // Recently completed or no-show tickets (last 10)
    const recentHistory = await query(
      `SELECT t.*, d.name as department_name, d.room_number 
       FROM tickets t 
       JOIN departments d ON t.department_id = d.id 
       WHERE t.status IN ('completed', 'noshow') 
       ORDER BY t.completed_at DESC LIMIT 10`
    );

    res.json({ waiting, calling, recentHistory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin stats endpoint
app.get('/api/admin/stats', async (req, res) => {
  try {
    const summary = await get(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(case when status='completed' then 1 else 0 end) as completed_count,
        SUM(case when status='noshow' then 1 else 0 end) as noshow_count,
        SUM(case when status='waiting' then 1 else 0 end) as waiting_count,
        SUM(case when status='calling' then 1 else 0 end) as calling_count
      FROM tickets 
      WHERE date(created_at) = date('now')
    `);

    const deptStats = await query(`
      SELECT 
        d.name as department_name,
        d.code_prefix,
        COUNT(t.id) as total_tickets,
        AVG(strftime('%s', t.completed_at) - strftime('%s', t.called_at)) as avg_service_seconds,
        AVG(strftime('%s', t.called_at) - strftime('%s', t.created_at)) as avg_wait_seconds
      FROM departments d
      LEFT JOIN tickets t ON d.id = t.department_id AND date(t.created_at) = date('now')
      WHERE d.is_active = 1
      GROUP BY d.id
    `);

    res.json({ summary, deptStats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Admin Reset endpoint: Reset all queues (clear tickets table)
app.post('/api/admin/reset', async (req, res) => {
  try {
    await run('DELETE FROM tickets');
    broadcast('QUEUE_RESET', null);
    res.json({ success: true, message: 'All queues reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Initialize database schema and then start backend server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MedFlow API server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database schema:', err);
  });
