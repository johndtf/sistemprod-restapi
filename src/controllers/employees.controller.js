import { pool } from "../db.js";

//---------------Crear Empleado ----------------------------------
export const createEmployee = async (req, res) => {
  try {
    const {
      cedula,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      id_perfil,
      usuario,
      contrasenia,
      estado,
    } = req.body;

    //Verificar si la cédula ya existe
    const [existingIdentification] = await pool.query(
      "SELECT id_empleado FROM empleados WHERE cedula = ?",
      [cedula]
    );

    if (existingIdentification.length > 0) {
      // La cédula ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "Esta cédula ya existe" });
    }

    //Verificar si el usuario ya existe
    const [existingUserName] = await pool.query(
      "SELECT id_empleado FROM empleados WHERE usuario = ?",
      [usuario]
    );

    if (existingUserName.length > 0) {
      //El nombre de usuario ya existe, responder con mensaje de error
      return res
        .status(400)
        .json({ message: "Este nombre de usuario ya existe" });
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

    const [rows] = await pool.query(
      "INSERT INTO empleados(cedula, nombre, apellido, telefono, direccion, email, id_perfil, usuario, contrasenia, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? )",
      [
        cedula,
        nombre,
        apellido,
        telefono,
        direccion,
        email,
        id_perfil,
        usuario,
        contrasenia,
        estado,
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
      usuario,
      contrasenia,
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
    const [rows] = await pool.query("SELECT * FROM empleados");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------------ Obtener Empleado por Cédula ----------------

export const getEmployee = async (req, res) => {
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
};

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
      usuario,
      contrasenia,
      estado,
    } = req.body;
    const { id } = req.params; // El ID del empleado que deseas actualizar

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

    //Verificar que el usuario no esta siendo usado por otro emppleado
    const [existingUserName] = await pool.query(
      "SELECT id_empleado FROM empleados WHERE usuario = ? AND id_empleado != ?",
      [usuario, id]
    );

    if (existingUserName.length > 0) {
      //El nombre de usuario ya está siendo usado por otro empleado
      return res.status(400).json({
        message:
          "Este nombre de usuario ya está siendo usado por otro empleado",
      });
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
        usuario = IFNULL(?, usuario),
        contrasenia = IFNULL(?, contrasenia),
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
      usuario,
      contrasenia,
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
