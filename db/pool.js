import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  connectionTimeoutMillis: 5000
});

pool.on("error", error => {
  console.error("Ошибка фонового соединения PostgreSQL:", error.message);
});
