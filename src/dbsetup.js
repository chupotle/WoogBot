var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./database.sqlite3'); 
var seedData = require('../roleData.json');


module.exports  = { db, createTables }; 


function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT,
      role_id INTEGER
    );`,
    function() {
      db.run(`
        CREATE TABLE IF NOT EXISTS roles (
          role_id INTEGER PRIMARY KEY,
          name TEXT
        );`,
        insertRows
      );
    }
  );
}

function insertRows() {
  seedData.users.forEach(insertUsers);
  seedData.roles.forEach(insertRoles);
}

function insertUsers(u) {
  db.run(
    `INSERT INTO users(user_id, role_id)
    VALUES(${u.user_id}, '${u.role_id}')` 
  );
}

function insertRoles(r) {
  db.run(
    `INSERT INTO roles(role_id, name)
    VALUES(${r.role_id}, '${r.name}')`
  );
}