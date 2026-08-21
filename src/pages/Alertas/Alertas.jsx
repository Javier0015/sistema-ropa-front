import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  Bell,
  Send,
  Trash2,
  AlertTriangle,
  Info,
  Megaphone,
  Store,
  Users,
  ShieldAlert,
  RefreshCw,
  Sparkles,
  Loader2,
  CheckCircle2,
  CircleOff,
  MapPin,
  UserRound,
} from 'lucide-react';

import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

import {
  esSuperAdmin,
  filtrarSucursalesPorRol,
} from '../../utils/sucursalPermisos';

const alertaInicial = {
  titulo: '',
  mensaje: '',
  prioridad: 'NORMAL',
  destino_tipo: 'SUCURSAL',
  destino_rol: '',
  id_sucursal: '',
};

const rolesDisponibles = [
  {
    value: 'SUPER_ADMIN',
    label: 'Super administrador',
  },
  {
    value: 'ADMIN_SUCURSAL',
    label: 'Administrador de sucursal',
  },
  {
    value: 'CAJERO',
    label: 'Cajero',
  },
  {
    value: 'VENDEDOR',
    label: 'Vendedor',
  },
  {
    value: 'ALMACEN',
    label: 'Almacén',
  },
  {
    value: 'COMPRAS',
    label: 'Compras',
  },
  {
    value: 'LECTURA',
    label: 'Lectura',
  },
];

const esActivo = (valor) => {
  return (
    valor === true ||
    valor === 'true' ||
    valor === 1 ||
    valor === '1'
  );
};

const requiereRol = (tipoDestino) => {
  return ['ROL', 'ROL_SUCURSAL'].includes(tipoDestino);
};

const requiereSucursal = (tipoDestino) => {
  return ['SUCURSAL', 'ROL_SUCURSAL'].includes(tipoDestino);
};

