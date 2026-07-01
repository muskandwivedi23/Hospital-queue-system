import sqlite3 from 'sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'queue.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Helper functions to wrap sqlite3 with promises
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Initialize database schema
export const initDb = async () => {
  // Enable foreign keys
  await run('PRAGMA foreign_keys = ON');

  // Create Departments table
  await run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code_prefix TEXT UNIQUE NOT NULL,
      room_number TEXT NOT NULL,
      is_active INTEGER DEFAULT 1
    )
  `);

  // Create Tickets table
  await run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_number TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      patient_phone TEXT,
      status TEXT CHECK(status IN ('waiting', 'calling', 'completed', 'noshow')) DEFAULT 'waiting',
      department_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      called_at DATETIME,
      completed_at DATETIME,
      FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE CASCADE
    )
  `);

  // Create Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'doctor')) NOT NULL,
      department_id INTEGER,
      FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL
    )
  `);

  // Seed default departments if table is empty
  const deptCount = await get('SELECT COUNT(*) as count FROM departments');
  if (deptCount.count === 0) {
    const defaultDepts = [
      ['General Medicine', 'GEN', 'Room 101'],
      ['Pediatrics', 'PED', 'Room 102'],
      ['Cardiology', 'CAR', 'Room 103'],
      ['Pharmacy', 'PHM', 'Counter A'],
      ['Laboratory & Diagnostics', 'LAB', 'Room 104']
    ];

    for (const [name, prefix, room] of defaultDepts) {
      await run(
        'INSERT INTO departments (name, code_prefix, room_number) VALUES (?, ?, ?)',
        [name, prefix, room]
      );
    }
    console.log('Seeded default departments.');
  }

  // Seed default users if table is empty
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    // We will get the departments first to assign users correctly
    const depts = await query('SELECT id, code_prefix FROM departments');
    const genDept = depts.find(d => d.code_prefix === 'GEN');
    const pedDept = depts.find(d => d.code_prefix === 'PED');
    const phmDept = depts.find(d => d.code_prefix === 'PHM');
    const carDept = depts.find(d => d.code_prefix === 'CAR');
    const labDept = depts.find(d => d.code_prefix === 'LAB');

    // Create accounts:
    // admin -> admin123
    // doctor1 -> doc123 (General Medicine)
    // doctor2 -> doc123 (Pediatrics)
    // pharmacist -> pharm123 (Pharmacy)
    // cardiologist -> cardio123 (Cardiology)
    // labtech -> lab123 (Laboratory & Diagnostics)
    await run(
      'INSERT INTO users (username, password, role, department_id) VALUES (?, ?, ?, ?)',
      ['admin', 'admin123', 'admin', null]
    );
    await run(
      'INSERT INTO users (username, password, role, department_id) VALUES (?, ?, ?, ?)',
      ['doctor1', 'doc123', 'doctor', genDept ? genDept.id : null]
    );
    await run(
      'INSERT INTO users (username, password, role, department_id) VALUES (?, ?, ?, ?)',
      ['doctor2', 'doc123', 'doctor', pedDept ? pedDept.id : null]
    );
    await run(
      'INSERT INTO users (username, password, role, department_id) VALUES (?, ?, ?, ?)',
      ['pharmacist', 'pharm123', 'doctor', phmDept ? phmDept.id : null]
    );
    await run(
      'INSERT INTO users (username, password, role, department_id) VALUES (?, ?, ?, ?)',
      ['cardiologist', 'cardio123', 'doctor', carDept ? carDept.id : null]
    );
    await run(
      'INSERT INTO users (username, password, role, department_id) VALUES (?, ?, ?, ?)',
      ['labtech', 'lab123', 'doctor', labDept ? labDept.id : null]
    );
    console.log('Seeded default users.');
  }
};

export default db;
