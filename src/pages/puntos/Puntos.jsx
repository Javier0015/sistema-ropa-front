import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  Award,
  RefreshCw,
  Search,
  Users,
  WalletCards,
  BadgePercent,
  ShoppingBag,
  Save,
  RotateCcw,
  Settings,
  Sparkles,
  Loader2,
  CheckCircle2,
  CircleOff,
  Coins,
} from 'lucide-react';

import api from '../../api/axios';

const esActivo = (valor) => {
  return (
    valor === true ||
    valor === 'true' ||
    valor === 1 ||
    valor === '1'
  );
};

export default function Puntos() {
  const [tab, setTab] = useState('CLIENTES');

  const [clientes, setClientes] = useState([]);
  const [cajeros, setCajeros] = useState([]);

  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  const [configuracion, setConfiguracion] = useState(null);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [porcentajeCliente, setPorcentajeCliente] = useState('');
  const [porcentajeCajero, setPorcentajeCajero] = useState('');

  const [puntosClienteActivo, setPuntosClienteActivo] = useState(true);
  const [puntosCajeroActivo, setPuntosCajeroActivo] = useState(true);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatoNumero = (valor) => {
    return Number(valor || 0).toLocaleString('es-MX', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const formatoFecha = (fecha) => {
    if (!fecha) return 'Sin movimientos';

    return new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  // =========================================================
  // CARGA
  // =========================================================

  const cargarDatos = async () => {
    try {
      setCargando(true);

      const [clientesRes, cajerosRes, configRes] = await Promise.all([
        api.get('/tarjetas-puntos'),
        api.get('/configuracion-puntos/cajeros/resumen'),
        api.get('/configuracion-puntos'),
      ]);

      if (clientesRes.data.ok) {
        setClientes(
          clientesRes.data.tarjetas ||
            clientesRes.data.clientes ||
            []
        );
      } else {
        setClientes([]);
      }

      if (cajerosRes.data.ok) {
        setCajeros(cajerosRes.data.cajeros || []);
      } else {
        setCajeros([]);
      }

      if (configRes.data.ok) {
        const config = configRes.data.configuracion || {};

        setConfiguracion(config);

        setPorcentajeCliente(config.porcentaje_cliente ?? '');
        setPorcentajeCajero(config.porcentaje_cajero ?? '');

        setPuntosClienteActivo(
          config.puntos_cliente_activo === undefined
            ? true
            : esActivo(config.puntos_cliente_activo)
        );

        setPuntosCajeroActivo(
          config.puntos_cajero_activo === undefined
            ? true
            : esActivo(config.puntos_cajero_activo)
        );
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar los puntos.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // =========================================================
  // CONFIGURACIÓN
  // =========================================================

  const guardarConfiguracion = async () => {
    const cliente = Number(porcentajeCliente || 0);
    const cajero = Number(porcentajeCajero || 0);

    if (
      Number.isNaN(cliente) ||
      cliente < 0 ||
      cliente > 100
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Porcentaje inválido',
        text:
          'El porcentaje de clientes debe estar entre 0 y 100.',
        confirmButtonColor: '#AD526F',
      });

      return;
    }

    if (
      Number.isNaN(cajero) ||
      cajero < 0 ||
      cajero > 100
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Porcentaje inválido',
        text:
          'El porcentaje de cajeros debe estar entre 0 y 100.',
        confirmButtonColor: '#AD526F',
      });

      return;
    }

    try {
      setGuardandoConfig(true);

      const { data } = await api.put('/configuracion-puntos', {
        porcentaje_cliente: cliente,
        porcentaje_cajero: cajero,
        puntos_cliente_activo: puntosClienteActivo,
        puntos_cajero_activo: puntosCajeroActivo,
      });

      if (data.ok) {
        setConfiguracion(
          data.configuracion || configuracion
        );

        await Swal.fire({
          icon: 'success',
          title: 'Configuración guardada',
          text:
            'Las reglas de puntos fueron actualizadas correctamente.',
          timer: 1500,
          showConfirmButton: false,
        });

        await cargarDatos();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar la configuración.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setGuardandoConfig(false);
    }
  };

  // =========================================================
  // CANJE DE PUNTOS DE CAJERO
  // =========================================================

  const canjearPuntosCajero = async (cajero) => {
    const saldo = Number(cajero.saldo_puntos || 0);

    if (saldo <= 0) {
      Swal.fire({
        icon: 'info',
        title: 'Sin puntos',
        text:
          'Este cajero no tiene puntos disponibles para canjear.',
        confirmButtonColor: '#AD526F',
      });

      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'question',
      title: '¿Canjear puntos del cajero?',
      html: `
        <div style="text-align:left">
          <p><b>Cajero:</b> ${
            cajero.nombre ||
            cajero.usuario ||
            'Sin nombre'
          }</p>
          <p><b>Puntos actuales:</b> ${formatoNumero(
            saldo
          )}</p>
          <p>Se registrará un movimiento de canje y el saldo quedará en 0.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, canjear',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#AD526F',
      cancelButtonColor: '#8B7A80',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.post(
        `/configuracion-puntos/cajeros/${cajero.id_usuario}/canjear`,
        {
          descripcion: `Canje de puntos del cajero ${
            cajero.nombre ||
            cajero.usuario ||
            cajero.id_usuario
          }`,
        }
      );

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Puntos canjeados',
          text: `Se canjearon ${formatoNumero(
            data.puntos_canjeados
          )} puntos.`,
          timer: 1600,
          showConfirmButton: false,
        });

        await cargarDatos();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron canjear los puntos del cajero.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  // =========================================================
  // FILTROS
  // =========================================================

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return clientes;

    return clientes.filter((cliente) => {
      return (
        String(
          cliente.nombre_cliente || ''
        )
          .toLowerCase()
          .includes(texto) ||
        String(
          cliente.codigo_barras || ''
        )
          .toLowerCase()
          .includes(texto) ||
        String(cliente.telefono || '')
          .toLowerCase()
          .includes(texto) ||
        String(cliente.correo || '')
          .toLowerCase()
          .includes(texto)
      );
    });
  }, [clientes, busqueda]);

  const cajerosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) return cajeros;

    return cajeros.filter((cajero) => {
      return (
        String(cajero.nombre || '')
          .toLowerCase()
          .includes(texto) ||
        String(cajero.usuario || '')
          .toLowerCase()
          .includes(texto) ||
        String(cajero.rol || '')
          .toLowerCase()
          .includes(texto)
      );
    });
  }, [cajeros, busqueda]);

  // =========================================================
  // RESÚMENES
  // =========================================================

  const resumenClientes = useMemo(() => {
    return clientes.reduce(
      (acc, item) => {
        acc.totalClientes += 1;

        if (esActivo(item.activo)) {
          acc.clientesActivos += 1;
        }

        acc.puntosActuales += Number(
          item.puntos_actuales || 0
        );

        acc.puntosAcumulados += Number(
          item.puntos_acumulados || 0
        );

        acc.puntosCanjeados += Number(
          item.puntos_canjeados || 0
        );

        return acc;
      },
      {
        totalClientes: 0,
        clientesActivos: 0,
        puntosActuales: 0,
        puntosAcumulados: 0,
        puntosCanjeados: 0,
      }
    );
  }, [clientes]);

  const resumenCajeros = useMemo(() => {
    return cajeros.reduce(
      (acc, item) => {
        acc.totalCajeros += 1;

        if (esActivo(item.activo)) {
          acc.cajerosActivos += 1;
        }

        acc.saldoPuntos += Number(
          item.saldo_puntos || 0
        );

        acc.totalMovimientos += Number(
          item.total_movimientos || 0
        );

        return acc;
      },
      {
        totalCajeros: 0,
        cajerosActivos: 0,
        saldoPuntos: 0,
        totalMovimientos: 0,
      }
    );
  }, [cajeros]);

  const placeholderBusqueda =
    tab === 'CLIENTES'
      ? 'Buscar cliente, tarjeta, teléfono o correo...'
      : 'Buscar cajero, usuario o rol...';

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full max-w-full space-y-5 overflow-hidden pb-8 sm:space-y-6">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 left-[18%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#AD526F]">
              <Award size={24} />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#AD526F]">
                <Sparkles size={13} />
                Programa de lealtad
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Puntos
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D] sm:text-base">
                Consulta saldos de clientes y cajeros,
                movimientos y reglas de acumulación.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cargarDatos}
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60 sm:w-auto"
          >
            {cargando ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={18} />
            )}

            {cargando
              ? 'Actualizando...'
              : 'Actualizar'}
          </button>
        </div>
      </section>

      {/* =====================================================
          CONFIGURACIÓN
      ===================================================== */}

      <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_14px_45px_rgba(118,76,91,0.05)] sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#AD526F]">
              <Settings size={21} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Configuración de puntos
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#8C777F]">
                Define qué porcentaje de cada venta se
                convierte en puntos para clientes y
                cajeros.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={guardarConfiguracion}
            disabled={guardandoConfig}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.22)] transition hover:bg-[#8B3F5B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {guardandoConfig ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Save size={18} />
            )}

            {guardandoConfig
              ? 'Guardando...'
              : 'Guardar configuración'}
          </button>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <ConfiguracionCard
            titulo="Clientes"
            descripcion="Puntos generados para las tarjetas de clientes."
            icono={Users}
            activo={puntosClienteActivo}
            onToggle={() =>
              setPuntosClienteActivo((prev) => !prev)
            }
            valor={porcentajeCliente}
            onChange={setPorcentajeCliente}
            ejemplo={`Con ${formatoNumero(
              porcentajeCliente || 0
            )}%, una venta de $500 genera ${formatoNumero(
              500 *
                (Number(
                  porcentajeCliente || 0
                ) /
                  100)
            )} puntos.`}
          />

          <ConfiguracionCard
            titulo="Cajeros"
            descripcion="Puntos generados al cajero por las ventas realizadas."
            icono={ShoppingBag}
            activo={puntosCajeroActivo}
            onToggle={() =>
              setPuntosCajeroActivo((prev) => !prev)
            }
            valor={porcentajeCajero}
            onChange={setPorcentajeCajero}
            ejemplo={`Con ${formatoNumero(
              porcentajeCajero || 0
            )}%, una venta de $500 genera ${formatoNumero(
              500 *
                (Number(
                  porcentajeCajero || 0
                ) /
                  100)
            )} puntos.`}
            variante="amber"
          />
        </div>

        {configuracion?.fecha_actualizacion && (
          <p className="mt-4 text-xs font-semibold text-[#AA939B]">
            Última actualización:{' '}
            {new Date(
              configuracion.fecha_actualizacion
            ).toLocaleString('es-MX', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </p>
        )}
      </section>

      {/* =====================================================
          TABS Y BÚSQUEDA
      ===================================================== */}

      <section className="rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_12px_40px_rgba(118,76,91,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-fit max-w-full overflow-x-auto rounded-2xl bg-[#F8EDF1] p-1">
            <TabButton
              active={tab === 'CLIENTES'}
              onClick={() => {
                setTab('CLIENTES');
                setBusqueda('');
              }}
            >
              Clientes
            </TabButton>

            <TabButton
              active={tab === 'CAJEROS'}
              onClick={() => {
                setTab('CAJEROS');
                setBusqueda('');
              }}
            >
              Cajeros
            </TabButton>
          </div>

          <div className="relative w-full lg:w-96">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B4A0A7]"
            />

            <input
              value={busqueda}
              onChange={(e) =>
                setBusqueda(e.target.value)
              }
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-11 pr-4 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              placeholder={placeholderBusqueda}
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          KPI POR TAB
      ===================================================== */}

      {tab === 'CLIENTES' ? (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PuntosKpi
            titulo="Clientes"
            valor={formatoNumero(
              resumenClientes.totalClientes
            )}
            detalle={`${formatoNumero(
              resumenClientes.clientesActivos
            )} activos`}
            icono={Users}
            claseIcono="bg-[#FBEAF0] text-[#AD526F]"
          />

          <PuntosKpi
            titulo="Puntos actuales"
            valor={formatoNumero(
              resumenClientes.puntosActuales
            )}
            detalle="Saldo disponible"
            icono={Coins}
            claseIcono="bg-amber-50 text-amber-700"
          />

          <PuntosKpi
            titulo="Acumulados"
            valor={formatoNumero(
              resumenClientes.puntosAcumulados
            )}
            detalle="Histórico generado"
            icono={ShoppingBag}
            claseIcono="bg-emerald-50 text-emerald-700"
          />

          <PuntosKpi
            titulo="Canjeados"
            valor={formatoNumero(
              resumenClientes.puntosCanjeados
            )}
            detalle="Histórico utilizado"
            icono={WalletCards}
            claseIcono="bg-red-50 text-red-700"
          />
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PuntosKpi
            titulo="Cajeros"
            valor={formatoNumero(
              resumenCajeros.totalCajeros
            )}
            detalle={`${formatoNumero(
              resumenCajeros.cajerosActivos
            )} activos`}
            icono={Users}
            claseIcono="bg-[#FBEAF0] text-[#AD526F]"
          />

          <PuntosKpi
            titulo="Saldo de puntos"
            valor={formatoNumero(
              resumenCajeros.saldoPuntos
            )}
            detalle="Disponible para canje"
            icono={Coins}
            claseIcono="bg-amber-50 text-amber-700"
          />

          <PuntosKpi
            titulo="Movimientos"
            valor={formatoNumero(
              resumenCajeros.totalMovimientos
            )}
            detalle="Operaciones registradas"
            icono={ShoppingBag}
            claseIcono="bg-emerald-50 text-emerald-700"
          />

          <PuntosKpi
            titulo="Regla actual"
            valor={
              puntosCajeroActivo
                ? `${formatoNumero(
                    porcentajeCajero || 0
                  )}%`
                : 'Inactiva'
            }
            detalle="Porcentaje por venta"
            icono={BadgePercent}
            claseIcono="bg-[#F0EBF6] text-[#765D8D]"
          />
        </section>
      )}

      {/* =====================================================
          TABLAS
      ===================================================== */}

      {tab === 'CLIENTES' ? (
        <TablaClientes
          cargando={cargando}
          clientes={clientesFiltrados}
          formatoNumero={formatoNumero}
        />
      ) : (
        <TablaCajeros
          cargando={cargando}
          cajeros={cajerosFiltrados}
          formatoNumero={formatoNumero}
          formatoFecha={formatoFecha}
          canjearPuntosCajero={
            canjearPuntosCajero
          }
        />
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
    </div>
  );
}

/* =========================================================
   COMPONENTES
========================================================= */

function ConfiguracionCard({
  titulo,
  descripcion,
  icono: Icono,
  activo,
  onToggle,
  valor,
  onChange,
  ejemplo,
  variante = 'rose',
}) {
  const esAmber = variante === 'amber';

  return (
    <div
      className={`rounded-[1.6rem] border p-5 ${
        esAmber
          ? 'border-amber-100 bg-amber-50/60'
          : 'border-[#F0D4DE] bg-[#FFF5F7]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              esAmber
                ? 'bg-white text-amber-700'
                : 'bg-white text-[#AD526F]'
            }`}
          >
            <Icono size={19} />
          </div>

          <div>
            <p
              className={`font-black ${
                esAmber
                  ? 'text-amber-900'
                  : 'text-[#714151]'
              }`}
            >
              {titulo}
            </p>

            <p
              className={`mt-1 text-xs leading-relaxed ${
                esAmber
                  ? 'text-amber-700'
                  : 'text-[#9A6678]'
              }`}
            >
              {descripcion}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
            activo
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {activo ? (
            <CheckCircle2 size={13} />
          ) : (
            <CircleOff size={13} />
          )}

          {activo ? 'Activo' : 'Inactivo'}
        </button>
      </div>

      <label className="mt-5 block text-sm font-black text-[#5D4A51]">
        Porcentaje sobre la venta
      </label>

      <div className="relative mt-2">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={valor}
          onChange={(e) =>
            onChange(e.target.value)
          }
          className="w-full rounded-2xl border border-[#EEDFE4] bg-white px-4 py-3 pr-10 text-sm font-semibold text-[#4B3C42] outline-none transition focus:border-[#D58AA2] focus:ring-4 focus:ring-[#FBEAF0]"
          placeholder="0.00"
        />

        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-[#8C777F]">
          %
        </span>
      </div>

      <p className="mt-2 text-xs font-semibold leading-relaxed text-[#8C777F]">
        {ejemplo}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-black transition ${
        active
          ? 'bg-white text-[#AD526F] shadow-[0_6px_18px_rgba(118,76,91,0.08)]'
          : 'text-[#8C777F] hover:text-[#43353A]'
      }`}
    >
      {children}
    </button>
  );
}

function PuntosKpi({
  titulo,
  valor,
  detalle,
  icono: Icono,
  claseIcono,
}) {
  return (
    <div className="min-w-0 rounded-[1.6rem] border border-[#F0E4E8] bg-white p-5 shadow-[0_10px_30px_rgba(118,76,91,0.045)]">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${claseIcono}`}
      >
        <Icono size={20} />
      </div>

      <p className="mt-5 text-[10px] font-black uppercase tracking-[0.08em] text-[#967F87]">
        {titulo}
      </p>

      <p className="mt-1 break-words text-3xl font-black tracking-[-0.035em] text-[#3A2F33]">
        {valor}
      </p>

      <p className="mt-2 text-[11px] font-semibold text-[#AA939B]">
        {detalle}
      </p>
    </div>
  );
}

function TablaClientes({
  cargando,
  clientes,
  formatoNumero,
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
            Puntos de clientes
          </h2>

          <p className="mt-1 text-sm text-[#8C777F]">
            Saldos de las tarjetas registradas.
          </p>
        </div>

        <span className="rounded-full bg-[#FBEAF0] px-3 py-1.5 text-xs font-black text-[#A84E6C]">
          {clientes.length} cliente(s)
        </span>
      </div>

      {/* MÓVIL */}
      <div className="space-y-3 p-4 md:hidden">
        {cargando ? (
          <EstadoLista
            cargando
            texto="Cargando puntos..."
          />
        ) : clientes.length === 0 ? (
          <EstadoLista texto="No hay clientes para mostrar." />
        ) : (
          clientes.map((cliente) => (
            <article
              key={cliente.id_tarjeta}
              className="rounded-[1.5rem] border border-[#F0E4E8] bg-[#FFFCFD] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-black text-[#43353A]">
                    {cliente.nombre_cliente ||
                      'Sin nombre'}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#9A858D]">
                    {cliente.telefono ||
                      'Sin teléfono'}
                  </p>
                </div>

                <EstadoBadge
                  activo={esActivo(
                    cliente.activo
                  )}
                />
              </div>

              <div className="mt-4 rounded-xl bg-[#F8EDF1] p-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#9B858D]">
                  Tarjeta
                </p>

                <p className="mt-1 break-all font-mono text-sm font-bold text-[#5D4A51]">
                  {cliente.codigo_barras || '—'}
                </p>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MiniValor
                  titulo="Actuales"
                  valor={formatoNumero(
                    cliente.puntos_actuales
                  )}
                  clase="bg-amber-50 text-amber-800"
                />

                <MiniValor
                  titulo="Acumulados"
                  valor={formatoNumero(
                    cliente.puntos_acumulados
                  )}
                  clase="bg-[#FFF2F5] text-[#A84E6C]"
                />

                <MiniValor
                  titulo="Canjeados"
                  valor={formatoNumero(
                    cliente.puntos_canjeados
                  )}
                  clase="bg-red-50 text-red-700"
                />
              </div>
            </article>
          ))
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[950px]">
          <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
            <tr>
              <Th>Cliente</Th>
              <Th>Tarjeta</Th>
              <Th align="right">Actuales</Th>
              <Th align="right">
                Acumulados
              </Th>
              <Th align="right">
                Canjeados
              </Th>
              <Th align="center">
                Estado
              </Th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F5EAED]">
            {cargando ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-5 py-12 text-center"
                >
                  <LoadingRow />
                </td>
              </tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td
                  colSpan="6"
                  className="px-5 py-12 text-center font-semibold text-[#8A757D]"
                >
                  No hay clientes para mostrar.
                </td>
              </tr>
            ) : (
              clientes.map((cliente) => (
                <tr
                  key={cliente.id_tarjeta}
                  className="transition hover:bg-[#FFFAFB]"
                >
                  <td className="px-5 py-4">
                    <p className="font-black text-[#43353A]">
                      {cliente.nombre_cliente ||
                        'Sin nombre'}
                    </p>

                    <p className="mt-1 text-xs text-[#9A858D]">
                      {cliente.telefono ||
                        'Sin teléfono'}
                    </p>
                  </td>

                  <td className="px-5 py-4 font-mono text-sm font-semibold text-[#66535A]">
                    {cliente.codigo_barras ||
                      '—'}
                  </td>

                  <td className="px-5 py-4 text-right font-black text-amber-700">
                    {formatoNumero(
                      cliente.puntos_actuales
                    )}
                  </td>

                  <td className="px-5 py-4 text-right font-black text-[#A84E6C]">
                    {formatoNumero(
                      cliente.puntos_acumulados
                    )}
                  </td>

                  <td className="px-5 py-4 text-right font-black text-red-700">
                    {formatoNumero(
                      cliente.puntos_canjeados
                    )}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <EstadoBadge
                      activo={esActivo(
                        cliente.activo
                      )}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TablaCajeros({
  cargando,
  cajeros,
  formatoNumero,
  formatoFecha,
  canjearPuntosCajero,
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
      <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
            Puntos de cajeros
          </h2>

          <p className="mt-1 text-sm text-[#8C777F]">
            Puntos generados por ventas realizadas.
          </p>
        </div>

        <span className="rounded-full bg-[#FBEAF0] px-3 py-1.5 text-xs font-black text-[#A84E6C]">
          {cajeros.length} cajero(s)
        </span>
      </div>

      {/* MÓVIL */}
      <div className="space-y-3 p-4 lg:hidden">
        {cargando ? (
          <EstadoLista
            cargando
            texto="Cargando puntos..."
          />
        ) : cajeros.length === 0 ? (
          <EstadoLista texto="No hay cajeros para mostrar." />
        ) : (
          cajeros.map((cajero) => (
            <article
              key={cajero.id_usuario}
              className="rounded-[1.5rem] border border-[#F0E4E8] bg-[#FFFCFD] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-black text-[#43353A]">
                    {cajero.nombre ||
                      'Sin nombre'}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-[#9A858D]">
                    {cajero.usuario || '—'} ·{' '}
                    {cajero.rol || '—'}
                  </p>
                </div>

                <EstadoBadge
                  activo={esActivo(
                    cajero.activo
                  )}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniValor
                  titulo="Puntos"
                  valor={formatoNumero(
                    cajero.saldo_puntos
                  )}
                  clase="bg-amber-50 text-amber-800"
                />

                <MiniValor
                  titulo="Movimientos"
                  valor={formatoNumero(
                    cajero.total_movimientos
                  )}
                  clase="bg-[#FFF2F5] text-[#A84E6C]"
                />
              </div>

              <p className="mt-3 text-xs font-semibold text-[#9A858D]">
                Último movimiento:{' '}
                {formatoFecha(
                  cajero.ultimo_movimiento
                )}
              </p>

              <button
                type="button"
                onClick={() =>
                  canjearPuntosCajero(cajero)
                }
                disabled={
                  Number(
                    cajero.saldo_puntos || 0
                  ) <= 0
                }
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-3 font-black text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <RotateCcw size={16} />
                Canjear puntos
              </button>
            </article>
          ))
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1050px]">
          <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
            <tr>
              <Th>Cajero</Th>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th align="right">Puntos</Th>
              <Th align="right">
                Movimientos
              </Th>
              <Th align="center">
                Estado
              </Th>
              <Th align="center">
                Acción
              </Th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F5EAED]">
            {cargando ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-5 py-12 text-center"
                >
                  <LoadingRow />
                </td>
              </tr>
            ) : cajeros.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="px-5 py-12 text-center font-semibold text-[#8A757D]"
                >
                  No hay cajeros para mostrar.
                </td>
              </tr>
            ) : (
              cajeros.map((cajero) => (
                <tr
                  key={cajero.id_usuario}
                  className="transition hover:bg-[#FFFAFB]"
                >
                  <td className="px-5 py-4">
                    <p className="font-black text-[#43353A]">
                      {cajero.nombre ||
                        'Sin nombre'}
                    </p>

                    <p className="mt-1 text-xs text-[#9A858D]">
                      Último movimiento:{' '}
                      {formatoFecha(
                        cajero.ultimo_movimiento
                      )}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-[#66535A]">
                    {cajero.usuario || '—'}
                  </td>

                  <td className="px-5 py-4 text-sm font-black text-[#66535A]">
                    {cajero.rol || '—'}
                  </td>

                  <td className="px-5 py-4 text-right font-black text-amber-700">
                    {formatoNumero(
                      cajero.saldo_puntos
                    )}
                  </td>

                  <td className="px-5 py-4 text-right font-black text-[#A84E6C]">
                    {formatoNumero(
                      cajero.total_movimientos
                    )}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <EstadoBadge
                      activo={esActivo(
                        cajero.activo
                      )}
                    />
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        canjearPuntosCajero(
                          cajero
                        )
                      }
                      disabled={
                        Number(
                          cajero.saldo_puntos ||
                            0
                        ) <= 0
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-800 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <RotateCcw size={16} />
                      Canjear
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EstadoBadge({
  activo,
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
        activo
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function MiniValor({
  titulo,
  valor,
  clase,
}) {
  return (
    <div
      className={`rounded-xl p-3 ${clase}`}
    >
      <p className="text-[10px] font-black uppercase tracking-wide opacity-75">
        {titulo}
      </p>

      <p className="mt-1 break-words text-lg font-black">
        {valor}
      </p>
    </div>
  );
}

function EstadoLista({
  texto,
  cargando = false,
}) {
  return (
    <div className="rounded-[1.4rem] border border-[#F0E4E8] bg-[#FFFCFD] p-6 text-center font-semibold text-[#8A757D]">
      <div className="flex items-center justify-center gap-2">
        {cargando && (
          <Loader2
            size={18}
            className="animate-spin text-[#AD526F]"
          />
        )}

        {texto}
      </div>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-2 font-semibold text-[#8A757D]">
      <Loader2
        size={18}
        className="animate-spin text-[#AD526F]"
      />
      Cargando puntos...
    </div>
  );
}

function Th({
  children,
  align = 'left',
}) {
  const alineacion =
    align === 'center'
      ? 'text-center'
      : align === 'right'
        ? 'text-right'
        : 'text-left';

  return (
    <th
      className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#9B858D] ${alineacion}`}
    >
      {children}
    </th>
  );
}
