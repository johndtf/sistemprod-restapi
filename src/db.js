import { createPool } from "mysql2/promise";
export const pool = createPool({
  host: "localhost",
  user: "pruebas",
  password: "123",
  port: 3306,
  database: "bdreencauche",
});
