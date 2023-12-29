import { pool } from "../db.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
//---------------Crear Empleado ----------------------------------
export const createEmployee = async (req, res) => {
  try {
    const { cedula, nombre, apellido, telefono, direccion, email, id_perfil } =
      req.body;

    // Validaciónes de campos
    const camposRequeridos = [
      "cedula",
      "nombre",
      "apellido",
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

    // Validar formato de cédula
    const cedulaRegex = /^[0-9]{8,10}$/;
    if (!cedulaRegex.test(cedula)) {
      return res
        .status(400)
        .json({ message: "La cédula debe tener entre 8 y 10 números" });
    }

    //Validar nombre
    if (nombre.length < 2 || nombre.length > 45) {
      return res.status(400).json({
        message: "El nombre debe tener entre 2 y 45 caracteres",
      });
    }

    // Validar apellido

    if (apellido.length < 2 || apellido.length > 45) {
      return res.status(400).json({
        message: "El apellido debe tener entre 2 y 45 caracteres",
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
      "SELECT id_empleado FROM empleados WHERE cedula = ?",
      [cedula]
    );

    if (existingIdentification.length > 0) {
      // La cédula ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "Esta cédula ya existe" });
    }

    //Verificar si el emal ya existe
    const [existingEmail] = await pool.query(
      "SELECT id_empleado FROM empleados WHERE email = ?",
      [email]
    );

    if (existingEmail.length > 0) {
      //El email ya existe, responder con mensaje de error
      return res.status(400).json({ message: "Este email ya existe" });
    }

    //El empleado no existe, proceder a la incerción

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

    //cuando se crea un empleado ingresa con estado A, temporal = 1
    const estado = "A";
    const temporal = 1;

    const [rows] = await pool.query(
      "INSERT INTO empleados(cedula, nombre, apellido, telefono, direccion, email, id_perfil, contrasenia, estado, temporal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? )",
      [
        cedula,
        nombre,
        apellido,
        telefono,
        direccion,
        email,
        id_perfil,
        hashedPassword,
        estado,
        temporal,
      ]
    );

    res.send({
      id: rows.insertId,
      cedula,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      id_perfil,
      estado,
    });
  } catch (error) {
    console.error("Error en createEmployee:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//----------------------Listado de Empleados ---------------------------

export const getEmployees = async (req, res) => {
  try {
    const { cedula, nombre, apellido } = req.body;
    const [rows] = await pool.query(
      "SELECT emp.id_empleado, emp.cedula, emp.nombre, emp.apellido, emp.telefono, emp.email, emp.direccion, emp.estado, perf.id_perfil, perf.perfil " +
        "FROM empleados AS emp " +
        "INNER JOIN perfiles AS perf ON emp.id_perfil = perf.id_perfil " +
        "WHERE emp.nombre LIKE ? AND emp.apellido LIKE ? AND emp.cedula LIKE ?",
      [`%${nombre}%`, `%${apellido}%`, `%${cedula}%`]
    );
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------------ Obtener Empleado por Cédula ----------------

/* export const getEmployee = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM empleados WHERE cedula = ?",
      [req.params.cedula]
    );
    if (rows.length <= 0)
      return res.status(404).json({ message: "Empleado no encontrado" });
    res.send(rows[0]);
  } catch (error) {
    console.error("Error en getEmployee:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
}; */

//-------------------Modificar Empleado -----------------------------------

export const updateEmployee = async (req, res) => {
  try {
    const {
      cedula,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      id_perfil,
      estado,
    } = req.body;
    const { id } = req.params; // El ID del empleado a actualizar

    // Validar los campos de entrada

    const camposRequeridos = [
      "cedula",
      "nombre",
      "apellido",
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

    // Validar formato de cédula
    const cedulaNitRegex = /^[0-9]{8,10}$/;
    if (!cedulaNitRegex.test(cedula)) {
      return res
        .status(400)
        .json({ message: "La cédula debe tener entre 8 y 10 números" });
    }

    //Validar nombre
    if (nombre.length < 2 || nombre.length > 45) {
      return res.status(400).json({
        message: "El nombre debe tener entre 2 y 45 caracteres",
      });
    }

    // Validar apellido

    if (apellido.length < 2 || apellido.length > 45) {
      return res.status(400).json({
        message: "El apellido debe tener entre 2 y 45 caracteres",
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
        message: "El estado de un empleado debe ser A (Activo) o I (Inactivo)",
      });
    }

    // Verificar si el empleado existe
    const [existingEmployee] = await pool.query(
      "SELECT * FROM empleados WHERE id_empleado = ?",
      [id]
    );

    if (existingEmployee.length === 0) {
      // El empleado no existe, responder con un mensaje de error
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    //Verificar que la nueva Cédula no esté siendo usada por otro empleado
    const [existingCedula] = await pool.query(
      "SELECT id_empleado FROM empleados WHERE cedula = ? AND id_empleado != ?",
      [cedula, id]
    );
    //Si la cédula está siendo usada por otro empleado genera mensaje de error
    if (existingCedula.length > 0) {
      return res
        .status(400)
        .json({ message: "Esta cédula ya está asociada a otro empleado" });
    }

    //Verificar si el emal no está siendo usado por otro empleado
    const [existingEmail] = await pool.query(
      "SELECT id_empleado FROM empleados WHERE email = ? AND id_empleado != ?",
      [email, id]
    );

    if (existingEmail.length > 0) {
      //El email ya existe, responder con mensaje de error
      return res
        .status(400)
        .json({ message: "Este email ya está siendo usado por otro empleado" });
    }
    // Actualizar el empleado
    const updateQuery = `
      UPDATE empleados 
      SET 
        cedula = IFNULL(?, cedula),
        nombre = IFNULL(?, nombre),
        apellido =IFNULL(?, apellido),
        telefono = IFNULL(?, telefono),
        direccion = IFNULL(?, direccion),
        email = IFNULL(?, email),
        id_perfil = IFNULL(?, id_perfil),
        
        estado = IFNULL(?, estado)
      WHERE id_empleado = ?
    `;

    const [rows] = await pool.query(updateQuery, [
      cedula,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      id_perfil,
      estado,
      id, // ID del empleado a actualizar
    ]);

    res.json({
      message: "Empleado actualizado con éxito",
      id,
    });
  } catch (error) {
    console.error("Error en updateEmployee:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};
/* ==================================FUNCIONES=============================== */

// ------------Función para validar el formato del correo electrónico--------------
function validarFormatoEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
