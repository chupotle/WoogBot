const db = require('better-sqlite3')('woogBot.db');

function listRoles()  {
  const sql = db.prepare(`SELECT role_name FROM roles`);
  var roles = [];
  for (const role of sql.iterate()) {
    roles.push(role.role_name);
  }
  console.log(roles);
  return roles;
};

function roleExists(role_name)  {
  const sql = db.prepare(`SELECT role_name FROM roles WHERE role_name = ?`);
  const res = sql.get(role_name);
  return res;
};

function addRole(role_name) {
  const sql = db.prepare(`INSERT INTO 'roles' (role_name) VALUES (?)`);
  const res = sql.run(role_name);
  return res;
};

function deleteRole(role_name) {
  const sql = db.prepare(`DELETE FROM 'roles' 
    WHERE role_name = ?`);
  const res = sql.run(role_name);
  const sql2 = db.prepare(`DELETE FROM 'users' 
    WHERE role_name = ?`);
  const res2 = sql2.run(role_name);
  return [res,res2];
};

function giveRole(user_id, role_name) {
  const sql = db.prepare(`INSERT INTO 'users' (user_id,role_name) VALUES (?,?)`);
  const res = sql.run(user_id, role_name);
  return res;
};

function removeRole(user_id, role_name) {
  const sql = db.prepare(`DELETE FROM 'users' 
    WHERE user_id = ?
    AND role_name = ?`);
  const res = sql.run(user_id, role_name);
  return res;
};

function getUsersWithRole(role_name) {  
  const sql = db.prepare(`SELECT DISTINCT user_id FROM 'users' WHERE role_name = ?`);
  var user_ids = [];
  for (const user of sql.iterate(role_name)) {
    user_ids.push(user.user_id);
  }
  return user_ids;
};

function myRoles(user_id) {  
  const sql = db.prepare(`SELECT DISTINCT role_name FROM 'users' WHERE user_id = ?`);
  var role_names = [];
  for (const user of sql.iterate(user_id)) {
    role_names.push(user.role_name);
  }
  return role_names;
};

module.exports = { listRoles, addRole, giveRole, removeRole, getUsersWithRole, roleExists, deleteRole, myRoles };
