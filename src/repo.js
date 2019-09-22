const db = require('better-sqlite3')('woogBot.db');

function listRoles()  {
  var roles = [];
  const sql = db.prepare(`SELECT * FROM roles`);
  const rows = sql.all();
  console.log(rows);
  return rows;
};

function addRole(roleName) {
  const sql = db.prepare(`INSERT INTO 'roles' (name) VALUES (?)`);
  const res = sql.run(roleName);
  return res;
};

function giveRole(user_id, role_name) {
  const sql = db.prepare(`INSERT INTO 'users' (user_id,role_name) VALUES (?,?)`);
  const res = sql.run(user_id, role_name);
  return res;
};

const removeRole = (user_id, role_name) => {
  const sql = db.prepare(`DELETE FROM 'users' 
    WHERE user_id = ?
    AND role_name = ?`);
  const res = sql.run(user_id, role_name);
  return res;
};

const getUsersWithRole = (role_name) => {  
  const sql = db.prepare(`SELECT DISTINCT user_id FROM 'users' WHERE role_name = ?`);
  const user_ids = sql.all(role_name);
  console.log(user_ids);
  return user_ids;
};

module.exports = { listRoles, addRole, giveRole, removeRole, getUsersWithRole };
