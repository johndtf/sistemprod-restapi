import { pool } from "../db.js";

//---------------Crear Cliente ----------------------------------
export const createCustomer = async (req, res) => {
  try {
    const {
      cedula_nit,
      dv,
      nombre,
      apellido,
      telefono,
      direccion,
      email,
      usuario,
      contrasenia,
      estado,
    } = req.body;

    //Verificar si la cédula ya existe
    const [existingIdentification] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE cedula_nit = ?",
      [cedula_nit]
    );

    if (existingIdentification.length > 0) {
      // La cédula ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "Esta cédula o nit ya existe" });
    }

    //Verificar si el usuario ya existe
    const [existingUserName] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE usuario = ?",
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
      "SELECT id_cliente FROM clientes WHERE email = ?",
      [email]
    );

    if (existingEmail.length > 0) {
      //El email ya existe, responder con mensaje de error
      return res.status(400).json({ message: "Este email ya existe" });
    }

    //El cliente no existe, proceder a la incerción

    const [rows] = await pool.query(
      "INSERT INTO clientes(cedula_nit, dv, nombre, apellido, telefono, direccion, email, usuario, contrasenia, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ? )",
      [
        cedula_nit,
        dv,
        nombre,
        apellido,
        telefono,
        direccion,
        email,
        usuario,
        contrasenia,
        estado,
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
      usuario,
      contrasenia,
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
    const [rows] = await pool.query("SELECT * FROM clientes");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------------ Obtener cliente por Cédula ----------------

export const getCustomer = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM clientes WHERE cedula_nit = ?",
      [req.params.cedula_nit]
    );
    if (rows.length <= 0)
      return res.status(404).json({ message: "cliente no encontrado" });
    res.send(rows[0]);
  } catch (error) {
    console.error("Error en getCustomer:", error);
    return res.status(500).json({ message: "Something goes wrong" });
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
      usuario,
      contrasenia,
      estado,
    } = req.body;
    const { id } = req.params; // El ID del cliente que se desea actualizar

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

    //Verificar que el usuario no esta siendo usado por otro emppleado
    const [existingUserName] = await pool.query(
      "SELECT id_cliente FROM clientes WHERE usuario = ? AND id_cliente != ?",
      [usuario, id]
    );

    if (existingUserName.length > 0) {
      //El nombre de usuario ya está siendo usado por otro cliente
      return res.status(400).json({
        message: "Este nombre de usuario ya está siendo usado por otro cliente",
      });
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
        usuario = IFNULL(?, usuario),
        contrasenia = IFNULL(?, contrasenia),
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
      usuario,
      contrasenia,
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
