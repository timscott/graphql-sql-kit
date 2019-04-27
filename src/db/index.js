import knex from 'knex';

let instance;

const initDb = config => {
  instance = knex(config);
};

const getDb = () => instance;

export {
  getDb,
  initDb
};
