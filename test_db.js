const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/database_admin.sqlite');
db.all('SELECT * FROM messages LIMIT 10', (err, rows) => {
  console.log(rows);
});
