const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
  db.run("CREATE TABLE messages (id TEXT PRIMARY KEY, body TEXT)");
  db.run("INSERT INTO messages (id, body) VALUES ('1', 'hello') ON CONFLICT DO NOTHING", (err) => {
    console.log('Result:', err || 'success');
  });
});
