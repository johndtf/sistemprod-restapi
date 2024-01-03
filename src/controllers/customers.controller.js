import { pool } from "../db.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
//---------------Crear Cliente ----------------------------------
export const createCustomer = async (req, res) => {
  try {
    const { cedula_nit, dv, nombre, apellido, telefono, direccion, email } =
      req.body;

    // Validaciónes de campos
    const camposRequeridos = [
      "cedula_nit",
      "nombre",
      "telefono",
      "direccion",
      "email",
    ];

    for (const campo of camposRequeridos) {
      if (!req.body[campo]) {
        return res.status(400).json({
          message: `El campo ${campo} es obligatorio`,
        });
      }
    }

    // Validar formato de cédula/nit
    const cedulaNitRegex = /^[0-9]{8,10}$/;
    if (!cedulaNitRegex.test(cedula_nit)) {
      return res
        .status(400)
        .json({ message: "La cédula o NIT debe tener entre 8 y 10 números" });
    }

    //Validar nombre
    if (nombre.length < 2 || nombre.length > 45) {
      return res.status(400).json({
        message: "El nombre debe tener entre 2 y 45 caracteres",
      });
    }

    // Validar apellido

    if (apellido.length > 45) {
      return res.status(400).json({
        message: "El apellido no debe ser de más de 45 caracteres",
      });
    }

    // Validar teléfono
    const isTelefonoValid = telefono.match(/^[0-9]{10}$/);
    if (!isTelefonoValid) {
      return res
        .status(400)
        .json({ message: "El teléfono debe ser un número de 10 dígitos" });
    }

    // Validar dirección
    const isDireccionValid = direccion.match(
      /^[a-zA-Z0-9\s.,#áéíóúÁÉÍÓÚñÑ-]{10,100}$/
    );
    if (!isDireccionValid) {
      return res.status(400).json({
        message:
          "Formato no valido de dirección o no cumple el tamaño entre 10 y 100 caracteres",
      });
    }

    // Validar formato de email
    if (!validarFormatoEmail(email)) {
      return res
        .status(400)
        .json({ message: "El formato del correo electrónico no es válido" });
    }

    //Verificar si la cédula ya existe
    const [existingIdentification] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE cedula_nit = ?",
      [cedula_nit]
    );

    if (existingIdentification.length > 0) {
      // La cédula ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "Esta cédula o NIT ya existe" });
    }

    //Verificar si el emal ya existe
    const [existingEmail] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE email = ?",
      [email]
    );

    if (existingEmail.length > 0) {
      //El email ya existe, responder con mensaje de error
      return res.status(400).json({ message: "Este email ya existe" });
    }

    //El cliente no existe, proceder a la incerción

    //Genera una nueva contraseña segura

    function generarContrasenaTemporal() {
      const longitud = 12;
      const contrasenaTemporal = crypto.randomBytes(longitud).toString("hex");
      return contrasenaTemporal;
    }

    const contrasenaTemporalGenerada = generarContrasenaTemporal();
    // console.log(contrasenaTemporalGenerada);

    // Encripta la contraseña
    const hashedPassword = await bcrypt.hash(contrasenaTemporalGenerada, 10);

    //cuando se crea un cliente ingresa con estado A, temporal = 1
    const estado = "A";
    const temporal = 1;

    const [rows] = await pool.query(
      "INSERT INTO clientes(cedula_nit, dv, nombre, apellido, telefono, direccion, email, contrasenia, estado, temporal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? )",
      [
        cedula_nit,
        dv,
        nombre,
        apellido,
        telefono,
        direccion,
        email,
        hashedPassword,
        estado,
        temporal,
      ]
    );

    res.send({
      id: rows.insertId,
      cedula_nit,
      dv,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      estado,
    });
  } catch (error) {
    console.error("Error en createCustomer:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//----------------------Listado de clientes ---------------------------

export const getCustomers = async (req, res) => {
  try {
    const { cedula_nit, nombre, apellido } = req.body;
    const [rows] = await pool.query(
      "SELECT id_cliente, nombre, apellido, cedula_nit, dv, telefono, email, direccion, estado FROM clientes WHERE nombre LIKE ? AND apellido LIKE ? AND cedula_nit LIKE ?",
      [`%${nombre}%`, `%${apellido}%`, `%${cedula_nit}%`]
    );
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------------ Obtener cliente por Cédula ----------------

export const getCustomer = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id_cliente, nombre, apellido, cedula_nit, dv, telefono, email, direccion, estado FROM clientes WHERE cedula_nit = ?",
      [req.params.cedula_nit]
    );
    if (rows.length <= 0) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error en getCustomer:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

//----------------Obtener información de la empresa -----------------------
//Envía la información de la empresa reencauchadora desde las tablas data y clientes
export const getCompany = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT d.id, d.eslogan, c.cedula_nit, c.nombre, c.apellido FROM data d JOIN clientes c ON d.id = c.id_cliente WHERE c.id_cliente = d.id"
    );

    if (rows.length <= 0)
      return res.status(404).json({ message: "Compañía no encontrada" });
    res.send(rows[0]);
  } catch (error) {
    console.error("Error en getCustomer:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//-------------------Actualizar la información de la empresa-----------------------

export const updateData = async (req, res) => {
  try {
    const { id, eslogan } = req.body;

    // Verificar si el id y eslogan están presentes en el cuerpo de la solicitud
    if (!id || !eslogan) {
      return res.status(400).json({
        error: "Se requiere el id y el eslogan para la actualización",
      });
    }

    // Realizar la actualización en la base de datos
    await pool.query("UPDATE data SET eslogan = ? , id = ?", [eslogan, id]);

    res.status(200).json({ message: "Registro actualizado exitosamente" });
  } catch (error) {
    console.error("Error en updateData:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

//-------------------Modificar cliente -----------------------------------

export const updateCustomer = async (req, res) => {
  try {
    const {
      cedula_nit,
      dv,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      estado,
    } = req.body;
    const { id } = req.params; // El ID del cliente que se desea actualizar

    // Validar los campos de entrada

    const camposRequeridos = [
      "cedula_nit",
      "nombre",
      "telefono",
      "direccion",
      "email",
      "estado",
    ];

    for (const campo of camposRequeridos) {
      if (!req.body[campo]) {
        return res.status(400).json({
          message: `El campo ${campo} es obligatorio `,
        });
      }
    }

    // Validar formato de cédula/nit
    const cedulaNitRegex = /^[0-9]{8,10}$/;
    if (!cedulaNitRegex.test(cedula_nit)) {
      return res
        .status(400)
        .json({ message: "La cédula o NIT debe tener entre 8 y 10 números" });
    }

    //Validar nombre
    if (nombre.length < 2 || nombre.length > 45) {
      return res.status(400).json({
        message: "El nombre debe tener entre 2 y 45 caracteres",
      });
    }

    // Validar apellido

    if (apellido.length > 45) {
      return res.status(400).json({
        message: "El apellido no debe tener más de 45 caracteres",
      });
    }

    // Validar teléfono
    const isTelefonoValid = telefono.match(/^[0-9]{10}$/);
    if (!isTelefonoValid) {
      return res
        .status(400)
        .json({ message: "El teléfono debe ser un número de 10 dígitos" });
    }

    // Validar dirección
    const isDireccionValid = direccion.match(
      /^[a-zA-Z0-9\s.,#áéíóúÁÉÍÓÚñÑ-]{10,100}$/
    );
    if (!isDireccionValid) {
      return res.status(400).json({
        message:
          "Formato no valido de dirección o no cumple el tamaño entre 10 y 100 caracteres",
      });
    }

    // Validar formato de email
    if (!validarFormatoEmail(email)) {
      return res
        .status(400)
        .json({ message: "El formato del correo electrónico no es válido" });
    }

    // Validar formato de estado
    const ESTADO_ACTIVO = "A";
    const ESTADO_INACTIVO = "I";

    // Validar formato de estado
    if (estado !== ESTADO_ACTIVO && estado !== ESTADO_INACTIVO) {
      return res.status(400).json({
        message: "El estado de un cliente debe ser A (Activo) o I (Inactivo)",
      });
    }

    // Verificar si el cliente existe
    const [existingCustomer] = await pool.query(
      "SELECT * FROM clientes WHERE id_cliente = ?",
      [id]
    );

    if (existingCustomer.length === 0) {
      // El cliente no existe, responder con un mensaje de error
      return res.status(404).json({ message: "cliente no encontrado" });
    }

    //Verificar que la nueva Cédula no esté siendo usada por otro cliente
    const [existingCedula] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE cedula_nit = ? AND id_cliente != ?",
      [cedula_nit, id]
    );
    //Si la cédula está siendo usada por otro cliente genera mensaje de error
    if (existingCedula.length > 0) {
      return res
        .status(400)
        .json({ message: "Esta cédula ya está asociada a otro cliente" });
    }

    //Verificar si el emal no está siendo usado por otro cliente
    const [existingEmail] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE email = ? AND id_cliente != ?",
      [email, id]
    );

    if (existingEmail.length > 0) {
      //El email ya existe, responder con mensaje de error
      return res
        .status(400)
        .json({ message: "Este email ya está siendo usado por otro cliente" });
    }
    // Actualizar el cliente
    const updateQuery = `
      UPDATE clientes 
      SET
        cedula_nit = IFNULL(?, cedula_nit),
        dv = IFNULL(?, dv),
        nombre = IFNULL(?, nombre),
        apellido =IFNULL(?, apellido),
        telefono = IFNULL(?, telefono),
        direccion = IFNULL(?, direccion),
        email = IFNULL(?, email),
        estado = IFNULL(?, estado)
      WHERE id_cliente = ?
    `;

    const [rows] = await pool.query(updateQuery, [
      cedula_nit,
      dv,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      estado,
      id, // ID del cliente a actualizar
    ]);

    res.json({
      message: "cliente actualizado con éxito",
      id,
    });
  } catch (error) {
    console.error("Error en updateCustomer:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

/* ==================================FUNCIONES=============================== */

// ------------Función para validar el formato del correo electrónico--------------
function validarFormatoEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
