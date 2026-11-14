/**
 * POS / Caja: captura rápida con teclado/lector de código de barras.
 * Sin dependencia de Bootstrap JS (modales manejados manualmente).
 */
(function () {
  'use strict';

  var carrito = [];       // [{ productoId, codigo_barras, nombre, es_granel, unidad_medida, precioVenta, stock, cantidad }]
  var resultados = [];
  var resultadoIndex = -1;
  var granelActual = null;
  var ventaReciente = null;

  var inputBusqueda = document.getElementById('input-busqueda');
  var resultadosEl = document.getElementById('resultados-busqueda');
  var carritoBody = document.getElementById('carrito-body');
  var carritoVacio = document.getElementById('carrito-vacio');
  var totalDisplay = document.getElementById('total-display');
  var tipoPago = document.getElementById('tipo-pago');
  var panelContado = document.getElementById('panel-contado');
  var panelFiado = document.getElementById('panel-fiado');
  var montoRecibido = document.getElementById('monto-recibido');
  var cambioDisplay = document.getElementById('cambio-display');
  var clienteSelect = document.getElementById('cliente-select');
  var clienteInfo = document.getElementById('cliente-info');
  var alertaCaja = document.getElementById('alerta-caja');
  var botonConfirmar = document.getElementById('boton-confirmar');

  // --- utilidades numéricas ---
  function num(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }
  function r2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function r3(n) { return Math.round((n + Number.EPSILON) * 1000) / 1000; }
  function fmt(n) { return '$' + n.toFixed(2); }

  function beep() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      o.start();
      o.stop(ctx.currentTime + 0.08);
    } catch (e) { /* sin audio */ }
  }

  // --- modales (manuales) ---
  function mostrarModal(id) {
    var el = document.getElementById(id);
    el.classList.add('show');
    el.style.display = 'block';
    document.body.classList.add('modal-open');
    var bd = document.createElement('div');
    bd.className = 'modal-backdrop fade show';
    bd.id = id + '-backdrop';
    bd.addEventListener('click', function () { ocultarModal(id); });
    document.body.appendChild(bd);
  }
  function ocultarModal(id) {
    var el = document.getElementById(id);
    el.classList.remove('show');
    el.style.display = 'none';
    document.body.classList.remove('modal-open');
    var bd = document.getElementById(id + '-backdrop');
    if (bd) bd.remove();
  }

  function mostrarAlerta(msg) {
    alertaCaja.textContent = msg;
    alertaCaja.classList.remove('d-none');
  }
  function ocultarAlerta() {
    alertaCaja.classList.add('d-none');
  }

  // --- carrito ---
  function totalCarrito() {
    return r2(carrito.reduce(function (acc, l) { return acc + l.cantidad * l.precioVenta; }, 0));
  }

  function renderCarrito() {
    carritoBody.innerHTML = '';
    if (carrito.length === 0) {
      var tr = document.createElement('tr');
      tr.id = 'carrito-vacio';
      tr.innerHTML = '<td colspan="6" class="text-center text-muted py-4">Carrito vacío — escanee o busque un producto.</td>';
      carritoBody.appendChild(tr);
    } else {
      carrito.forEach(function (l) {
        var tr = document.createElement('tr');
        var badge = l.es_granel ? ' <span class="badge bg-info text-dark ms-1">Granel</span>' : '';
        tr.innerHTML =
          '<td><code class="small">' + (l.codigo_barras || '—') + '</code></td>' +
          '<td>' + escapeHtml(l.nombre) + badge + '</td>' +
          '<td class="text-end"><input type="number" class="form-control form-control-sm text-end cantidad-input"' +
          ' data-id="' + l.productoId + '" value="' + l.cantidad + '" step="' + (l.es_granel ? '0.001' : '1') + '" min="0.001" /></td>' +
          '<td class="text-end">' + fmt(l.precioVenta) + '</td>' +
          '<td class="text-end fw-bold">' + fmt(r2(l.cantidad * l.precioVenta)) + '</td>' +
          '<td class="text-end"><button type="button" class="btn btn-sm btn-outline-danger quitar-linea" data-id="' + l.productoId + '">&times;</button></td>';
        carritoBody.appendChild(tr);
      });
    }
    renderTotales();
  }

  function renderTotales() {
    var total = totalCarrito();
    totalDisplay.textContent = fmt(total);
    if (tipoPago.value === 'contado') actualizarCambio();
  }

  function actualizarCambio() {
    var total = totalCarrito();
    var recibido = num(montoRecibido.value);
    var cambio = r2(recibido - total);
    cambioDisplay.textContent = fmt(cambio);
    if (recibido >= total && total > 0) {
      cambioDisplay.classList.remove('text-danger');
      cambioDisplay.classList.add('text-success');
    } else {
      cambioDisplay.classList.remove('text-success');
      cambioDisplay.classList.add('text-danger');
    }
  }

  function agregarAlCarrito(producto, cantidad) {
    var inv = (producto.inventarioSucursal && producto.inventarioSucursal.length) ? producto.inventarioSucursal[0] : null;
    if (!inv) { mostrarAlerta('Producto sin inventario en esta sucursal'); return; }

    var precioVenta = num(inv.precio_venta);
    var stock = num(inv.stock);

    var existente = carrito.find(function (l) { return l.productoId === producto.id; });
    var cantidadActual = existente ? existente.cantidad : 0;
    var nuevaCantidad = r3(cantidadActual + cantidad);

    if (!producto.es_granel) nuevaCantidad = Math.round(nuevaCantidad);
    if (nuevaCantidad > stock) {
      mostrarAlerta('Stock insuficiente para "' + producto.nombre + '" (disponible: ' + stock + ')');
      return;
    }

    if (existente) {
      existente.cantidad = nuevaCantidad;
    } else {
      carrito.push({
        productoId: producto.id,
        codigo_barras: producto.codigo_barras,
        nombre: producto.nombre,
        es_granel: producto.es_granel,
        unidad_medida: producto.unidad_medida,
        precioVenta: precioVenta,
        stock: stock,
        cantidad: nuevaCantidad,
      });
    }
    renderCarrito();
  }

  function quitarLinea(productoId) {
    carrito = carrito.filter(function (l) { return l.productoId !== productoId; });
    renderCarrito();
  }

  function editarCantidad(productoId, nuevaCantidad) {
    var l = carrito.find(function (x) { return x.productoId === productoId; });
    if (!l) return;
    var c = num(nuevaCantidad);
    if (!l.es_granel) c = Math.round(c);
    if (c <= 0) { quitarLinea(productoId); return; }
    if (c > l.stock) {
      mostrarAlerta('Stock insuficiente (disponible: ' + l.stock + ')');
      c = l.cantidad; // revertir
    }
    l.cantidad = c;
    renderCarrito();
  }

  // --- búsqueda ---
  function limpiarResultados() {
    resultados = [];
    resultadoIndex = -1;
    resultadosEl.classList.add('d-none');
    resultadosEl.innerHTML = '';
  }

  function renderResultados() {
    resultadosEl.innerHTML = '';
    if (!resultados.length) { limpiarResultados(); return; }
    resultadosEl.classList.remove('d-none');
    resultados.forEach(function (p, i) {
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2' + (i === resultadoIndex ? ' active' : '');
      var inv = (p.inventarioSucursal && p.inventarioSucursal.length) ? p.inventarioSucursal[0] : null;
      var stock = inv ? num(inv.stock) : 0;
      var precio = inv ? fmt(num(inv.precio_venta)) : '—';
      var unidad = p.es_granel ? (' /' + (p.unidad_medida || 'kg')) : '';
      a.innerHTML = '<span>' + escapeHtml(p.nombre) + (p.es_granel ? ' <span class="badge bg-info text-dark">Granel</span>' : '') + '</span>' +
        '<span class="small text-muted">' + precio + unidad + ' · stock ' + stock + '</span>';
      a.addEventListener('click', function () { seleccionarProducto(p); });
      resultadosEl.appendChild(a);
    });
  }

  function seleccionarProducto(p) {
    limpiarResultados();
    if (p.es_granel) abrirModalGranel(p);
    else { agregarAlCarrito(p, 1); beep(); }
    inputBusqueda.value = '';
    inputBusqueda.focus();
  }

  async function buscar(q) {
    if (!q) { limpiarResultados(); return; }
    try {
      var res = await fetch('/ventas/api/buscar-productos?q=' + encodeURIComponent(q));
      var data = await res.json();
      if (data.exacto) {
        var p = data.productos[0];
        limpiarResultados();
        seleccionarProducto(p);
      } else {
        resultados = data.productos || [];
        resultadoIndex = resultados.length ? 0 : -1;
        renderResultados();
      }
    } catch (e) {
      mostrarAlerta('Error de búsqueda: ' + e.message);
    }
  }

  // --- modal granel ---
  var granelPeso = document.getElementById('granel-peso');
  var granelImporte = document.getElementById('granel-importe');

  function abrirModalGranel(p) {
    granelActual = p;
    var inv = (p.inventarioSucursal && p.inventarioSucursal.length) ? p.inventarioSucursal[0] : null;
    var precio = inv ? num(inv.precio_venta) : 0;
    var stock = inv ? num(inv.stock) : 0;
    var unidad = p.unidad_medida || 'kg';

    document.getElementById('granel-nombre').textContent = p.nombre;
    document.getElementById('granel-precio').textContent = fmt(precio);
    document.getElementById('granel-unidad').textContent = unidad;
    document.getElementById('granel-unidad-label').textContent = unidad;
    document.getElementById('granel-unidad-stock').textContent = unidad;
    document.getElementById('granel-stock').textContent = stock;
    granelPeso.value = '';
    granelImporte.value = '';
    mostrarModal('modal-granel');
    setTimeout(function () { granelPeso.focus(); }, 100);
  }

  granelPeso.addEventListener('input', function () {
    var p = granelActual;
    if (!p) return;
    var inv = (p.inventarioSucursal && p.inventarioSucursal.length) ? p.inventarioSucursal[0] : null;
    var precio = inv ? num(inv.precio_venta) : 0;
    var peso = num(granelPeso.value);
    if (peso > 0 && precio > 0) granelImporte.value = r2(peso * precio).toFixed(2);
  });

  granelImporte.addEventListener('input', function () {
    var p = granelActual;
    if (!p) return;
    var inv = (p.inventarioSucursal && p.inventarioSucursal.length) ? p.inventarioSucursal[0] : null;
    var precio = inv ? num(inv.precio_venta) : 0;
    var importe = num(granelImporte.value);
    if (importe > 0 && precio > 0) granelPeso.value = r3(importe / precio).toFixed(3);
  });

  document.getElementById('granel-confirmar').addEventListener('click', function () {
    var p = granelActual;
    if (!p) return;
    var inv = (p.inventarioSucursal && p.inventarioSucursal.length) ? p.inventarioSucursal[0] : null;
    var stock = inv ? num(inv.stock) : 0;
    var peso = num(granelPeso.value);
    if (peso <= 0) { mostrarAlerta('Ingrese una cantidad mayor a cero'); return; }
    if (peso > stock) { mostrarAlerta('Stock insuficiente (disponible: ' + stock + ')'); return; }
    ocultarModal('modal-granel');
    agregarAlCarrito(p, peso);
    beep();
    granelActual = null;
  });

  // --- tipo de pago ---
  tipoPago.addEventListener('change', function () {
    var credito = tipoPago.value === 'credito';
    panelContado.classList.toggle('d-none', credito);
    panelFiado.classList.toggle('d-none', !credito);
    actualizarInfoCliente();
    renderTotales();
  });

  clienteSelect.addEventListener('change', actualizarInfoCliente);

  function actualizarInfoCliente() {
    var opt = clienteSelect.options[clienteSelect.selectedIndex];
    if (tipoPago.value === 'credito' && opt && opt.value) {
      var saldo = num(opt.dataset.saldo);
      var limite = num(opt.dataset.limite);
      clienteInfo.innerHTML = 'Saldo actual: <strong>$' + saldo.toFixed(2) + '</strong>' +
        (limite > 0 ? ' · Límite: $' + limite.toFixed(2) + ' · Disponible: $' + Math.max(0, limite - saldo).toFixed(2) : '');
    } else {
      clienteInfo.textContent = '';
    }
  }

  // --- cobro (contado) ---
  montoRecibido.addEventListener('input', actualizarCambio);
  document.querySelectorAll('[data-monto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.dataset.monto;
      if (v === 'exacto') montoRecibido.value = totalCarrito().toFixed(2);
      else montoRecibido.value = v;
      actualizarCambio();
      botonConfirmar.focus();
    });
  });

  // --- confirmar cobro ---
  async function confirmarCobro() {
    ocultarAlerta();
    if (carrito.length === 0) { mostrarAlerta('El carrito está vacío'); return; }

    var credito = tipoPago.value === 'credito';
    if (credito && !clienteSelect.value) { mostrarAlerta('Seleccione un cliente para la venta a crédito'); return; }

    var body = {
      clienteId: credito ? clienteSelect.value : null,
      tipoPago: tipoPago.value,
      montoRecibido: credito ? 0 : num(montoRecibido.value),
      items: carrito.map(function (l) { return { productoId: l.productoId, cantidad: l.cantidad }; }),
    };

    botonConfirmar.disabled = true;
    try {
      var res = await fetch('/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      var data = await res.json();
      if (res.ok && data.ok) {
        ventaReciente = data.venta;
        mostrarExito(data.venta);
      } else {
        mostrarAlerta(data.error || 'No se pudo registrar la venta');
      }
    } catch (e) {
      mostrarAlerta('Error de conexión: ' + e.message);
    } finally {
      botonConfirmar.disabled = false;
    }
  }

  function mostrarExito(venta) {
    document.getElementById('exito-folio').textContent = '#' + String(venta.folio_local || '').padStart(4, '0');
    document.getElementById('exito-cambio').textContent = fmt(num(venta.cambio));
    mostrarModal('modal-exito');
  }

  document.getElementById('btn-imprimir').addEventListener('click', function () {
    if (ventaReciente) window.open('/ventas/' + ventaReciente.id + '/ticket', '_blank');
  });

  document.getElementById('btn-nueva-venta').addEventListener('click', function () {
    carrito = [];
    ventaReciente = null;
    montoRecibido.value = '';
    ocultarModal('modal-exito');
    renderCarrito();
    inputBusqueda.focus();
  });

  botonConfirmar.addEventListener('click', confirmarCobro);

  // --- eventos globales ---
  inputBusqueda.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (resultados.length && resultadoIndex >= 0) {
        seleccionarProducto(resultados[resultadoIndex]);
      } else {
        buscar(inputBusqueda.value.trim());
      }
    } else if (e.key === 'ArrowDown' && resultados.length) {
      e.preventDefault();
      resultadoIndex = Math.min(resultadoIndex + 1, resultados.length - 1);
      renderResultados();
    } else if (e.key === 'ArrowUp' && resultados.length) {
      e.preventDefault();
      resultadoIndex = Math.max(resultadoIndex - 1, 0);
      renderResultados();
    } else if (e.key === 'Escape') {
      limpiarResultados();
    }
  });

  document.addEventListener('keydown', function (e) {
    var esModal = document.querySelector('.modal.show');
    if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
      if (esModal) return;
      e.preventDefault();
      confirmarCobro();
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.dataset.cerrar) { ocultarModal(e.target.dataset.cerrar); return; }
    if (!resultadosEl.contains(e.target) && e.target !== inputBusqueda) limpiarResultados();
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
      inputBusqueda.focus();
    }
  });

  carritoBody.addEventListener('change', function (e) {
    if (e.target.classList.contains('cantidad-input')) {
      editarCantidad(e.target.dataset.id, e.target.value);
    }
  });
  carritoBody.addEventListener('click', function (e) {
    if (e.target.classList.contains('quitar-linea')) {
      quitarLinea(e.target.dataset.id);
    }
  });

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // --- inicio ---
  renderTotales();
  inputBusqueda.focus();
})();
