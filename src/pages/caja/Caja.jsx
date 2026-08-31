import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import {
  Wallet,
  LockKeyhole,
  UnlockKeyhole,
  PlusCircle,
  MinusCircle,
  X,
  Save,
  Calculator,
  AlertTriangle,
  Printer,
  FileText,
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  esSuperAdmin,
  obtenerSucursalInicial,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

const movimientoInicial = {
  tipo_movimiento: 'ENTRADA',
  concepto: '',
  monto: '',
  metodo_pago: 'EFECTIVO',
  referencia: '',
  observaciones: '',
};

const tiposMovimiento = [
  { value: 'ENTRADA', label: 'Entrada de efectivo' },
  { value: 'SALIDA', label: 'Salida de efectivo' },
  { value: 'GASTO', label: 'Gasto operativo' },
  { value: 'RETIRO', label: 'Retiro de caja' },
  { value: 'PAGO_PROVEEDOR', label: 'Pago a proveedor' },
  { value: 'AJUSTE', label: 'Ajuste de caja' },
];

const denominacionesCaja = [
  { tipo: 'Billete', valor: 1000 },
  { tipo: 'Billete', valor: 500 },
  { tipo: 'Billete', valor: 200 },
  { tipo: 'Billete', valor: 100 },
  { tipo: 'Billete', valor: 50 },
  { tipo: 'Billete', valor: 20 },
  { tipo: 'Moneda', valor: 10 },
  { tipo: 'Moneda', valor: 5 },
  { tipo: 'Moneda', valor: 2 },
  { tipo: 'Moneda', valor: 1 },
  { tipo: 'Moneda', valor: 0.5 },
];

const normalizarMetodoPago = (metodo) => {
  const valor = String(metodo || '').trim().toUpperCase();
  return valor || '—';
};

const numeroSeguro = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
};

const calcularTotalConteoEfectivo = (conteo = {}) => {
  return denominacionesCaja.reduce((acc, denominacion) => {
    const cantidad = Number(conteo[denominacion.valor] || 0);
    return acc + cantidad * Number(denominacion.valor);
  }, 0);
};

const obtenerPrimerValorNumerico = (objeto, campos = []) => {
  for (const campo of campos) {
    if (objeto?.[campo] !== undefined && objeto?.[campo] !== null && objeto?.[campo] !== '') {
      return Number(objeto[campo]);
    }
  }

  return null;
};

const parsearPosibleJson = (valor) => {
  if (!valor) return null;
  if (Array.isArray(valor)) return valor;

  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  return null;
};

const obtenerPagosDeVenta = (venta = {}) => {
  const pagosDirectos =
    parsearPosibleJson(venta.pagos) ||
    parsearPosibleJson(venta.detalle_pagos) ||
    parsearPosibleJson(venta.pagos_detalle) ||
    parsearPosibleJson(venta.formas_pago);

  if (pagosDirectos?.length) {
    return pagosDirectos
      .map((pago) => ({
        metodo_pago: normalizarMetodoPago(pago.metodo_pago || pago.metodo || pago.tipo_pago),
        monto: obtenerPrimerValorNumerico(pago, ['monto', 'importe', 'total', 'cantidad']),
        referencia: pago.referencia || pago.folio_referencia || null,
        explicito: true,
      }))
      .filter((pago) => pago.metodo_pago !== '—');
  }

  const pagosPorCampo = [
    {
      metodo_pago: 'EFECTIVO',
      monto: obtenerPrimerValorNumerico(venta, ['monto_efectivo', 'efectivo', 'ventas_efectivo', 'pago_efectivo']),
    },
    {
      metodo_pago: 'TARJETA',
      monto: obtenerPrimerValorNumerico(venta, ['monto_tarjeta', 'tarjeta', 'ventas_tarjeta', 'pago_tarjeta']),
    },
    {
      metodo_pago: 'TRANSFERENCIA',
      monto: obtenerPrimerValorNumerico(venta, ['monto_transferencia', 'transferencia', 'ventas_transferencia', 'pago_transferencia']),
    },
    {
      metodo_pago: 'PUNTOS',
      monto: obtenerPrimerValorNumerico(venta, ['monto_puntos', 'puntos', 'ventas_puntos', 'pago_puntos']),
    },
  ].filter((pago) => pago.monto !== null && Number(pago.monto) > 0);

  if (pagosPorCampo.length) {
    return pagosPorCampo.map((pago) => ({ ...pago, explicito: true }));
  }

  const montoPagoExplicito = obtenerPrimerValorNumerico(venta, [
    'monto_pago',
    'importe_pago',
    'total_pago',
    'monto_pagado',
    'pago_monto',
  ]);

  const metodo = normalizarMetodoPago(venta.metodo_pago || venta.metodo || venta.tipo_pago);

  if (metodo === 'MIXTO') {
    return [{ metodo_pago: 'MIXTO', monto: null, referencia: null, explicito: false }];
  }

  return [
    {
      metodo_pago: metodo,
      monto: montoPagoExplicito !== null ? montoPagoExplicito : numeroSeguro(venta.total),
      referencia: venta.referencia || null,
      explicito: montoPagoExplicito !== null,
    },
  ];
};

const agruparVentas = (ventas = []) => {
  const mapa = new Map();

  ventas.forEach((venta, index) => {
    const clave = venta.id_venta || venta.folio || `${venta.fecha_venta || 'venta'}-${index}`;
    const pagos = obtenerPagosDeVenta(venta);

    if (!mapa.has(clave)) {
      mapa.set(clave, {
        ...venta,
        pagos: [],
      });
    }

    const agrupada = mapa.get(clave);

    agrupada.total = venta.total ?? agrupada.total;
    agrupada.subtotal = venta.subtotal ?? agrupada.subtotal;
    agrupada.descuento = venta.descuento ?? agrupada.descuento;
    agrupada.usuario = venta.usuario || agrupada.usuario;
    agrupada.metodo_pago = venta.metodo_pago || agrupada.metodo_pago;

    pagos.forEach((pago) => {
      const metodo = normalizarMetodoPago(pago.metodo_pago);
      const yaExiste = agrupada.pagos.some(
        (p) =>
          normalizarMetodoPago(p.metodo_pago) === metodo &&
          Number(p.monto || 0) === Number(pago.monto || 0) &&
          Boolean(p.explicito) === Boolean(pago.explicito)
      );

      if (!yaExiste) {
        agrupada.pagos.push({ ...pago, metodo_pago: metodo });
      }
    });
  });

  return Array.from(mapa.values()).map((venta) => {
    const pagosValidos = venta.pagos.filter((pago) => pago.metodo_pago && pago.metodo_pago !== '—');
    const pagosUnicos = new Map();

    pagosValidos.forEach((pago) => {
      const llave = `${pago.metodo_pago}-${pago.explicito ? pago.monto : 'sin-monto'}`;
      if (!pagosUnicos.has(llave)) pagosUnicos.set(llave, pago);
    });

    return {
      ...venta,
      pagos: Array.from(pagosUnicos.values()),
      metodo_pago:
        pagosValidos.length > 1
          ? 'MIXTO'
          : venta.metodo_pago || pagosValidos[0]?.metodo_pago || '—',
    };
  });
};

const agruparMovimientosCaja = (movimientos = []) => {
  const resultado = [];
  const mapaVentas = new Map();

  movimientos.forEach((movimiento) => {
    const tipo = normalizarMetodoPago(movimiento.tipo_movimiento);
    const referencia = movimiento.referencia || '';
    const concepto = movimiento.concepto || '';
    const esVenta = tipo === 'VENTA';

    if (!esVenta || (!referencia && !concepto)) {
      resultado.push(movimiento);
      return;
    }

    const clave = `${referencia || concepto}`;

    if (!mapaVentas.has(clave)) {
      const agrupado = {
        ...movimiento,
        monto: 0,
        metodos_pago: [],
        observaciones_grupo: [],
      };

      mapaVentas.set(clave, agrupado);
      resultado.push(agrupado);
    }

    const agrupado = mapaVentas.get(clave);
    agrupado.monto = numeroSeguro(agrupado.monto) + numeroSeguro(movimiento.monto);

    const metodo = normalizarMetodoPago(movimiento.metodo_pago);
    if (metodo !== '—' && !agrupado.metodos_pago.includes(metodo)) {
      agrupado.metodos_pago.push(metodo);
    }

    if (movimiento.observaciones && !agrupado.observaciones_grupo.includes(movimiento.observaciones)) {
      agrupado.observaciones_grupo.push(movimiento.observaciones);
    }

    agrupado.metodo_pago = agrupado.metodos_pago.length > 1 ? 'MIXTO' : agrupado.metodos_pago[0] || movimiento.metodo_pago;
    agrupado.observaciones = agrupado.observaciones_grupo.join(' | ') || movimiento.observaciones;
  });

  return resultado;
};

