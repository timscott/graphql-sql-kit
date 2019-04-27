import knex from 'knex';

let instance;

const initDb = config => {
  instance = knex(config);
};

const db = () => instance;

export {
  db as default,
  initDb
};
