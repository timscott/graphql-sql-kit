import knex from 'knex';

let db;

const initDb = config => {
  db = knex(config);
};

export {
  db as default,
  initDb
};