const formatearPagosVenta = (venta, formatoMoneda) => {
  const pagos = venta?.pagos || [];

  if (!pagos.length) {
    return normalizarMetodoPago(venta?.metodo_pago);
  }

  if (pagos.length === 1 && pagos[0].metodo_pago === 'MIXTO') {
    return 'MIXTO';
  }

  return pagos
    .map((pago) => {
      if (pago.monto === null || pago.monto === undefined || pago.monto === '') {
        return pago.metodo_pago;
      }

      return `${pago.metodo_pago}: ${formatoMoneda(pago.monto)}`;
    })
    .join(' | ');
};

const parsearAtributosVarianteReporte = (valor) => {
  if (!valor) return {};
  if (typeof valor === 'object' && !Array.isArray(valor)) return valor;

  if (typeof valor === 'string') {
    try {
      const parsed = JSON.parse(valor);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return {};
    }
  }

  return {};
};

const obtenerDescripcionVarianteReporte = (item = {}) => {
  if (!item?.id_variante) return '—';

  const nombreVariante = String(item.nombre_variante || '').trim();
  if (nombreVariante) return nombreVariante;

  const atributos = parsearAtributosVarianteReporte(item.atributos_variante);
  const valores = [
    item.talla,
    item.color,
    item.tono,
    item.presentacion_variante,
    ...Object.values(atributos),
  ]
    .map((valor) => String(valor ?? '').trim())
    .filter(Boolean);

  const unicos = [...new Set(valores)];
  return unicos.join(' · ') || `Variante #${item.id_variante}`;
};

const obtenerCodigoVarianteReporte = (item = {}) => {
  return (
    item.sku_variante ||
    item.codigo_barras_variante ||
    item.codigo_barras_producto ||
    item.codigo_barras ||
    '—'
  );
};



