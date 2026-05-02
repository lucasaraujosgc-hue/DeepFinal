const fs = require('fs');
const sqlite3 = require('sqlite3');
if (fs.existsSync('data/kanban.db')) {
  const db = new sqlite3.Database('data/kanban.db');
  db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => console.log('kanban.db tables:', rows));
} else {
  console.log('kanban.db not found');
}
