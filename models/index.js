/**
 * Modelos Sequelize y asociaciones: POS, fiado, proveedores e inventario.
 */
const { sequelize } = require('../database/connection');
const defineUsuario = require('./Usuario');
const defineProveedor = require('./Proveedor');
const defineProducto = require('./Producto');
const defineCliente = require('./Cliente');
const defineVenta = require('./Venta');
const defineDetalleVenta = require('./DetalleVenta');
const defineAbono = require('./Abono');

const Usuario = defineUsuario(sequelize);
const Proveedor = defineProveedor(sequelize);
const Producto = defineProducto(sequelize);
const Cliente = defineCliente(sequelize);
const Venta = defineVenta(sequelize);
const DetalleVenta = defineDetalleVenta(sequelize);
const Abono = defineAbono(sequelize);

// Proveedor <-> Producto
Proveedor.hasMany(Producto, { foreignKey: 'proveedor_id', as: 'productos' });
Producto.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });

// Usuario -> Ventas / Abonos
Usuario.hasMany(Venta, { foreignKey: 'usuario_id', as: 'ventas' });
Venta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Usuario.hasMany(Abono, { foreignKey: 'usuario_id', as: 'abonos' });
Abono.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

// Cliente -> Ventas (crédito) / Abonos
Cliente.hasMany(Venta, { foreignKey: 'cliente_id', as: 'ventas' });
Venta.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Cliente.hasMany(Abono, { foreignKey: 'cliente_id', as: 'abonos' });
Abono.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

// Venta <-> Detalle
Venta.hasMany(DetalleVenta, { foreignKey: 'venta_id', as: 'detalles' });
DetalleVenta.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });

// Producto -> DetalleVenta
Producto.hasMany(DetalleVenta, { foreignKey: 'producto_id', as: 'detalleVentas' });
DetalleVenta.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

// Abono opcional a venta
Venta.hasMany(Abono, { foreignKey: 'venta_id', as: 'abonos' });
Abono.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });

module.exports = {
  sequelize,
  Usuario,
  Proveedor,
  Producto,
  Cliente,
  Venta,
  DetalleVenta,
  Abono,
};
