import { config } from "dotenv";
config();

export const PORT = process.env.PORT || 3000;

export const DB_HOST = process.env.DB_HOST || "localhost";
export const DB_PORT = process.env.DB_PORT || 3306;
export const DB_USER = process.env.DB_USER || "pruebas";
export const DB_PASSWORD = process.env.DB_PASSWORD || "123";
export const DB_DATABASE = process.env.DB_DATABASE || "bdreencauche";

export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
export const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
