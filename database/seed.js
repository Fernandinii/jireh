/**
 * Datos iniciales (seed) en una transacción si la BD no tiene empresas:
 *  1. Empresa "Papelería y Abarrotes Jireh"
 *  2. Sucursal "Matriz"
 *  3. Usuario admin (ADMIN_USER/ADMIN_PASS o admin/admin123)
 *  4. Categorías base: Papelería, Abarrotes, Ferretería
 *  5. 2 productos de ejemplo (pieza y granel) + inventario por sucursal
 */
const { sequelize, Empresa, Sucursal, Usuario, Categoria, Producto, InventarioSucursal } = require('../models');

async function ensureSeed() {
  const count = await Empresa.count();
  if (count > 0) return;

  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin123';

  await sequelize.transaction(async (t) => {
    const empresa = await Empresa.create(
      { nombre: 'Papelería y Abarrotes Jireh', rfc: null, plan: 'basico', activo: true },
      { transaction: t }
    );

    const sucursal = await Sucursal.create(
      { empresa_id: empresa.id, nombre: 'Matriz', activo: true },
      { transaction: t }
    );

    const admin = await Usuario.create(
      {
        empresa_id: empresa.id,
        sucursal_id: sucursal.id,
        nombre_usuario: adminUser,
        password_hash: adminPass,
        nombre_completo: 'Administrador',
        rol: 'admin',
        activo: true,
      },
      { transaction: t }
    );

    const categorias = await Categoria.bulkCreate(
      [
        { empresa_id: empresa.id, nombre: 'Papelería', color_hex: '#0d6efd' },
        { empresa_id: empresa.id, nombre: 'Abarrotes', color_hex: '#198754' },
        { empresa_id: empresa.id, nombre: 'Ferretería', color_hex: '#dc3545' },
      ],
      { transaction: t }
    );

    const [catPapeleria, catAbarrotes] = categorias;

    const productoPieza = await Producto.create(
      {
        empresa_id: empresa.id,
        categoria_id: catPapeleria.id,
        codigo_barras: '7501234567890',
        nombre: 'Cuaderno profesional cuadro chico',
        es_granel: false,
        unidad_medida: 'pieza',
        activo: true,
      },
      { transaction: t }
    );

    const productoGranel = await Producto.create(
      {
        empresa_id: empresa.id,
        categoria_id: catAbarrotes.id,
        codigo_barras: '7509876543210',
        nombre: 'Arroz a granel',
        es_granel: true,
        unidad_medida: 'kg',
        activo: true,
      },
      { transaction: t }
    );

    await InventarioSucursal.bulkCreate(
      [
        {
          sucursal_id: sucursal.id,
          producto_id: productoPieza.id,
          precio_compra: 25.5,
          precio_venta: 45.0,
          stock: 100,
          stock_minimo: 10,
        },
        {
          sucursal_id: sucursal.id,
          producto_id: productoGranel.id,
          precio_compra: 18.0,
          precio_venta: 28.5,
          stock: 50.0,
          stock_minimo: 5.0,
        },
      ],
      { transaction: t }
    );

    console.log(
      `[seed] Empresa, sucursal, admin "${adminUser}" (rol admin), categorías y productos de ejemplo creados.`
    );
  });
}

module.exports = { ensureSeed };
