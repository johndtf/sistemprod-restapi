import { pool } from "../db.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
  // Otros imports necesarios...

export const login = async (req, res) => {
  // Lógica de autenticación...
};

export const recoverPassword = async (req, res) => {
  // Lógica para enviar un pin de recuperación 
    try {
      const { email } = req.body;

      // Verificar si el email existe en la base de datos
      const [user] = await pool.query(
        "SELECT * FROM usuarios WHERE email = ?",
        [email]
      );

      if (user.length === 0) {
        return res
          .status(404)
          .json({
            message: "No existe ningún usuario con este correo electrónico",
          });
      }

      // Generar un código temporal (puedes personalizar la lógica según tus necesidades)
      const recoveryCode = crypto.randomBytes(6).toString("hex");

      // Almacenar el código temporal en la base de datos junto con la fecha de expiración
      const expirationDate = new Date();
      expirationDate.setMinutes(expirationDate.getMinutes() + 30); // Válido por 30 minutos
      await pool.query(
        "UPDATE usuarios SET recovery_code = ?, recovery_code_expiration = ? WHERE email = ?",
        [recoveryCode, expirationDate, email]
      );

      // Aquí puedes enviar el código al usuario, por ejemplo, a través de correo electrónico
      await sendRecoveryCodeByEmail(email, recoveryCode);

      return res.json({
        message:
          "Se ha enviado un código de recuperación al correo electrónico.",
      });
    } catch (error) {
      console.error("Error en recoverPassword:", error);
      return res
        .status(500)
        .json({ message: "Ocurrió un error al procesar la solicitud" });
    }
  };

  async function sendRecoveryCodeByEmail(email, recoveryCode) {
    // Configurar el servicio de correo (puedes utilizar nodemailer u otra biblioteca)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "tu_correo@gmail.com",
        pass: "tu_contraseña",
      },
    });

    // Configurar el contenido del correo
    const mailOptions = {
      from: "tu_correo@gmail.com",
      to: email,
      subject: "Código de recuperación de contraseña",
      text: `Tu código de recuperación es: ${recoveryCode}`,
    };

    // Enviar el correo
    await transporter.sendMail(mailOptions);
  }

};

export const resetPassword = async (req, res) => {
  // Lógica para restablecer la contraseña...
};

// Otros controladores relacionados con la autenticación...