function ReporteCierreCajaImprimible({ reporte }) {
  const formatoNumero = (valor) => {
    const numero = Number(valor || 0);

    if (!Number.isFinite(numero)) return '0';

    return numero.toLocaleString('es-MX', {
      minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
      maximumFractionDigits: 2,
    });
  };

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  };

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    const fechaObj = new Date(fecha);

    if (Number.isNaN(fechaObj.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(fechaObj);
  };

  const sesion = reporte?.sesion || {};
  const resumen = reporte?.resumen || {};
  const ventas = reporte?.ventas || [];
  const productos = reporte?.productos || [];
  const detalleProductos = reporte?.detalle_productos || [];
  const movimientos = reporte?.movimientos || [];

  const ventasAgrupadas = agruparVentas(ventas);
  const movimientosAgrupados = agruparMovimientosCaja(movimientos);
  const ventasPuntos = Number(resumen.ventas_puntos || resumen.ventas_puntos_canjeados || 0);
  const puntosGanados = Number(resumen.puntos_ganados || 0);

  const salidasTotales =
    Number(resumen.salidas_efectivo || 0) +
    Number(resumen.gastos_efectivo || 0) +
    Number(resumen.retiros_efectivo || 0) +
    Number(resumen.pagos_proveedor_efectivo || 0);

  const diferencia = Number(sesion.diferencia || 0);

  return (
    <div className="reporte-print-page overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white text-[#33292D] shadow-[0_12px_40px_rgba(118,76,91,0.05)] print:rounded-none print:border-0 print:shadow-none">
      {/* ENCABEZADO */}
      <div className="bg-[#B85F7D] px-8 py-7 text-white print:border-b-4 print:border-[#B85F7D] print:bg-white print:text-[#33292D]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold opacity-90 print:text-[#8C777F]">
              Moda & Belleza
            </p>

            <h1 className="text-3xl font-black mt-1 print:text-2xl">
              Reporte de cierre de caja
            </h1>

            <p className="text-sm opacity-90 mt-2 print:text-[#8C777F]">
              Corte generado al finalizar la sesión de caja.
            </p>
          </div>

          <div className="text-right">
            <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white print:border print:border-[#F0D4DE] print:bg-[#FFF2F5] print:text-[#A84E6C]">
              Sesión #{sesion.id_sesion || '—'}
            </div>

            <p className="text-xs mt-3 opacity-90 print:text-[#8C777F]">
              Fecha cierre
            </p>

            <p className="font-bold text-sm print:text-[#43353A]">
              {formatoFecha(sesion.fecha_cierre)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 print:p-0 print:pt-5 print:space-y-5">
        {/* DATOS GENERALES */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-[#43353A]">
              Datos de la sesión
            </h2>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#F8EDF1] text-[#766168]">
              CORTE DE CAJA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
            <InfoCard label="Sucursal" value={sesion.sucursal || '—'} />
            <InfoCard label="Caja" value={sesion.caja || '—'} />

            <InfoCard label="Fecha apertura" value={formatoFecha(sesion.fecha_apertura)} />
            <InfoCard label="Fecha cierre" value={formatoFecha(sesion.fecha_cierre)} />
          </div>
        </section>

        {/* RESUMEN PRINCIPAL */}
        <section>
          <h2 className="text-lg font-black text-[#43353A] mb-4">
            Resumen del corte
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 print:grid-cols-3 print:gap-2">
            <MetricCard
              label="Monto inicial"
              value={formatoMoneda(resumen.monto_inicial)}
              tone="slate"
            />

            <MetricCard
              label="Ventas efectivo"
              value={formatoMoneda(resumen.ventas_efectivo)}
              tone="sky"
            />

            <MetricCard
              label="Ventas no efectivo"
              value={formatoMoneda(resumen.ventas_no_efectivo)}
              tone="indigo"
            />

            <MetricCard
              label="Ventas puntos"
              value={formatoMoneda(ventasPuntos)}
              tone="amber"
            />

            <MetricCard
              label="Puntos ganados"
              value={puntosGanados.toFixed(2)}
              tone="violet"
            />

            <MetricCard
              label="Total vendido"
              value={formatoMoneda(resumen.ventas_total)}
              tone="emerald"
            />
          </div>
        </section>

        {/* CONCILIACIÓN */}
        <section>
          <div className="rounded-[2rem] border border-[#EEDFE4] bg-[#FFFAFB] p-5 print:rounded-xl print:p-3">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center print:grid-cols-5 print:gap-2">
              <ResumenMonto
                label="Entradas efectivo"
                value={formatoMoneda(resumen.entradas_efectivo)}
              />

              <ResumenMonto
                label="Salidas / gastos"
                value={formatoMoneda(salidasTotales)}
              />

              <ResumenMonto
                label="Esperado en caja"
                value={formatoMoneda(resumen.monto_final_sistema)}
              />

              <ResumenMonto
                label="Contado"
                value={formatoMoneda(sesion.monto_final_real)}
              />

              <div
                className={`rounded-2xl p-4 border print:p-2 ${diferencia === 0
                  ? 'bg-emerald-50 border-emerald-100'
                  : 'bg-red-50 border-red-100'
                  }`}
              >
                <p className="text-xs font-black uppercase text-[#8C777F]">
                  Diferencia
                </p>

                <p
                  className={`text-2xl font-black mt-1 print:text-lg ${diferencia === 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                >
                  {formatoMoneda(diferencia)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* VENTAS */}
        <TablaReporte
          titulo="Ventas realizadas"
          columnas={['Folio', 'Fecha', 'Pagos', 'Total', 'Usuario']}
          vacio="No hay ventas registradas."
          filas={ventasAgrupadas.map((venta) => [
            venta.folio || '—',
            formatoFecha(venta.fecha_venta),
            formatearPagosVenta(venta, formatoMoneda),
            formatoMoneda(venta.total),
            venta.usuario || '—',
          ])}
          rightColumns={[3]}
        />

        {/* RESUMEN DE PRODUCTOS */}
        <TablaReporte
          titulo="Resumen de productos vendidos"
          columnas={['Producto', 'Cantidad', 'Total vendido']}
          vacio="No hay productos vendidos."
          filas={productos.map((producto) => [
            producto.producto || '—',
            producto.cantidad_total || 0,
            formatoMoneda(producto.total_vendido),
          ])}
          rightColumns={[1, 2]}
        />

        {/* DETALLE DE PRODUCTOS / VARIANTES */}
        <TablaReporte
          titulo="Detalle de productos vendidos"
          columnas={['Folio', 'Producto / variante', 'Código / SKU', 'Lote', 'Cant.', 'P. unitario', 'Subtotal']}
          vacio="No hay detalle de productos vendidos."
          filas={detalleProductos.map((item) => [
            item.folio_venta || '—',
            item.id_variante
              ? `${item.producto || 'Producto'} · ${obtenerDescripcionVarianteReporte(item)}`
              : item.producto || '—',
            obtenerCodigoVarianteReporte(item),
            item.lote || 'Sin lote',
            formatoNumero(item.cantidad),
            formatoMoneda(item.precio_unitario),
            formatoMoneda(item.subtotal),
          ])}
          rightColumns={[4, 5, 6]}
        />

        {/* MOVIMIENTOS */}
        <TablaReporte
          titulo="Movimientos de caja"
          columnas={['Fecha', 'Tipo', 'Concepto', 'Método', 'Monto']}
          vacio="No hay movimientos registrados."
          filas={movimientosAgrupados.map((movimiento) => [
            formatoFecha(movimiento.fecha_movimiento),
            movimiento.tipo_movimiento || '—',
            movimiento.concepto || '—',
            movimiento.metodo_pago || '—',
            formatoMoneda(movimiento.monto),
          ])}
          rightColumns={[4]}
        />

        {/* TOTAL FINAL */}
        <section className="rounded-[1.5rem] border-2 border-[#F0D4DE] bg-[#FFF5F7] p-5 print:rounded-xl print:p-3">
          <h2 className="text-lg font-black text-[#43353A] mb-4">
            Resultado final del corte
          </h2>

          <div className="space-y-3">
            <TotalRow label="Total vendido" value={formatoMoneda(resumen.ventas_total)} />
            <TotalRow label="Total no efectivo" value={formatoMoneda(resumen.ventas_no_efectivo)} />
            <TotalRow label="Ventas con puntos" value={formatoMoneda(ventasPuntos)} />
            <TotalRow label="Puntos ganados" value={puntosGanados.toFixed(2)} />
            <TotalRow label="Monto esperado en caja física" value={formatoMoneda(resumen.monto_final_sistema)} />
            <TotalRow label="Monto contado" value={formatoMoneda(sesion.monto_final_real)} />

            <div className="border-t border-[#E8C3CF] pt-3">
              <TotalRow
                label="Diferencia"
                value={formatoMoneda(diferencia)}
                strong
                danger={diferencia !== 0}
              />
            </div>
          </div>
        </section>

        {sesion.observaciones_cierre && (
          <section>
            <h2 className="text-lg font-black text-[#43353A] mb-3">
              Observaciones
            </h2>

            <div className="rounded-2xl border border-[#EEDFE4] bg-[#FFFAFB] p-4 text-sm text-[#66535A] whitespace-pre-wrap print:p-3">
              {sesion.observaciones_cierre}
            </div>
          </section>
        )}


      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-[#EEDFE4] bg-white p-4 print:p-2 print:rounded-xl">
      <p className="text-xs font-black uppercase tracking-wide text-[#AA939B]">
        {label}
      </p>
      <p className="text-sm font-bold text-[#43353A] mt-1 break-words print:text-xs">
        {value}
      </p>
    </div>
  );
}

function MetricCard({ label, value, tone = 'slate' }) {
  const tones = {
    slate: 'bg-[#FFFAFB] border-[#EEDFE4] text-[#43353A]',
    sky: 'bg-[#FFF2F5] border-[#F0D4DE] text-[#A84E6C]',
    indigo: 'bg-[#F3EEF7] border-[#E5DCEC] text-[#765D8D]',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    violet: 'bg-[#F6EEF3] border-[#E9D7E0] text-[#8C6173]',
    red: 'bg-red-50 border-red-100 text-red-700',
    blue: 'bg-[#F0EBF6] border-[#E3D8EB] text-[#765D8D]',
  };

  return (
    <div className={`rounded-[2rem] border p-5 print:p-2 print:rounded-xl ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="text-2xl font-black mt-2 print:text-base">
        {value}
      </p>
    </div>
  );
}

function ResumenMonto({ label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-[#EEDFE4] p-4 print:p-2">
      <p className="text-xs font-black uppercase text-[#AA939B]">
        {label}
      </p>
      <p className="text-lg font-black text-[#43353A] mt-1 print:text-sm">
        {value}
      </p>
    </div>
  );
}

function TablaReporte({ titulo, columnas, filas, vacio, rightColumns = [] }) {
  return (
    <section>
      <h2 className="text-lg font-black text-[#43353A] mb-3">
        {titulo}
      </h2>

      <div className="overflow-hidden rounded-2xl border border-[#EEDFE4] print:rounded-none">
        <table className="w-full text-sm print:text-[10px]">
          <thead className="bg-[#F8EDF1]">
            <tr>
              {columnas.map((columna, index) => (
                <th
                  key={columna}
                  className={`px-4 py-3 text-xs font-black uppercase tracking-wide text-[#8C777F] print:px-2 print:py-1 ${rightColumns.includes(index) ? 'text-right' : 'text-left'
                    }`}
                >
                  {columna}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F5EAED]">
            {filas.length === 0 ? (
              <tr>
                <td
                  colSpan={columnas.length}
                  className="px-4 py-6 text-center text-[#8C777F] print:py-3"
                >
                  {vacio}
                </td>
              </tr>
            ) : (
              filas.map((fila, rowIndex) => (
                <tr key={rowIndex} className="bg-white">
                  {fila.map((celda, colIndex) => (
                    <td
                      key={`${rowIndex}-${colIndex}`}
                      className={`px-4 py-3 text-[#66535A] print:px-2 print:py-1 ${rightColumns.includes(colIndex)
                        ? 'text-right font-bold'
                        : ''
                        }`}
                    >
                      {celda}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TotalRow({ label, value, strong = false, danger = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${strong ? 'font-black' : 'font-semibold'} text-[#66535A]`}>
        {label}
      </span>

      <strong
        className={`${strong ? 'text-xl' : 'text-base'} ${danger ? 'text-red-700' : 'text-slate-900'
          }`}
      >
        {value}
      </strong>
    </div>
  );
}

function CalculadoraEfectivo({
  conteoEfectivo,
  totalConteoEfectivo,
  formatoMoneda,
  onChange,
  onClear,
  onApply,
  titulo = 'Calculadora de efectivo',
  descripcion = 'Captura cuántos billetes y monedas tienes para calcular el monto contado.',
  labelTotal = 'Total contado',
  textoBotonAplicar = 'Usar total contado',
}) {
  return (
    <div className="rounded-[1.6rem] border border-[#F0E2E7] bg-[#FFFAFB] p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-bold text-[#43353A] flex items-center gap-2">
            <Calculator size={19} className="shrink-0" />
            {titulo}
          </h3>
          <p className="text-sm text-[#8C777F] leading-relaxed">
            {descripcion}
          </p>
        </div>

        <div className="sm:text-right rounded-2xl bg-white px-4 py-3 border border-[#F0E4E8]">
          <p className="text-xs text-[#8C777F]">{labelTotal}</p>
          <p className="text-2xl font-black text-[#B85F7D]">
            {formatoMoneda(totalConteoEfectivo)}
          </p>
        </div>
      </div>

      <div className="md:hidden space-y-2">
        {denominacionesCaja.map((denominacion) => {
          const cantidad = Number(conteoEfectivo[denominacion.valor] || 0);
          const importe = cantidad * Number(denominacion.valor);

          return (
            <div
              key={`${denominacion.tipo}-mobile-${denominacion.valor}`}
              className="rounded-2xl bg-white border border-[#F0E4E8] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-[#8C777F]">
                    {denominacion.tipo}
                  </p>
                  <p className="font-bold text-[#43353A]">
                    {formatoMoneda(denominacion.valor)}
                  </p>
                </div>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={conteoEfectivo[denominacion.valor] || ''}
                  onChange={(e) => onChange(denominacion.valor, e.target.value)}
                  className="w-24 rounded-xl border border-[#EEDFE4] bg-white px-3 py-2 text-center font-bold text-[#5D4A51] outline-none transition focus:border-[#D58AA2] focus:ring-4 focus:ring-[#FBEAF0]"
                  placeholder="0"
                />
              </div>

              <div className="mt-2 flex justify-between gap-3 text-sm">
                <span className="text-[#8C777F]">Importe</span>
                <span className="font-bold text-[#66535A]">
                  {formatoMoneda(importe)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-[#EEDFE4]">
              <th className="py-2 text-left text-xs font-bold text-[#8C777F] uppercase">
                Tipo
              </th>
              <th className="py-2 text-right text-xs font-bold text-[#8C777F] uppercase">
                Denominación
              </th>
              <th className="py-2 text-center text-xs font-bold text-[#8C777F] uppercase">
                Cantidad
              </th>
              <th className="py-2 text-right text-xs font-bold text-[#8C777F] uppercase">
                Importe
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#EFE2E6]">
            {denominacionesCaja.map((denominacion) => {
              const cantidad = Number(conteoEfectivo[denominacion.valor] || 0);
              const importe = cantidad * Number(denominacion.valor);

              return (
                <tr key={`${denominacion.tipo}-${denominacion.valor}`}>
                  <td className="py-2 text-sm font-semibold text-[#66535A]">
                    {denominacion.tipo}
                  </td>

                  <td className="py-2 text-right text-sm font-bold text-[#43353A]">
                    {formatoMoneda(denominacion.valor)}
                  </td>

                  <td className="py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={conteoEfectivo[denominacion.valor] || ''}
                      onChange={(e) => onChange(denominacion.valor, e.target.value)}
                      className="w-24 rounded-xl border border-[#EEDFE4] bg-white px-3 py-2 text-center font-bold text-[#5D4A51] outline-none transition focus:border-[#D58AA2] focus:ring-4 focus:ring-[#FBEAF0]"
                      placeholder="0"
                    />
                  </td>

                  <td className="py-2 text-right text-sm font-bold text-[#66535A]">
                    {formatoMoneda(importe)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-3 rounded-2xl bg-white hover:bg-[#F8EDF1] text-[#66535A] font-bold border border-[#EEDFE4] transition"
        >
          Limpiar conteo
        </button>

        <button
          type="button"
          onClick={onApply}
          className="rounded-2xl bg-[#B85F7D] px-4 py-3 font-black text-white transition hover:bg-[#A95270]"
        >
          {textoBotonAplicar}
        </button>
      </div>
    </div>
  );
}

export default function Caja() {
  const { usuario } = useAuth();

  const puedeCambiarSucursal = esSuperAdmin(usuario);

  const puedeCambiarCaja = esSuperAdmin(usuario);

  const [sucursales, setSucursales] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);

  const [idSucursal, setIdSucursal] = useState('');
  const [idCaja, setIdCaja] = useState('');

  const [sesionAbierta, setSesionAbierta] = useState(null);
  const [resumenCaja, setResumenCaja] = useState(null);

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbrir, setModalAbrir] = useState(false);
  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [modalMovimientos, setModalMovimientos] = useState(false);
  const [modalReporteCierre, setModalReporteCierre] = useState(false);

  const [montoInicial, setMontoInicial] = useState('');
  const [montoFinalReal, setMontoFinalReal] = useState('');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [conteoEfectivoApertura, setConteoEfectivoApertura] = useState({});
  const [conteoEfectivoCierre, setConteoEfectivoCierre] = useState({});
  const [formMovimiento, setFormMovimiento] = useState(movimientoInicial);

  const [reporteCierre, setReporteCierre] = useState(null);
  const [cargandoReporteCierre, setCargandoReporteCierre] = useState(false);

  const [cerrandoCaja, setCerrandoCaja] = useState(false);

  const formatoMoneda = (valor) => {
    return Number(valor || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  };

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    const fechaObj = new Date(fecha);

    if (Number.isNaN(fechaObj.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(fechaObj);
  };

  const sucursalActual = useMemo(() => {
    return sucursales.find((s) => Number(s.id_sucursal) === Number(idSucursal));
  }, [sucursales, idSucursal]);

  const cajaActual = useMemo(() => {
    return cajas.find((c) => Number(c.id_caja) === Number(idCaja));
  }, [cajas, idCaja]);

  const estadoAbierta = Boolean(sesionAbierta);
  const resumen = resumenCaja?.resumen;

  const ventasEfectivo = Number(resumen?.ventas_efectivo || 0);
  const ventasTarjeta = Number(resumen?.ventas_tarjeta || 0);
  const ventasTransferencia = Number(resumen?.ventas_transferencia || 0);
  const ventasPuntos = Number(resumen?.ventas_puntos || resumen?.ventas_puntos_canjeados || 0);
  const totalNoEfectivo = ventasTarjeta + ventasTransferencia;
  const totalVendido =
    resumen?.ventas_total !== undefined && resumen?.ventas_total !== null
      ? Number(resumen.ventas_total || 0)
      : ventasEfectivo + totalNoEfectivo + ventasPuntos;
  const movimientosCajaVista = useMemo(
    () => agruparMovimientosCaja(movimientos),
    [movimientos]
  );

  const diferenciaActual =
    montoFinalReal === ''
      ? 0
      : Number(montoFinalReal || 0) - Number(resumen?.monto_final_sistema || 0);

  const totalConteoEfectivoApertura = useMemo(() => {
    return calcularTotalConteoEfectivo(conteoEfectivoApertura);
  }, [conteoEfectivoApertura]);

  const totalConteoEfectivoCierre = useMemo(() => {
    return calcularTotalConteoEfectivo(conteoEfectivoCierre);
  }, [conteoEfectivoCierre]);

  const cargarSucursales = async () => {
    try {
      const { data } = await api.get('/sucursales');

      if (data.ok) {
        const activas = (data.sucursales || []).filter((s) => s.activo);
        const sucursalesPermitidas = filtrarSucursalesPorRol(usuario, activas);

        setSucursales(sucursalesPermitidas);

        if (!idSucursal) {
          setIdSucursal(obtenerSucursalInicial(usuario, sucursalesPermitidas));
        }
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las sucursales.',
      });
    }
  };

  const cargarCajas = async () => {
    if (!idSucursal) return;

    try {
      setCargando(true);

      const { data } = await api.get(
        `/caja/cajas?sucursal=${idSucursal}`
      );

      if (data.ok) {
        const cajasActivas = (data.cajas || []).filter((c) => c.activo);

        setCajas(cajasActivas);

        if (puedeCambiarCaja) {
          setIdCaja((cajaAnterior) => {
            const cajaSigueDisponible = cajasActivas.some(
              (caja) =>
                Number(caja.id_caja) === Number(cajaAnterior)
            );

            return cajaSigueDisponible
              ? cajaAnterior
              : String(cajasActivas[0]?.id_caja || '');
          });

          return;
        }

        // Para cajeros: el backend solo devolverá su caja asignada.
        setIdCaja(String(cajasActivas[0]?.id_caja || ''));
      }
    } catch (error) {
      console.error(error);

      setCajas([]);
      setIdCaja('');

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las cajas.',
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarSesionAbierta = async () => {
    if (!idCaja) {
      setSesionAbierta(null);
      setResumenCaja(null);
      setMovimientos([]);
      return;
    }

    try {
      setCargando(true);

      const { data } = await api.get(`/caja/sesion-abierta?id_caja=${idCaja}`);

      if (data.ok) {
        setSesionAbierta(data.sesion_abierta);

        if (data.sesion_abierta?.id_sesion) {
          await cargarResumen(data.sesion_abierta.id_sesion);
          await cargarMovimientos(data.sesion_abierta.id_sesion, false);
        } else {
          setResumenCaja(null);
          setMovimientos([]);
        }
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo consultar la sesión de caja.',
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarResumen = async (idSesion = sesionAbierta?.id_sesion) => {
    if (!idSesion) return;

    try {
      const { data } = await api.get(`/caja/resumen?id_sesion=${idSesion}`);

      if (data.ok) {
        setResumenCaja(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const cargarMovimientos = async (
    idSesion = sesionAbierta?.id_sesion,
    mostrarError = true
  ) => {
    if (!idSesion) return;

    try {
      const { data } = await api.get(`/caja/movimientos?id_sesion=${idSesion}`);

      if (data.ok) {
        setMovimientos(data.movimientos || []);
      }
    } catch (error) {
      console.error(error);

      if (mostrarError) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar los movimientos.',
        });
      }
    }
  };

  const cargarReporteCierre = async (idSesion) => {
    if (!idSesion) return null;

    try {
      setCargandoReporteCierre(true);

      const { data } = await api.get(`/caja/reporte-cierre?id_sesion=${idSesion}`);

      if (data.ok) {
        setReporteCierre(data);
        return data;
      }

      return null;
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Reporte no disponible',
        text:
          error.response?.data?.mensaje ||
          'La caja se cerró, pero no se pudo generar el reporte.',
      });

      return null;
    } finally {
      setCargandoReporteCierre(false);
    }
  };

  const imprimirReporteCierre = async () => {
    try {
      const idReporte = reporteCierre?.reporte_pdf?.id_reporte;

      if (!idReporte) {
        Swal.fire({
          icon: 'warning',
          title: 'PDF no disponible',
          text: 'El reporte aún no tiene un PDF guardado para imprimir.',
        });
        return;
      }

      setCargandoReporteCierre(true);

      const response = await api.get(
        `/caja/reportes-cierre/${idReporte}/descargar`,
        {
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: 'application/pdf',
      });

      const url = window.URL.createObjectURL(blob);
      const ventana = window.open(url, '_blank');

      if (!ventana) {
        window.URL.revokeObjectURL(url);

        Swal.fire({
          icon: 'warning',
          title: 'Ventana bloqueada',
          text: 'Permite ventanas emergentes para poder abrir el PDF.',
        });

        return;
      }

      setTimeout(() => {
        ventana.focus();
        ventana.print();
      }, 800);

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo abrir el PDF para imprimir.',
      });
    } finally {
      setCargandoReporteCierre(false);
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarSucursales();
    }
  }, [usuario]);

  useEffect(() => {
    if (idSucursal) {
      setSesionAbierta(null);
      setResumenCaja(null);
      setMovimientos([]);
      cargarCajas();
    }
  }, [idSucursal]);

  useEffect(() => {
    if (idCaja) {
      cargarSesionAbierta();
    }
  }, [idCaja]);

  const abrirModalAbrir = () => {
    setConteoEfectivoApertura({});
    setMontoInicial('');
    setModalAbrir(true);
  };

  const abrirCaja = async (e) => {
    e.preventDefault();

    if (!idSucursal || !idCaja) {
      Swal.fire({
        icon: 'warning',
        title: 'Datos incompletos',
        text: 'Selecciona una sucursal y una caja.',
      });
      return;
    }

    if (montoInicial === '' || Number(montoInicial) < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto inválido',
        text: 'El monto inicial no puede ser negativo.',
      });
      return;
    }

    try {
      setGuardando(true);

      const { data } = await api.post('/caja/abrir', {
        id_caja: Number(idCaja),
        id_sucursal: Number(idSucursal),
        monto_inicial: Number(montoInicial || 0),
      });

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Caja abierta',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        setModalAbrir(false);
        setMontoInicial('');
        setConteoEfectivoApertura({});
        await cargarSesionAbierta();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.mensaje || 'No se pudo abrir la caja.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const registrarMovimiento = async (e) => {
    e.preventDefault();

    if (!sesionAbierta) {
      Swal.fire({
        icon: 'warning',
        title: 'Caja cerrada',
        text: 'Primero debes abrir una caja.',
      });
      return;
    }

    if (!formMovimiento.concepto.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Concepto obligatorio',
        text: 'Ingresa el concepto del movimiento.',
      });
      return;
    }

    if (formMovimiento.monto === '' || Number(formMovimiento.monto) <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto inválido',
        text: 'El monto debe ser mayor a cero.',
      });
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        id_sesion: Number(sesionAbierta.id_sesion),
        id_sucursal: Number(idSucursal),
        tipo_movimiento: formMovimiento.tipo_movimiento,
        concepto: formMovimiento.concepto,
        monto: Number(formMovimiento.monto),
        metodo_pago: formMovimiento.metodo_pago,
        referencia: formMovimiento.referencia || null,
        observaciones: formMovimiento.observaciones || null,
      };

      const { data } = await api.post('/caja/movimiento', payload);

      if (data.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Movimiento registrado',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        setModalMovimiento(false);
        setFormMovimiento(movimientoInicial);
        await cargarResumen();
        await cargarMovimientos();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo registrar el movimiento.',
      });
    } finally {
      setGuardando(false);
    }
  };

  const cerrarCaja = async (e) => {
    e.preventDefault();

    if (!sesionAbierta) {
      Swal.fire({
        icon: 'warning',
        title: 'No hay caja abierta',
        text: 'No existe una sesión abierta para cerrar.',
      });
      return;
    }

    if (montoFinalReal === '' || Number(montoFinalReal) < 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Monto inválido',
        text: 'Captura el monto final contado con la calculadora de efectivo.',
      });
      return;
    }

    const idSesionCierre = Number(sesionAbierta.id_sesion);
    const montoSistema = Number(resumenCaja?.resumen?.monto_final_sistema || 0);
    const diferencia = Number(montoFinalReal) - montoSistema;

    const confirmacion = await Swal.fire({
      icon: diferencia === 0 ? 'question' : 'warning',
      title: '¿Cerrar caja?',
      html: `
      <div style="text-align:left">
        <p><b>Monto sistema:</b> ${formatoMoneda(montoSistema)}</p>
        <p><b>Monto contado:</b> ${formatoMoneda(montoFinalReal)}</p>
        <p><b>Diferencia:</b> ${formatoMoneda(diferencia)}</p>
        <hr style="margin:12px 0" />
        <p style="font-size:13px;color:#64748b">
          Al confirmar, se cerrará la caja y se generará el PDF del reporte.
        </p>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: 'Sí, cerrar caja',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#059669',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      setGuardando(true);
      setCerrandoCaja(true);

      Swal.fire({
        title: 'Cerrando caja...',
        html: `
        <div style="text-align:center">
          <p>Guardando el cierre y generando el reporte PDF.</p>
          <p style="font-size:13px;color:#64748b;margin-top:8px">
            Esto puede tardar unos segundos.
          </p>
        </div>
      `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const { data } = await api.post('/caja/cerrar', {
        id_sesion: idSesionCierre,
        monto_final_real: Number(montoFinalReal),
        observaciones: observacionesCierre || null,
      });

      if (data.ok) {
        const reporte = await cargarReporteCierre(idSesionCierre);

        setModalCerrar(false);
        setMontoFinalReal('');
        setObservacionesCierre('');
        setConteoEfectivoCierre({});
        setSesionAbierta(null);
        setResumenCaja(null);
        setMovimientos([]);

        if (reporte) {
          setModalReporteCierre(true);
        }

        await cargarSesionAbierta();

        Swal.fire({
          icon: data.reporte_pdf ? 'success' : 'warning',
          title: data.reporte_pdf ? 'Caja cerrada' : 'Caja cerrada con advertencia',
          text:
            data.advertencia_pdf ||
            data.mensaje ||
            'La caja fue cerrada correctamente.',
          timer: 1600,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.mensaje || 'No se pudo cerrar la caja.',
      });
    } finally {
      setGuardando(false);
      setCerrandoCaja(false);
    }
  };

  const abrirModalMovimiento = (tipo = 'ENTRADA') => {
    if (!sesionAbierta) {
      Swal.fire({
        icon: 'warning',
        title: 'Caja cerrada',
        text: 'Primero debes abrir una caja.',
      });
      return;
    }

    setFormMovimiento({
      ...movimientoInicial,
      tipo_movimiento: tipo,
    });

    setModalMovimiento(true);
  };

  const abrirModalCerrar = async () => {
    if (!sesionAbierta) {
      Swal.fire({
        icon: 'warning',
        title: 'No hay caja abierta',
        text: 'Primero debes abrir una caja.',
      });
      return;
    }

    await cargarResumen();

    setConteoEfectivoCierre({});
    setMontoFinalReal('');
    setObservacionesCierre('');
    setModalCerrar(true);
  };

  const abrirModalMovimientos = async () => {
    if (!sesionAbierta) {
      Swal.fire({
        icon: 'warning',
        title: 'No hay caja abierta',
        text: 'Primero debes abrir una caja.',
      });
      return;
    }

    await cargarMovimientos();
    setModalMovimientos(true);
  };

  const normalizarCantidadConteo = (cantidad) => {
    return Math.max(Number(cantidad || 0), 0);
  };

  const cambiarConteoEfectivoApertura = (valor, cantidad) => {
    const cantidadLimpia = normalizarCantidadConteo(cantidad);

    setConteoEfectivoApertura((prev) => ({
      ...prev,
      [valor]: cantidadLimpia,
    }));
  };

  const cambiarConteoEfectivoCierre = (valor, cantidad) => {
    const cantidadLimpia = normalizarCantidadConteo(cantidad);

    setConteoEfectivoCierre((prev) => ({
      ...prev,
      [valor]: cantidadLimpia,
    }));
  };

  const aplicarConteoEfectivoApertura = () => {
    setMontoInicial(totalConteoEfectivoApertura.toFixed(2));
  };

  const aplicarConteoEfectivoCierre = () => {
    setMontoFinalReal(totalConteoEfectivoCierre.toFixed(2));
  };

  const limpiarConteoEfectivoApertura = () => {
    setConteoEfectivoApertura({});
    setMontoInicial('');
  };

  const limpiarConteoEfectivoCierre = () => {
    setConteoEfectivoCierre({});
    setMontoFinalReal('');
  };

  const claseMovimiento = (tipo) => {
    if (['ENTRADA', 'VENTA', 'APERTURA'].includes(tipo)) {
      return 'bg-[#FBEAF0] text-[#A84E6C]';
    }

    if (
      [
        'SALIDA',
        'GASTO',
        'RETIRO',
        'PAGO_PROVEEDOR',
        'DEVOLUCION',
      ].includes(tipo)
    ) {
      return 'bg-red-100 text-red-700';
    }

    return 'bg-[#F8EDF1] text-[#66535A]';
  };

  return (
    <div className="w-full max-w-full space-y-4 overflow-hidden pb-8 sm:space-y-5">
      {/* ENCABEZADO SIMPLE */}
      <section className="rounded-[1.75rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_12px_36px_rgba(118,76,91,0.05)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0F4] text-[#B85F7D]">
              <Wallet size={21} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#342A2E] sm:text-2xl">
                  Caja
                </h1>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                    estadoAbierta
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-[#F8EDF1] text-[#8C777F]'
                  }`}
                >
                  {estadoAbierta ? 'ABIERTA' : 'CERRADA'}
                </span>
              </div>

              <p className="mt-1 truncate text-sm font-semibold text-[#8C777F]">
                {sucursalActual?.nombre || 'Sucursal'}
                {cajaActual?.nombre ? ` · ${cajaActual.nombre}` : ''}
              </p>
            </div>
          </div>

          {!estadoAbierta ? (
            <button
              type="button"
              onClick={abrirModalAbrir}
              disabled={!idCaja}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(184,95,125,0.18)] transition hover:bg-[#A95270] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <UnlockKeyhole size={18} />
              Abrir caja
            </button>
          ) : (
            <button
              type="button"
              onClick={abrirModalCerrar}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 sm:w-auto"
            >
              <LockKeyhole size={18} />
              Cerrar caja
            </button>
          )}
        </div>

        {/* La selección manual solo aparece para perfiles con permiso. */}
        {(puedeCambiarSucursal || puedeCambiarCaja) && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#F4EAED] pt-4 sm:grid-cols-2">
            {puedeCambiarSucursal && (
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[#9B858D]">
                  Sucursal
                </label>
                <select
                  value={idSucursal}
                  onChange={(e) => {
                    setIdSucursal(e.target.value);
                    setIdCaja('');
                  }}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                >
                  <option value="">Selecciona sucursal</option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id_sucursal} value={sucursal.id_sucursal}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {puedeCambiarCaja && (
              <div className="min-w-0">
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[#9B858D]">
                  Caja
                </label>
                <select
                  value={idCaja}
                  onChange={(e) => setIdCaja(e.target.value)}
                  disabled={cajas.length === 0}
                  className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0] disabled:opacity-60"
                >
                  <option value="">
                    {cajas.length === 0 ? 'No hay cajas disponibles' : 'Selecciona caja'}
                  </option>
                  {cajas.map((caja) => (
                    <option key={caja.id_caja} value={caja.id_caja}>
                      {caja.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </section>

      {/* RESUMEN: SOLO LOS DATOS QUE MÁS SE CONSULTAN */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-[1.5rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_10px_30px_rgba(118,76,91,0.04)] sm:p-5">
          <p className="text-xs font-bold text-[#8C777F]">Total vendido</p>
          <p className="mt-1 break-words text-xl font-black text-[#342A2E] sm:text-2xl">
            {formatoMoneda(totalVendido)}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[#F0D4DE] bg-[#FFF5F7] p-4 shadow-[0_10px_30px_rgba(118,76,91,0.04)] sm:p-5">
          <p className="text-xs font-bold text-[#8C777F]">Efectivo esperado</p>
          <p className="mt-1 break-words text-xl font-black text-[#B85F7D] sm:text-2xl">
            {formatoMoneda(resumen?.monto_final_sistema)}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_10px_30px_rgba(118,76,91,0.04)] sm:p-5">
          <p className="text-xs font-bold text-[#8C777F]">Ventas en efectivo</p>
          <p className="mt-1 break-words text-xl font-black text-[#A84E6C] sm:text-2xl">
            {formatoMoneda(ventasEfectivo)}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[#E9D7E0] bg-white p-4 shadow-[0_10px_30px_rgba(118,76,91,0.04)] sm:p-5">
          <p className="text-xs font-bold text-[#8C777F]">Otros pagos</p>
          <p className="mt-1 break-words text-xl font-black text-[#765D8D] sm:text-2xl">
            {formatoMoneda(totalNoEfectivo + ventasPuntos)}
          </p>
          <p className="mt-1 text-[10px] font-semibold text-[#AA939B]">
            Tarjeta, transferencia y puntos
          </p>
        </div>
      </section>

      {/* DETALLE COMPACTO */}
      <section className="rounded-[1.75rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_10px_30px_rgba(118,76,91,0.04)] sm:p-5">
        <h2 className="text-base font-black text-[#43353A]">Resumen de caja</h2>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-bold text-[#9B858D]">Monto inicial</p>
            <p className="mt-1 text-sm font-black text-[#43353A]">
              {formatoMoneda(sesionAbierta?.monto_inicial)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-[#9B858D]">Entradas</p>
            <p className="mt-1 text-sm font-black text-[#43353A]">
              {formatoMoneda(resumen?.entradas_efectivo)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-[#9B858D]">Salidas / gastos</p>
            <p className="mt-1 text-sm font-black text-red-700">
              {formatoMoneda(
                Number(resumen?.salidas_efectivo || 0) +
                  Number(resumen?.gastos_efectivo || 0) +
                  Number(resumen?.retiros_efectivo || 0) +
                  Number(resumen?.pagos_proveedor_efectivo || 0)
              )}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold text-[#9B858D]">Con puntos</p>
            <p className="mt-1 text-sm font-black text-amber-700">
              {formatoMoneda(ventasPuntos)}
            </p>
          </div>
        </div>
      </section>

      {/* MOVIMIENTOS: DOS ACCIONES PRINCIPALES */}
      <section className="rounded-[1.75rem] border border-[#F0E2E7] bg-white p-4 shadow-[0_10px_30px_rgba(118,76,91,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-[#43353A]">Movimientos de caja</h2>
            <p className="mt-0.5 text-xs font-semibold text-[#8C777F]">
              Registra solamente cuando entre o salga dinero fuera de una venta.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => abrirModalMovimiento('ENTRADA')}
              disabled={!estadoAbierta}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FFF0F4] px-4 py-3 text-sm font-black text-[#A84E6C] transition hover:bg-[#FBE4EB] disabled:opacity-40"
            >
              <PlusCircle size={18} />
              Entrada
            </button>

            <button
              type="button"
              onClick={() => abrirModalMovimiento('GASTO')}
              disabled={!estadoAbierta}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-40"
            >
              <MinusCircle size={18} />
              Salida
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {!estadoAbierta ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-5 text-center text-sm font-semibold text-[#8C777F]">
              Abre la caja para comenzar.
            </div>
          ) : movimientosCajaVista.length === 0 ? (
            <div className="rounded-2xl bg-[#FFFAFB] p-5 text-center text-sm font-semibold text-[#8C777F]">
              Aún no hay movimientos.
            </div>
          ) : (
            movimientosCajaVista.slice(0, 5).map((mov) => (
              <div
                key={mov.id_movimiento}
                className="flex items-start justify-between gap-3 rounded-2xl border border-[#F4EAED] bg-[#FFFAFB] p-3 sm:p-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${claseMovimiento(
                        mov.tipo_movimiento
                      )}`}
                    >
                      {mov.tipo_movimiento}
                    </span>
                    <span className="text-[10px] font-semibold text-[#AA939B]">
                      {formatoFecha(mov.fecha_movimiento)}
                    </span>
                  </div>

                  <p className="mt-2 truncate text-sm font-black text-[#43353A]">
                    {mov.concepto}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[#8C777F]">
                    {mov.metodo_pago || '—'}
                  </p>
                </div>

                <p className="shrink-0 text-base font-black text-[#43353A]">
                  {formatoMoneda(mov.monto)}
                </p>
              </div>
            ))
          )}
        </div>

        {estadoAbierta && movimientosCajaVista.length > 5 && (
          <button
            type="button"
            onClick={abrirModalMovimientos}
            className="mt-3 w-full rounded-2xl py-2.5 text-sm font-black text-[#B85F7D] transition hover:bg-[#FFF5F7]"
          >
            Ver todos los movimientos
          </button>
        )}
      </section>

      {cerrandoCaja && (
        <div className="fixed inset-0 z-[9999] bg-[#33272C]/65 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="bg-white rounded-[2rem] shadow-2xl p-7 w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full border-4 border-[#F0D4DE] border-t-[#B85F7D] animate-spin mx-auto" />

            <h2 className="text-xl font-black text-[#43353A] mt-5">
              Cerrando caja
            </h2>

            <p className="text-sm text-[#8C777F] mt-2 leading-relaxed">
              Estamos guardando el cierre y generando el PDF del reporte.
              No cierres esta ventana.
            </p>
          </div>
        </div>
      )}

      {modalAbrir && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm"
            onClick={() => setModalAbrir(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-4xl my-auto overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Abrir caja
                </h2>
                <p className="text-sm text-[#8C777F] break-words">
                  {sucursalActual?.nombre} · {cajaActual?.nombre}
                </p>
              </div>

              <button
                onClick={() => setModalAbrir(false)}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={abrirCaja} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-[#66535A] mb-2">
                      Monto inicial *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={montoInicial}
                      onChange={(e) => setMontoInicial(e.target.value)}
                      className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                      placeholder="Usa la calculadora de efectivo"
                    />
                    <p className="text-xs text-[#8C777F] mt-2">
                      Puedes capturarlo manualmente o usar el total contado de la calculadora.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFF2F5] border border-[#F0D4DE] p-4">
                    <p className="text-sm text-[#8C777F]">Total contado inicial</p>
                    <p className="text-2xl font-bold text-[#A84E6C] mt-1 break-words">
                      {formatoMoneda(totalConteoEfectivoApertura)}
                    </p>
                    <p className="text-xs text-[#8C777F] mt-2">
                      Este monto representa el efectivo con el que comienza la caja.
                    </p>
                  </div>
                </div>

                <CalculadoraEfectivo
                  conteoEfectivo={conteoEfectivoApertura}
                  totalConteoEfectivo={totalConteoEfectivoApertura}
                  formatoMoneda={formatoMoneda}
                  onChange={cambiarConteoEfectivoApertura}
                  onClear={limpiarConteoEfectivoApertura}
                  onApply={aplicarConteoEfectivoApertura}
                  titulo="Calculadora de efectivo inicial"
                  descripcion="Captura cuántos billetes y monedas tienes al iniciar la caja."
                  labelTotal="Total inicial contado"
                  textoBotonAplicar="Usar como monto inicial"
                />


              </div>

              <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-end gap-3 border-t border-[#F0E4E8] bg-white shrink-0">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B85F7D] hover:bg-[#A95270] text-white font-bold transition disabled:opacity-60"
                >
                  <Save size={19} />
                  {guardando ? 'Abriendo...' : 'Abrir caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm"
            onClick={() => setModalMovimiento(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-3xl overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Registrar movimiento
                </h2>
                <p className="text-sm text-[#8C777F] break-words">
                  Sesión #{sesionAbierta?.id_sesion} · {cajaActual?.nombre}
                </p>
              </div>

              <button
                onClick={() => setModalMovimiento(false)}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={registrarMovimiento}>
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formMovimiento.tipo_movimiento}
                    onChange={(e) =>
                      setFormMovimiento({
                        ...formMovimiento,
                        tipo_movimiento: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                  >
                    {tiposMovimiento.map((tipo) => (
                      <option key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Monto *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formMovimiento.monto}
                    onChange={(e) =>
                      setFormMovimiento({
                        ...formMovimiento,
                        monto: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Concepto *
                  </label>
                  <input
                    value={formMovimiento.concepto}
                    onChange={(e) =>
                      setFormMovimiento({
                        ...formMovimiento,
                        concepto: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Ej. Compra de bolsas, retiro parcial, entrada extra..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Método de pago
                  </label>
                  <select
                    value={formMovimiento.metodo_pago}
                    onChange={(e) =>
                      setFormMovimiento({
                        ...formMovimiento,
                        metodo_pago: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Referencia
                  </label>
                  <input
                    value={formMovimiento.referencia}
                    onChange={(e) =>
                      setFormMovimiento({
                        ...formMovimiento,
                        referencia: e.target.value,
                      })
                    }
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Opcional"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows="3"
                    value={formMovimiento.observaciones}
                    onChange={(e) =>
                      setFormMovimiento({
                        ...formMovimiento,
                        observaciones: e.target.value,
                      })
                    }
                    className="w-full resize-none rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Observaciones opcionales"
                  />
                </div>
              </div>

              <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-end gap-3 border-t border-[#F0E4E8]">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#B85F7D] hover:bg-[#A95270] text-white font-bold transition disabled:opacity-60"
                >
                  <Save size={19} />
                  {guardando ? 'Guardando...' : 'Guardar movimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCerrar && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm"
            onClick={() => setModalCerrar(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-4xl my-auto overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Cerrar caja
                </h2>
                <p className="text-sm text-[#8C777F]">
                  Verifica el monto contado físicamente.
                </p>
              </div>

              <button
                onClick={() => setModalCerrar(false)}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={cerrarCaja} className="flex flex-col flex-1 min-h-0">
              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                    <p className="text-sm text-[#8C777F]">Sistema</p>
                    <p className="text-xl font-bold text-[#43353A] break-words">
                      {formatoMoneda(resumen?.monto_final_sistema)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#FFFAFB] p-4 min-w-0">
                    <p className="text-sm text-[#8C777F]">Contado</p>
                    <p className="text-xl font-bold text-[#43353A] break-words">
                      {formatoMoneda(montoFinalReal)}
                    </p>
                  </div>

                  <div
                    className={`rounded-2xl p-4 min-w-0 ${diferenciaActual === 0 ? 'bg-[#FFF2F5]' : 'bg-red-50'
                      }`}
                  >
                    <p className="text-sm text-[#8C777F]">Diferencia</p>
                    <p
                      className={`text-xl font-bold break-words ${diferenciaActual === 0
                        ? 'text-[#A84E6C]'
                        : 'text-red-700'
                        }`}
                    >
                      {formatoMoneda(diferenciaActual)}
                    </p>
                  </div>
                </div>

                {diferenciaActual !== 0 && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3 text-amber-800">
                    <AlertTriangle size={22} className="shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Existe diferencia entre el monto esperado por el sistema y el
                      efectivo contado.
                    </p>
                  </div>
                )}

                <CalculadoraEfectivo
                  conteoEfectivo={conteoEfectivoCierre}
                  totalConteoEfectivo={totalConteoEfectivoCierre}
                  formatoMoneda={formatoMoneda}
                  onChange={cambiarConteoEfectivoCierre}
                  onClear={limpiarConteoEfectivoCierre}
                  onApply={aplicarConteoEfectivoCierre}
                  titulo="Calculadora de efectivo final"
                  descripcion="Captura cuántos billetes y monedas tienes al cerrar la caja."
                  labelTotal="Total final contado"
                  textoBotonAplicar="Usar como monto final"
                />

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Monto final contado *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoFinalReal}
                    onChange={(e) => setMontoFinalReal(e.target.value)}
                    className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Usa la calculadora de efectivo"
                  />
                  <p className="text-xs text-[#8C777F] mt-2">
                    Usa la calculadora de efectivo para llenar este monto con el total contado físicamente.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#66535A] mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows="3"
                    value={observacionesCierre}
                    onChange={(e) => setObservacionesCierre(e.target.value)}
                    className="w-full resize-none rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
                    placeholder="Observaciones del corte"
                  />
                </div>
              </div>

              <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row justify-end gap-3 border-t border-[#F0E4E8] bg-white shrink-0">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold transition disabled:opacity-60"
                >
                  <LockKeyhole size={19} />
                  {guardando ? 'Cerrando...' : 'Cerrar caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMovimientos && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center px-3 sm:px-4 py-4 sm:py-8 overflow-y-auto">
          <div
            className="fixed inset-0 bg-[#33272C]/55 backdrop-blur-sm"
            onClick={() => setModalMovimientos(false)}
          />

          <div className="relative bg-white rounded-2xl sm:rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-5 border-b border-[#F0E4E8] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-[#43353A]">
                  Movimientos de caja
                </h2>
                <p className="text-sm text-[#8C777F]">
                  Sesión #{sesionAbierta?.id_sesion}
                </p>
              </div>

              <button
                onClick={() => setModalMovimientos(false)}
                className="w-10 h-10 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto max-h-[75vh]">
              {movimientos.length === 0 ? (
                <div className="text-center py-10 text-[#8C777F]">
                  No hay movimientos registrados.
                </div>
              ) : (
                <div>
                  <div className="md:hidden space-y-3">
                    {movimientos.map((mov) => (
                      <div
                        key={mov.id_movimiento}
                        className="rounded-2xl border border-[#F0E4E8] bg-white p-4 shadow-[0_12px_40px_rgba(118,76,91,0.05)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span
                              className={`inline-flex text-xs font-bold px-3 py-1 rounded-full ${claseMovimiento(
                                mov.tipo_movimiento
                              )}`}
                            >
                              {mov.tipo_movimiento}
                            </span>

                            <p className="mt-3 font-bold text-[#43353A] break-words">
                              {mov.concepto}
                            </p>

                            <p className="mt-1 text-xs text-[#8C777F]">
                              {formatoFecha(mov.fecha_movimiento)}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-lg font-bold text-[#43353A]">
                              {formatoMoneda(mov.monto)}
                            </p>
                            <p className="text-xs text-[#8C777F]">
                              {mov.metodo_pago}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-3">
                          <div className="rounded-xl bg-[#FFFAFB] p-3">
                            <p className="text-xs text-[#8C777F]">Referencia</p>
                            <p className="text-sm font-semibold text-[#66535A] break-words">
                              {mov.referencia || '—'}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#FFFAFB] p-3">
                            <p className="text-xs text-[#8C777F]">Usuario</p>
                            <p className="text-sm font-semibold text-[#66535A] break-words">
                              {mov.usuario || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
                      <thead className="bg-[#FFFAFB] border-b border-[#F0E4E8]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                            Concepto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                            Método
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-[#8C777F] uppercase">
                            Monto
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                            Referencia
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-[#8C777F] uppercase">
                            Usuario
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#F5EAED]">
                        {movimientos.map((mov) => (
                          <tr key={mov.id_movimiento}>
                            <td className="px-4 py-3 text-sm text-[#766168]">
                              {formatoFecha(mov.fecha_movimiento)}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-bold px-3 py-1 rounded-full ${claseMovimiento(
                                  mov.tipo_movimiento
                                )}`}
                              >
                                {mov.tipo_movimiento}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-semibold text-[#43353A]">
                              {mov.concepto}
                            </td>

                            <td className="px-4 py-3 text-[#766168]">
                              {mov.metodo_pago}
                            </td>

                            <td className="px-4 py-3 text-right font-bold text-[#43353A]">
                              {formatoMoneda(mov.monto)}
                            </td>

                            <td className="px-4 py-3 text-[#766168]">
                              {mov.referencia || '—'}
                            </td>

                            <td className="px-4 py-3 text-[#766168]">
                              {mov.usuario || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      <style>
        {`
          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              transition-duration: 0.01ms !important;
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
            }
          }
        `}
      </style>

      {modalReporteCierre && (
        <div className="print-root fixed inset-0 z-50 bg-[#33272C]/65 backdrop-blur-sm flex items-start justify-center px-3 sm:px-6 py-6 overflow-y-auto print:static print:bg-white print:p-0 print:block">
          <div className="w-full max-w-6xl bg-white rounded-[2rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none">
            <div className="no-print px-6 py-5 border-b border-[#F0E4E8] flex items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#FBEAF0] text-[#A84E6C] flex items-center justify-center">
                  <FileText size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-[#43353A]">
                    Reporte de cierre de caja
                  </h2>
                  <p className="text-sm text-[#8C777F]">
                    Revisa el corte e imprime o guarda el PDF.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalReporteCierre(false)}
                className="w-11 h-11 rounded-2xl bg-[#F8EDF1] hover:bg-[#F2DDE4] flex items-center justify-center"
              >
                <X size={22} />
              </button>
            </div>

            <div className="no-print flex flex-col justify-end gap-3 border-b border-[#F0E4E8] bg-[#FFFAFB] px-6 py-4 sm:flex-row print:hidden">
              <button
                onClick={imprimirReporteCierre}
                disabled={cargandoReporteCierre || !reporteCierre?.reporte_pdf?.id_reporte}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3 font-black text-white transition hover:bg-[#A95270] disabled:opacity-50"
              >
                <Printer size={19} />
                {cargandoReporteCierre ? 'Abriendo PDF...' : 'Imprimir / Guardar PDF'}
              </button>
            </div>


            <div className="bg-[#F8EDF1] p-6 print:bg-white print:p-0">
              <div id="reporte-cierre-caja-print" className="mx-auto max-w-5xl print:max-w-none">
                {reporteCierre ? (
                  <ReporteCierreCajaImprimible reporte={reporteCierre} />
                ) : (
                  <div className="bg-white rounded-[2rem] p-10 text-center text-[#8C777F]">
                    No hay reporte disponible.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
