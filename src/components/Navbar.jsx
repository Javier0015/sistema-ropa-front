import { useEffect, useRef, useState } from 'react';
import {
  LogOut,
  Store,
  Bell,
  UserRound,
  CheckCircle2,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Navbar() {
  const { usuario, logout } = useAuth();

  const [totalAlertas, setTotalAlertas] = useState(0);
  const [alertas, setAlertas] = useState([]);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);

  const contenedorAlertasRef = useRef(null);

  const sucursalPrincipal = usuario?.sucursales?.[0];

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const cargarTotalAlertas = async () => {
    try {
      const { data } = await api.get('/alertas/no-leidas');

      if (data.ok) {
        setTotalAlertas(data.total || 0);
      }
    } catch (error) {
      console.error('Error al cargar total de alertas:', error);
    }
  };

  const cargarMisAlertas = async () => {
    try {
      const { data } = await api.get('/alertas/mis-alertas');

      if (data.ok) {
        setAlertas(data.alertas || []);
      }
    } catch (error) {
      console.error('Error al cargar alertas:', error);
    }
  };

  const abrirAlertas = async () => {
    const nuevoEstado = !mostrarAlertas;

    setMostrarAlertas(nuevoEstado);

    if (nuevoEstado) {
      await cargarMisAlertas();
      await cargarTotalAlertas();
    }
  };

  const marcarComoLeida = async (idAlerta) => {
    try {
      await api.put(`/alertas/${idAlerta}/leer`);

      setAlertas((prev) =>
        prev.map((alerta) =>
          alerta.id_alerta === idAlerta
            ? { ...alerta, leida: true }
            : alerta
        )
      );

      await cargarTotalAlertas();
    } catch (error) {
      console.error('Error al marcar alerta como leída:', error);
    }
  };

  const clasePrioridad = (prioridad) => {
    switch (prioridad) {
      case 'URGENTE':
        return 'border-red-100 bg-red-50 text-red-700';

      case 'IMPORTANTE':
        return 'border-amber-100 bg-amber-50 text-amber-700';

      default:
        return 'border-[#F0DCE3] bg-[#FFF0F4] text-[#A84E6C]';
    }
  };

  const inicialUsuario = String(usuario?.nombre || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  useEffect(() => {
    if (!usuario) return undefined;

    cargarTotalAlertas();

    const intervalo = setInterval(() => {
      cargarTotalAlertas();
    }, 30000);

    return () => clearInterval(intervalo);
  }, [usuario]);

  useEffect(() => {
    const cerrarAlDarClickAfuera = (event) => {
      if (
        contenedorAlertasRef.current &&
        !contenedorAlertasRef.current.contains(event.target)
      ) {
        setMostrarAlertas(false);
      }
    };

    document.addEventListener('mousedown', cerrarAlDarClickAfuera);

    return () => {
      document.removeEventListener('mousedown', cerrarAlDarClickAfuera);
    };
  }, []);

  return (
    <header
      className="
        relative z-40
        flex min-h-[72px] w-full items-center justify-between gap-3
        border-b border-[#F0E2E7]
        bg-white
        px-3 py-3
        shadow-[0_8px_30px_rgba(125,76,91,0.04)]
        sm:min-h-[82px]
        sm:px-5
        lg:px-6
      "
    >
      {/* =========================
          IZQUIERDA
      ========================== */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="
            flex h-11 w-11 shrink-0 items-center justify-center
            rounded-2xl
            bg-[#B85F7D]
            text-white
            shadow-lg shadow-[#B85F7D]/20
            sm:h-12 sm:w-12
          "
        >
          <Store size={22} />
        </div>

        <div className="min-w-0">
          <h2
            className="
              truncate
              text-base font-black tracking-tight
              text-[#33292D]
              sm:text-xl
            "
          >
            Panel administrativo
          </h2>

          <div
            className="
              mt-0.5
              flex min-w-0 items-center gap-1.5
              text-xs font-semibold
              text-[#8B7A80]
              sm:text-sm
            "
          >
            <span className="truncate">
              {sucursalPrincipal
                ? `${sucursalPrincipal.nombre}${
                    sucursalPrincipal.clave
                      ? ` · ${sucursalPrincipal.clave}`
                      : ''
                  }`
                : 'Sin sucursal asignada'}
            </span>
          </div>
        </div>
      </div>

      {/* =========================
          DERECHA
      ========================== */}
      <div className="relative flex shrink-0 items-center gap-2 sm:gap-3">
        {/* ALERTAS */}
        <div className="relative" ref={contenedorAlertasRef}>
          <button
            type="button"
            onClick={abrirAlertas}
            className={`
              relative
              flex h-11 w-11 items-center justify-center
              rounded-2xl
              border
              transition
              ${
                mostrarAlertas
                  ? 'border-[#E3BCC9] bg-[#B85F7D] text-white shadow-lg shadow-[#B85F7D]/15'
                  : 'border-[#F0E2E7] bg-[#FFF9FA] text-[#755F67] hover:border-[#E3BCC9] hover:bg-[#FFF0F4] hover:text-[#B85F7D]'
              }
            `}
            title="Alertas"
          >
            <Bell size={20} />

            {totalAlertas > 0 && (
              <span
                className="
                  absolute -right-1.5 -top-1.5
                  flex h-5 min-w-5 items-center justify-center
                  rounded-full
                  border-2 border-white
                  bg-amber-400
                  px-1
                  text-[10px] font-black
                  text-[#392F33]
                  shadow-sm
                "
              >
                {totalAlertas > 99 ? '99+' : totalAlertas}
              </span>
            )}
          </button>

          {/* DROPDOWN ALERTAS */}
          {mostrarAlertas && (
            <div
              className="
                fixed
                left-3 right-3
                top-[78px]
                z-50
                overflow-hidden
                rounded-[1.75rem]
                border border-[#F0E2E7]
                bg-white
                shadow-[0_25px_70px_rgba(72,43,52,0.18)]

                sm:absolute
                sm:left-auto
                sm:right-0
                sm:top-14
                sm:w-[390px]
                sm:max-w-[calc(100vw-2rem)]
              "
            >
              {/* CABECERA ALERTAS */}
              <div
                className="
                  flex items-start justify-between gap-3
                  border-b border-[#F4EAED]
                  bg-[#FFF9FA]
                  px-4 py-4
                  sm:px-5
                "
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className="
                      flex h-10 w-10 shrink-0 items-center justify-center
                      rounded-2xl
                      bg-[#FFF0F4]
                      text-[#B85F7D]
                    "
                  >
                    <Bell size={19} />
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-black text-[#392F33]">
                      Alertas
                    </h3>

                    <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                      Notificaciones recientes
                    </p>
                  </div>
                </div>

                {totalAlertas > 0 && (
                  <span
                    className="
                      shrink-0
                      rounded-full
                      bg-[#FFF0F4]
                      px-3 py-1.5
                      text-[11px] font-black
                      text-[#A84E6C]
                    "
                  >
                    {totalAlertas} nueva{totalAlertas !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* LISTA ALERTAS */}
              <div className="max-h-[65vh] overflow-y-auto overscroll-contain sm:max-h-[430px]">
                {alertas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                    <div
                      className="
                        flex h-14 w-14 items-center justify-center
                        rounded-2xl
                        bg-[#FFF0F4]
                        text-[#B85F7D]
                      "
                    >
                      <CheckCircle2 size={26} />
                    </div>

                    <p className="mt-4 font-black text-[#5B4950]">
                      Todo está en orden
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#9A858D]">
                      No tienes alertas por el momento.
                    </p>
                  </div>
                ) : (
                  alertas.map((alerta) => (
                    <button
                      key={alerta.id_alerta}
                      type="button"
                      onClick={() => marcarComoLeida(alerta.id_alerta)}
                      className={`
                        w-full
                        border-b border-[#F4EAED]
                        px-4 py-4
                        text-left
                        transition
                        last:border-b-0
                        hover:bg-[#FFF9FA]
                        sm:px-5
                        ${
                          !alerta.leida
                            ? 'bg-[#FFF5F7]'
                            : 'bg-white'
                        }
                      `}
                    >
                      <div className="flex items-start gap-3">
                        {/* INDICADOR */}
                        <div className="pt-1">
                          <span
                            className={`
                              block h-2.5 w-2.5 rounded-full
                              ${
                                !alerta.leida
                                  ? 'bg-[#B85F7D]'
                                  : 'bg-[#DDD0D4]'
                              }
                            `}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p
                              className={`
                                break-words text-sm
                                text-[#392F33]
                                ${
                                  !alerta.leida
                                    ? 'font-black'
                                    : 'font-bold'
                                }
                              `}
                            >
                              {alerta.titulo}
                            </p>
                          </div>

                          <p
                            className="
                              mt-1
                              line-clamp-2
                              break-words
                              text-xs font-semibold
                              leading-relaxed
                              text-[#8B7A80]
                              sm:text-sm
                            "
                          >
                            {alerta.mensaje}
                          </p>

                          <div
                            className="
                              mt-3
                              flex flex-col gap-2
                              sm:flex-row
                              sm:items-center
                              sm:justify-between
                            "
                          >
                            <span
                              className={`
                                w-fit
                                rounded-full
                                border
                                px-2.5 py-1
                                text-[10px] font-black
                                ${clasePrioridad(alerta.prioridad)}
                              `}
                            >
                              {alerta.prioridad}
                            </span>

                            <span
                              className="
                                text-[10px] font-semibold
                                text-[#B09CA3]
                              "
                            >
                              {new Date(
                                alerta.fecha_creacion
                              ).toLocaleString('es-MX', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* =========================
            USUARIO
        ========================== */}
        <div
          className="
            hidden
            items-center gap-3
            rounded-2xl
            border border-[#F0E2E7]
            bg-[#FFF9FA]
            py-1.5 pl-1.5 pr-3
            md:flex
          "
        >
          <div
            className="
              flex h-9 w-9 shrink-0 items-center justify-center
              rounded-xl
              bg-[#FFF0F4]
              text-sm font-black
              text-[#B85F7D]
            "
          >
            {inicialUsuario || <UserRound size={17} />}
          </div>

          <div className="max-w-[155px] min-w-0">
            <p className="truncate text-sm font-black text-[#392F33]">
              {usuario?.nombre || 'Usuario'}
            </p>

            <p className="truncate text-[11px] font-bold text-[#9A858D]">
              {usuario?.rol || 'Sin rol'}
            </p>
          </div>
        </div>

        {/* =========================
            CERRAR SESIÓN
        ========================== */}
        <button
          type="button"
          onClick={handleLogout}
          className="
            flex h-11 w-11 items-center justify-center
            rounded-2xl
            border border-[#F0E2E7]
            bg-[#FFF9FA]
            text-[#755F67]
            transition
            hover:border-red-100
            hover:bg-red-50
            hover:text-red-600
          "
          title="Cerrar sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}