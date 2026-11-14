/**
 * Modelos Sequelize (Local-First / Multi-Empresa / Multi-Sucursal) y asociaciones.
 */
const { sequelize } = require('../database/connection');

const Empresa = require('./Empresa')(sequelize);
const Sucursal = require('./Sucursal')(sequelize);
const Usuario = require('./Usuario')(sequelize);
const Categoria = require('./Categoria')(sequelize);
const Producto = require('./Producto')(sequelize);
const InventarioSucursal = require('./InventarioSucursal')(sequelize);
const Proveedor = require('./Proveedor')(sequelize);
const ProductoProveedor = require('./ProductoProveedor')(sequelize);
const Compra = require('./Compra')(sequelize);
const DetalleCompra = require('./DetalleCompra')(sequelize);
const MovimientoInventario = require('./MovimientoInventario')(sequelize);
const Cliente = require('./Cliente')(sequelize);
const Venta = require('./Venta')(sequelize);
const DetalleVenta = require('./DetalleVenta')(sequelize);
const Abono = require('./Abono')(sequelize);
const Faltante = require('./Faltante')(sequelize);
const SyncQueue = require('./SyncQueue')(sequelize);
const SyncEstado = require('./SyncEstado')(sequelize);

// ---- Empresa (tenant raíz) ----
Empresa.hasMany(Sucursal, { foreignKey: 'empresa_id', as: 'sucursales' });
Empresa.hasMany(Usuario, { foreignKey: 'empresa_id', as: 'usuarios' });
Empresa.hasMany(Categoria, { foreignKey: 'empresa_id', as: 'categorias' });
Empresa.hasMany(Producto, { foreignKey: 'empresa_id', as: 'productos' });
Empresa.hasMany(Proveedor, { foreignKey: 'empresa_id', as: 'proveedores' });
Empresa.hasMany(Compra, { foreignKey: 'empresa_id', as: 'compras' });
Empresa.hasMany(Cliente, { foreignKey: 'empresa_id', as: 'clientes' });
Empresa.hasMany(Venta, { foreignKey: 'empresa_id', as: 'ventas' });
Empresa.hasMany(Abono, { foreignKey: 'empresa_id', as: 'abonos' });

// ---- Sucursal ----
Sucursal.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Sucursal.hasMany(Usuario, { foreignKey: 'sucursal_id', as: 'usuarios' });
Sucursal.hasMany(InventarioSucursal, { foreignKey: 'sucursal_id', as: 'inventarioSucursal' });
Sucursal.hasMany(Compra, { foreignKey: 'sucursal_id', as: 'compras' });
Sucursal.hasMany(MovimientoInventario, { foreignKey: 'sucursal_id', as: 'movimientosInventario' });
Sucursal.hasMany(Cliente, { foreignKey: 'sucursal_id', as: 'clientes' });
Sucursal.hasMany(Venta, { foreignKey: 'sucursal_id', as: 'ventas' });
Sucursal.hasMany(Abono, { foreignKey: 'sucursal_id', as: 'abonos' });
Sucursal.hasMany(Faltante, { foreignKey: 'sucursal_id', as: 'faltantes' });

// ---- Usuario ----
Usuario.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Usuario.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Usuario.hasMany(Compra, { foreignKey: 'usuario_id', as: 'compras' });
Usuario.hasMany(MovimientoInventario, { foreignKey: 'usuario_id', as: 'movimientosInventario' });
Usuario.hasMany(Venta, { foreignKey: 'usuario_id', as: 'ventas' });
Usuario.hasMany(Abono, { foreignKey: 'usuario_id', as: 'abonos' });

// ---- Categoria ----
Categoria.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Categoria.hasMany(Producto, { foreignKey: 'categoria_id', as: 'productos' });

// ---- Producto ----
Producto.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Producto.hasMany(InventarioSucursal, { foreignKey: 'producto_id', as: 'inventarioSucursal' });
Producto.belongsToMany(Proveedor, {
  through: ProductoProveedor,
  as: 'proveedores',
  foreignKey: 'producto_id',
  otherKey: 'proveedor_id',
});
Producto.hasMany(DetalleCompra, { foreignKey: 'producto_id', as: 'detalleCompras' });
Producto.hasMany(DetalleVenta, { foreignKey: 'producto_id', as: 'detalleVentas' });
Producto.hasMany(MovimientoInventario, { foreignKey: 'producto_id', as: 'movimientosInventario' });
Producto.hasMany(Faltante, { foreignKey: 'producto_id', as: 'faltantes' });

// ---- InventarioSucursal ----
InventarioSucursal.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
InventarioSucursal.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// ---- Proveedor ----
Proveedor.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Proveedor.belongsToMany(Producto, {
  through: ProductoProveedor,
  as: 'productos',
  foreignKey: 'proveedor_id',
  otherKey: 'producto_id',
});
Proveedor.hasMany(Compra, { foreignKey: 'proveedor_id', as: 'compras' });

// ---- ProductoProveedor ----
ProductoProveedor.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
ProductoProveedor.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });

// ---- Compra ----
Compra.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Compra.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Compra.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Compra.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Compra.hasMany(DetalleCompra, { foreignKey: 'compra_id', as: 'detalles' });

// ---- DetalleCompra ----
DetalleCompra.belongsTo(Compra, { foreignKey: 'compra_id', as: 'compra' });
DetalleCompra.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// ---- MovimientoInventario ----
MovimientoInventario.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
MovimientoInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
MovimientoInventario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// ---- Cliente ----
Cliente.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Cliente.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Cliente.hasMany(Venta, { foreignKey: 'cliente_id', as: 'ventas' });
Cliente.hasMany(Abono, { foreignKey: 'cliente_id', as: 'abonos' });

// ---- Venta ----
Venta.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Venta.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Venta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Venta.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Venta.hasMany(DetalleVenta, { foreignKey: 'venta_id', as: 'detalles' });

// ---- DetalleVenta ----
DetalleVenta.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
DetalleVenta.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// ---- Abono ----
Abono.belongsTo(Empresa, { foreignKey: 'empresa_id', as: 'empresa' });
Abono.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Abono.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Abono.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// ---- Faltante ----
Faltante.belongsTo(Sucursal, { foreignKey: 'sucursal_id', as: 'sucursal' });
Faltante.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// SyncQueue / SyncEstado no tienen asociaciones relacionales.

module.exports = {
  sequelize,
  Empresa,
  Sucursal,
  Usuario,
  Categoria,
  Producto,
  InventarioSucursal,
  Proveedor,
  ProductoProveedor,
  Compra,
  DetalleCompra,
  MovimientoInventario,
  Cliente,
  Venta,
  DetalleVenta,
  Abono,
  Faltante,
  SyncQueue,
  SyncEstado,
};