export default function Alertas() {
  const { usuario } = useAuth();

  const puedeVerTodasSucursales = esSuperAdmin(usuario);

  const [formAlerta, setFormAlerta] = useState(alertaInicial);
  const [alertas, setAlertas] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const sucursalesDisponibles = useMemo(() => {
    return filtrarSucursalesPorRol(usuario, sucursales);
  }, [usuario, sucursales]);

  const esVistaAdministrativa = puedeVerTodasSucursales;

  // =========================================================
  // CARGA DE SUCURSALES
  // =========================================================

  const cargarSucursales = async () => {
    try {
      const { data } = await api.get('/sucursales');

      if (data.ok) {
        const activas = (data.sucursales || []).filter((sucursal) =>
          esActivo(sucursal.activo)
        );

        setSucursales(activas);
      }
    } catch (error) {
      console.error('Error al cargar sucursales:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las sucursales.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  // =========================================================
  // CARGA DE ALERTAS
  // =========================================================

  const cargarAlertas = async () => {
    try {
      setCargando(true);

      /*
       * SUPER_ADMIN conserva la vista administrativa/global.
       * Los demás usuarios consultan únicamente sus alertas.
       */
      const endpoint = esVistaAdministrativa
        ? '/alertas'
        : '/alertas/mis-alertas';

      const { data } = await api.get(endpoint);

      if (data.ok) {
        setAlertas(data.alertas || []);
      } else {
        setAlertas([]);
      }
    } catch (error) {
      console.error('Error al cargar alertas:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar las alertas.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setCargando(false);
    }
  };

  // =========================================================
  // EFECTOS
  // =========================================================

  useEffect(() => {
    cargarSucursales();
    cargarAlertas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esVistaAdministrativa]);

  /*
   * Para usuarios con una única sucursal,
   * la precargamos automáticamente.
   */
  useEffect(() => {
    if (
      !puedeVerTodasSucursales &&
      sucursalesDisponibles.length === 1 &&
      !formAlerta.id_sucursal
    ) {
      setFormAlerta((prev) => ({
        ...prev,
        id_sucursal: String(
          sucursalesDisponibles[0].id_sucursal
        ),
      }));
    }
  }, [
    puedeVerTodasSucursales,
    sucursalesDisponibles,
    formAlerta.id_sucursal,
  ]);

  // =========================================================
  // FORMULARIO
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormAlerta((prev) => {
      const nuevo = {
        ...prev,
        [name]: value,
      };

      if (name === 'destino_tipo') {
        nuevo.destino_rol = '';
        nuevo.id_sucursal = '';

        if (
          requiereSucursal(value) &&
          !puedeVerTodasSucursales &&
          sucursalesDisponibles.length === 1
        ) {
          nuevo.id_sucursal = String(
            sucursalesDisponibles[0].id_sucursal
          );
        }
      }

      return nuevo;
    });
  };

  const validarAlerta = () => {
    const tipoDestino = formAlerta.destino_tipo;

    if (!formAlerta.titulo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Título obligatorio',
        text: 'Escribe el título de la alerta.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (!formAlerta.mensaje.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Mensaje obligatorio',
        text: 'Escribe el mensaje de la alerta.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (
      tipoDestino === 'TODOS' &&
      !puedeVerTodasSucursales
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Destino no permitido',
        text:
          'Solo un superadministrador puede enviar alertas a todos los usuarios.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (
      requiereRol(tipoDestino) &&
      !formAlerta.destino_rol
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Rol obligatorio',
        text: 'Selecciona el rol al que se enviará la alerta.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    if (
      requiereSucursal(tipoDestino) &&
      !formAlerta.id_sucursal
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Sucursal obligatoria',
        text:
          'Selecciona la sucursal a la que se enviará la alerta.',
        confirmButtonColor: '#B85F7D',
      });

      return false;
    }

    return true;
  };

  // =========================================================
  // CREAR ALERTA
  // =========================================================

  const crearAlerta = async (event) => {
    event.preventDefault();

    if (!validarAlerta()) return;

    const tipoDestino = formAlerta.destino_tipo;

    try {
      setGuardando(true);

      const payload = {
        titulo: formAlerta.titulo.trim(),
        mensaje: formAlerta.mensaje.trim(),
        prioridad: formAlerta.prioridad,

        /*
         * El backend espera exactamente "tipo_destino".
         */
        tipo_destino: tipoDestino,

        destino_rol: requiereRol(tipoDestino)
          ? formAlerta.destino_rol
          : null,

        id_sucursal: requiereSucursal(tipoDestino)
          ? Number(formAlerta.id_sucursal)
          : null,
      };

      const { data } = await api.post('/alertas', payload);

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Alerta enviada',
          text: data.mensaje,
          timer: 1600,
          showConfirmButton: false,
        });

        setFormAlerta({
          ...alertaInicial,
          id_sucursal:
            !puedeVerTodasSucursales &&
            sucursalesDisponibles.length === 1
              ? String(
                  sucursalesDisponibles[0].id_sucursal
                )
              : '',
        });

        await cargarAlertas();
      }
    } catch (error) {
      console.error('Error al crear alerta:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo crear la alerta.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // DESACTIVAR
  // =========================================================

  const desactivarAlerta = async (idAlerta) => {
    if (!esVistaAdministrativa) {
      Swal.fire({
        icon: 'warning',
        title: 'Acción no permitida',
        text:
          'Solo el superadministrador puede desactivar alertas desde esta pantalla.',
        confirmButtonColor: '#B85F7D',
      });

      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar alerta?',
      text: 'La alerta dejará de mostrarse a los usuarios.',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#B85F7D',
      cancelButtonColor: '#8B7A80',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(
        `/alertas/${idAlerta}`
      );

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Alerta desactivada',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        await cargarAlertas();
      }
    } catch (error) {
      console.error('Error al desactivar alerta:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo desactivar la alerta.',
        confirmButtonColor: '#B85F7D',
      });
    }
  };

  // =========================================================
  // HELPERS VISUALES
  // =========================================================

  const obtenerClasePrioridad = (prioridad) => {
    switch (prioridad) {
      case 'URGENTE':
        return {
          badge:
            'bg-red-50 text-red-700 border-red-100',
          icono: ShieldAlert,
        };

      case 'IMPORTANTE':
        return {
          badge:
            'bg-amber-50 text-amber-700 border-amber-100',
          icono: AlertTriangle,
        };

      default:
        return {
          badge:
            'bg-[#FBEAF0] text-[#A84E6C] border-[#F0D4DE]',
          icono: Info,
        };
    }
  };

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const obtenerDestino = (alerta) => {
    const tipoDestino = String(
      alerta.tipo_destino || ''
    ).toUpperCase();

    const tieneSucursal = Boolean(alerta.id_sucursal);

    const sucursal =
      alerta.sucursal ||
      `Sucursal #${alerta.id_sucursal}`;

    if (tipoDestino === 'ROL_SUCURSAL') {
      return `${
        alerta.destino_rol || 'Rol'
      } · ${sucursal}`;
    }

    if (
      tipoDestino === 'SUCURSAL' ||
      tieneSucursal
    ) {
      return sucursal;
    }

    if (
      tipoDestino === 'ROL' &&
      alerta.destino_rol
    ) {
      return alerta.destino_rol;
    }

    if (tipoDestino === 'USUARIO') {
      return 'Usuario específico';
    }

    return 'Todos los usuarios';
  };

  const obtenerEstadoAlerta = (alerta) => {
    if (esVistaAdministrativa) {
      return esActivo(alerta.activa)
        ? {
            texto: 'Activa',
            clase:
              'bg-emerald-50 text-emerald-700',
            icono: CheckCircle2,
          }
        : {
            texto: 'Inactiva',
            clase:
              'bg-slate-100 text-slate-500',
            icono: CircleOff,
          };
    }

    return alerta.leida
      ? {
          texto: 'Leída',
          clase:
            'bg-slate-100 text-slate-600',
          icono: CheckCircle2,
        }
      : {
          texto: 'Sin leer',
          clase:
            'bg-[#F0EBF6] text-[#765D8D]',
          icono: Bell,
        };
  };

  const totalActivas = alertas.filter((alerta) => {
    return esVistaAdministrativa
      ? esActivo(alerta.activa)
      : !alerta.leida;
  }).length;

  const totalImportantes = alertas.filter(
    (alerta) =>
      String(alerta.prioridad || '').toUpperCase() ===
        'IMPORTANTE' &&
      (esVistaAdministrativa
        ? esActivo(alerta.activa)
        : !alerta.leida)
  ).length;

  const totalUrgentes = alertas.filter(
    (alerta) =>
      String(alerta.prioridad || '').toUpperCase() ===
        'URGENTE' &&
      (esVistaAdministrativa
        ? esActivo(alerta.activa)
        : !alerta.leida)
  ).length;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="space-y-6 pb-8">
      {/* =======================================================
          ENCABEZADO
      ======================================================= */}

      <section className="relative overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_16px_50px_rgba(118,76,91,0.06)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#F7DCE4]/70 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-20 left-[20%] h-52 w-52 rounded-full bg-[#FCEEF2]/80 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#B85F7D]">
              <Bell size={24} />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF3F6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#B85F7D]">
                <Sparkles size={13} />
                Comunicación interna
              </div>

              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Alertas del sistema
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D]">
                {esVistaAdministrativa
                  ? 'Crea y administra avisos dirigidos a usuarios, roles y sucursales.'
                  : 'Consulta los avisos dirigidos a tu rol y sucursal.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cargarAlertas}
            disabled={cargando}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60"
          >
            {cargando ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={18} />
            )}

            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {/* MÉTRICAS */}
        <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MiniResumen
            titulo={
              esVistaAdministrativa
                ? 'Alertas activas'
                : 'Sin leer'
            }
            valor={totalActivas}
            icono={Bell}
            claseIcono="bg-[#FBEAF0] text-[#B85F7D]"
          />

          <MiniResumen
            titulo="Importantes"
            valor={totalImportantes}
            icono={AlertTriangle}
            claseIcono="bg-amber-50 text-amber-700"
          />

          <MiniResumen
            titulo="Urgentes"
            valor={totalUrgentes}
            icono={ShieldAlert}
            claseIcono="bg-red-50 text-red-700"
          />
        </div>
      </section>

      {/* =======================================================
          CONTENIDO
      ======================================================= */}

      <section
        className={`grid gap-6 ${
          esVistaAdministrativa
            ? 'xl:grid-cols-[420px_minmax(0,1fr)]'
            : 'grid-cols-1'
        }`}
      >
        {/* =====================================================
            NUEVA ALERTA
        ===================================================== */}

        {esVistaAdministrativa && (
          <form
            onSubmit={crearAlerta}
            className="h-fit space-y-5 rounded-[2rem] border border-[#F0E2E7] bg-white p-5 shadow-[0_14px_45px_rgba(118,76,91,0.05)] sm:p-6"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#B85F7D]">
                <Megaphone size={21} />
              </div>

              <div>
                <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A]">
                  Nueva alerta
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8C777F]">
                  Define el mensaje, su prioridad y quién debe recibirlo.
                </p>
              </div>
            </div>

            {/* TÍTULO */}
            <Campo label="Título *">
              <input
                name="titulo"
                value={formAlerta.titulo}
                onChange={handleChange}
                maxLength={150}
                className={inputClass}
                placeholder="Ej. Promoción especial de fin de semana"
              />
            </Campo>

            {/* MENSAJE */}
            <Campo label="Mensaje *">
              <textarea
                name="mensaje"
                value={formAlerta.mensaje}
                onChange={handleChange}
                rows="5"
                className={`${inputClass} resize-none`}
                placeholder="Escribe el mensaje que verán los usuarios..."
              />
            </Campo>

            {/* PRIORIDAD */}
            <Campo label="Prioridad">
              <select
                name="prioridad"
                value={formAlerta.prioridad}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="NORMAL">
                  Normal
                </option>

                <option value="IMPORTANTE">
                  Importante
                </option>

                <option value="URGENTE">
                  Urgente
                </option>
              </select>
            </Campo>

            {/* DESTINO */}
            <Campo label="Destino *">
              <select
                name="destino_tipo"
                value={formAlerta.destino_tipo}
                onChange={handleChange}
                className={inputClass}
              >
                {puedeVerTodasSucursales && (
                  <option value="TODOS">
                    Todos los usuarios
                  </option>
                )}

                <option value="ROL">
                  Por rol
                </option>

                <option value="SUCURSAL">
                  Por sucursal
                </option>

                <option value="ROL_SUCURSAL">
                  Por rol y sucursal
                </option>
              </select>
            </Campo>

            {/* ROL */}
            {requiereRol(
              formAlerta.destino_tipo
            ) && (
              <Campo label="Rol destino *">
                <select
                  name="destino_rol"
                  value={formAlerta.destino_rol}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">
                    Selecciona rol
                  </option>

                  {rolesDisponibles.map((rol) => (
                    <option
                      key={rol.value}
                      value={rol.value}
                    >
                      {rol.label}
                    </option>
                  ))}
                </select>
              </Campo>
            )}

            {/* SUCURSAL */}
            {requiereSucursal(
              formAlerta.destino_tipo
            ) && (
              <Campo label="Sucursal destino *">
                <select
                  name="id_sucursal"
                  value={formAlerta.id_sucursal}
                  onChange={handleChange}
                  disabled={
                    !puedeVerTodasSucursales &&
                    sucursalesDisponibles.length ===
                      1
                  }
                  className={`${inputClass} disabled:cursor-not-allowed disabled:bg-slate-100`}
                >
                  <option value="">
                    Selecciona sucursal
                  </option>

                  {sucursalesDisponibles.map(
                    (sucursal) => (
                      <option
                        key={
                          sucursal.id_sucursal
                        }
                        value={
                          sucursal.id_sucursal
                        }
                      >
                        {sucursal.nombre}
                      </option>
                    )
                  )}
                </select>
              </Campo>
            )}

            {/* VISTA PREVIA DESTINO */}
            <div className="rounded-[1.3rem] border border-[#F0E3E7] bg-[#FFFAFB] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF0F4] text-[#B85F7D]">
                  <Users size={17} />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-[#987F88]">
                    Destinatarios
                  </p>

                  <p className="mt-1 text-sm font-semibold leading-relaxed text-[#635158]">
                    {formAlerta.destino_tipo ===
                      'TODOS' &&
                      'Todos los usuarios'}

                    {formAlerta.destino_tipo ===
                      'ROL' &&
                      (formAlerta.destino_rol ||
                        'Selecciona un rol')}

                    {formAlerta.destino_tipo ===
                      'SUCURSAL' &&
                      (sucursalesDisponibles.find(
                        (s) =>
                          String(
                            s.id_sucursal
                          ) ===
                          String(
                            formAlerta.id_sucursal
                          )
                      )?.nombre ||
                        'Selecciona una sucursal')}

                    {formAlerta.destino_tipo ===
                      'ROL_SUCURSAL' &&
                      `${
                        formAlerta.destino_rol ||
                        'Rol'
                      } · ${
                        sucursalesDisponibles.find(
                          (s) =>
                            String(
                              s.id_sucursal
                            ) ===
                            String(
                              formAlerta.id_sucursal
                            )
                        )?.nombre ||
                        'Sucursal'
                      }`}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B85F7D] px-5 py-3.5 font-black text-white shadow-[0_12px_28px_rgba(184,95,125,0.23)] transition hover:-translate-y-0.5 hover:bg-[#A95270] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Enviando...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Enviar alerta
                </>
              )}
            </button>
          </form>
        )}

        {/* =====================================================
            LISTADO
        ===================================================== */}

        <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
          <div className="flex flex-col gap-3 border-b border-[#F2E5E9] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A]">
                {esVistaAdministrativa
                  ? 'Alertas enviadas'
                  : 'Mis alertas'}
              </h2>

              <p className="mt-1 text-sm text-[#8C777F]">
                {esVistaAdministrativa
                  ? 'Historial de avisos activos e inactivos.'
                  : 'Avisos disponibles para tu rol y sucursal.'}
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-xs font-black text-[#A84E6C]">
              <Bell size={13} />

              {totalActivas}{' '}
              {esVistaAdministrativa
                ? 'activas'
                : 'sin leer'}
            </span>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center gap-2 p-12 font-semibold text-[#8A757D]">
              <Loader2
                size={20}
                className="animate-spin text-[#B85F7D]"
              />
              Cargando alertas...
            </div>
          ) : alertas.length === 0 ? (
            <div className="p-10 text-center sm:p-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[#FBEAF0] text-[#B85F7D]">
                <Bell size={29} />
              </div>

              <h3 className="mt-4 font-black text-[#43353A]">
                No hay alertas registradas
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#8C777F]">
                {esVistaAdministrativa
                  ? 'Crea una alerta para comunicar información importante a los usuarios.'
                  : 'No tienes alertas pendientes para tu rol o sucursal.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F3E7EA]">
              {alertas.map((alerta) => {
                const prioridad =
                  obtenerClasePrioridad(
                    alerta.prioridad
                  );

                const IconoPrioridad =
                  prioridad.icono;

                const estado =
                  obtenerEstadoAlerta(alerta);

                const IconoEstado =
                  estado.icono;

                return (
                  <article
                    key={alerta.id_alerta}
                    className={`p-5 transition hover:bg-[#FFFAFB] sm:p-6 ${
                      esVistaAdministrativa &&
                      !esActivo(alerta.activa)
                        ? 'opacity-55'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${prioridad.badge}`}
                          >
                            <IconoPrioridad
                              size={13}
                            />
                            {alerta.prioridad}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${estado.clase}`}
                          >
                            <IconoEstado
                              size={13}
                            />
                            {estado.texto}
                          </span>
                        </div>

                        <h3 className="mt-4 text-base font-black text-[#43353A]">
                          {alerta.titulo}
                        </h3>

                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#6F5C63]">
                          {alerta.mensaje}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-[#9B858D]">
                          <span className="inline-flex items-center gap-1.5">
                            <Users size={13} />
                            {obtenerDestino(alerta)}
                          </span>

                          {alerta.sucursal && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin size={13} />
                              {alerta.sucursal}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1.5">
                            <Bell size={13} />
                            Creada:{' '}
                            {formatoFecha(
                              alerta.fecha_creacion
                            )}
                          </span>

                          {esVistaAdministrativa && (
                            <span className="inline-flex items-center gap-1.5">
                              <UserRound size={13} />
                              Lecturas:{' '}
                              {Number(
                                alerta.total_lecturas ||
                                  0
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {esVistaAdministrativa &&
                        esActivo(alerta.activa) && (
                          <button
                            type="button"
                            onClick={() =>
                              desactivarAlerta(
                                alerta.id_alerta
                              )
                            }
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                            Desactivar
                          </button>
                        )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

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
   COMPONENTES VISUALES
========================================================= */

const inputClass =
  'w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]';

function Campo({
  label,
  children,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-[#5D4A51]">
        {label}
      </label>

      {children}
    </div>
  );
}

function MiniResumen({
  titulo,
  valor,
  icono: Icono,
  claseIcono,
}) {
  return (
    <div className="rounded-[1.3rem] border border-[#F0E3E7] bg-white/80 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#9F8891]">
            {titulo}
          </p>

          <p className="mt-2 text-2xl font-black tracking-[-0.03em] text-[#3A2F33]">
            {valor}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${claseIcono}`}
        >
          <Icono size={18} />
        </div>
      </div>
    </div>
  );
}
