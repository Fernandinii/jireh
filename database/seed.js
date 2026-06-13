/**
 * Datos iniciales: primer usuario administrador si la BD está vacía.
 */
const { Usuario } = require('../models');

async function ensureSeed() {
  const count = await Usuario.count();
  if (count > 0) return;

  const user = process.env.ADMIN_USER || 'admin';
  const pass = process.env.ADMIN_PASS || 'admin123';

  await Usuario.create({
    nombre_usuario: user,
    password_hash: pass,
    nombre_completo: 'Administrador',
    rol: 'administrador',
    activo: true,
  });

  console.log(`[seed] Usuario administrador creado: "${user}" (cambie la contraseña en producción).`);
}

module.exports = { ensureSeed };
