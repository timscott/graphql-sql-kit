import knex from 'knex';

const db = knex({
  client: 'mssql',
  connection: {
    host: process.env.DATABASE_SERVER,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_DATABASE
  }
});

export default db;
