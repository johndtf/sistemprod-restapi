import { pool } from "../db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { EMAIL_PASSWORD, EMAIL_USER, JWT_SECRET_KEY } from "../config.js";
//import { serialize } from "cookie";

//---------------------- Lógica de autenticación...------------------------------

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [user] = await pool.query("SELECT * FROM empleados WHERE email = ?", [
      email,
    ]);

    if (user.length === 0) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user[0].contrasenia);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const secretKey = JWT_SECRET_KEY;
    const payload = { userId: user[0].id_empleado, username: user[0].nombre };
    const options = { expiresIn: "14h" };
    const token = jwt.sign(payload, secretKey, options);

    res.json(token);
  } catch (error) {
    console.error("Error en login:", error);
    return res
      .status(500)
      .json({ message: "Ocurrió un error al procesar la solicitud" });
  }
};

// -------------Lógica para enviar un pin de recuperación------------------------
export const recoverPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Verificar si el email existe en la base de datos
    const [user] = await pool.query("SELECT * FROM empleados WHERE email = ?", [
      email,
    ]);

    if (user.length === 0) {
      return res.status(404).json({
        message: "No existe ningún empleado con este correo electrónico",
      });
    }
    //conserva el nombre del usuario para el mensaje de correo
    const nombre = user[0].nombre;

    // Generar un código temporal, genera un buffer de 3 bytes de datos aleatorios, cada byte se representa con 2 caracteres hexagesimales por tanto se genera un código de 6 caracteres
    const longitud = 3;
    const recoveryCode = crypto.randomBytes(longitud).toString("hex");

    // Almacenar el código temporal en la base de datos junto con la fecha de expiración
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 30); // Válido por 30 minutos
    await pool.query(
      "UPDATE empleados SET cod_recuperacion = ?, cod_expiracion = ? WHERE email = ?",
      [recoveryCode, expirationDate, email]
    );

    // Enviar el código al empleado, a través de correo electrónico
    await sendRecoveryCodeByEmail(email, recoveryCode, nombre);

    return res.json({
      message: "Se ha enviado un código de recuperación al correo electrónico.",
    });
  } catch (error) {
    console.error("Error en recoverPassword:", error);
    return res
      .status(500)
      .json({ message: "Ocurrió un error al procesar la solicitud" });
  }
};

async function sendRecoveryCodeByEmail(email, recoveryCode, nombre) {
  // Configurar el servicio de correo
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASSWORD,
    },
  });

  // Configurar el contenido del correo
  const mailOptions = {
    from: EMAIL_USER,
    to: email,
    subject: "Código de recuperación de contraseña Sitemprod",
    text: `Hola ${nombre}, Tu código de recuperación es: ${recoveryCode}`,
  };

  // Enviar el correo
  await transporter.sendMail(mailOptions);
}

// -----------Lógica para restablecer la contraseña...--------------------------
export const resetPassword = async (req, res) => {
  try {
    const { email, recoveryCode, newPassword } = req.body;

    // Verificar si el email existe en la base de datos
    const [user] = await pool.query("SELECT * FROM empleados WHERE email = ?", [
      email,
    ]);

    if (user.length === 0) {
      return res.status(404).json({
        message: "No existe ningún empleado con este correo electrónico",
      });
    }

    // Verificar si el código de recuperación es válido
    if (user[0].cod_recuperacion !== recoveryCode) {
      return res
        .status(400)
        .json({ message: "Código de recuperación inválido" });
    }

    // Verificar si el código de recuperación ha expirado
    const now = new Date();
    const expirationDate = new Date(user[0].cod_expiracion);

    if (now > expirationDate) {
      return res
        .status(400)
        .json({ message: "El código de recuperación ha expirado" });
    }

    // Cambiar la contraseña del usuario
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE empleados SET contrasenia = ?, cod_recuperacion = NULL, cod_expiracion = NULL, temporal = 0 WHERE email = ?",
      [hashedPassword, email]
    );

    return res.json({ message: "Contraseña restablecida con éxito" });
  } catch (error) {
    console.error("Error en resetPassword:", error);
    return res
      .status(500)
      .json({ message: "Ocurrió un error al procesar la solicitud" });
  }
};

// ---------------Lógica para validar el token--------------------

export const validateToken = async (req, res) => {
  // Obtener la cabecera de autorización
  const headerAuth = req.headers["authorization"];

  // Verificar si la cabecera de autorización está presente y tiene el formato correcto
  if (headerAuth && headerAuth.startsWith("Bearer ")) {
    // Extraer el token JWT de la cabecera de autorización
    const token = headerAuth.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Token no proporcionado" });
    }

    try {
      // Verificar el token
      const decoded = jwt.verify(token, JWT_SECRET_KEY);
      return res.status(200).json({ message: "Token válido" });
    } catch (error) {
      return res.status(401).json({ message: "Token no válido o expirado" });
    }
  } else {
    // Si no se proporciona la cabecera de autorización, responder con un código de estado 401 (No autorizado)
    res.status(401).json({ message: "Token de autorización no proporcionado" });
  }
};
