import { NavLink } from 'react-router-dom';

import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Package,
  Boxes,
  Wallet,
  ReceiptText,
  Truck,
  ClipboardList,
  Users,
  BadgePercent,
  Store,
  Tags,
  Search,
  Bell,
  Award,
  Files,
  Settings,
  Sparkles,
  Gift,
  Layers3,
  ChevronRight,
  ShieldCheck,
  RefreshCcw,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { usePermisos } from '../context/PermisosContext';

/* =========================================================
   NAVEGACIÓN
========================================================= */

const secciones = [
  {
    id: 'principal',
    titulo: 'Principal',
    links: [
      {
        to: '/app/dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        modulo: 'dashboard',
      },
      {
        to: '/app/pos',
        label: 'Punto de venta',
        icon: ShoppingCart,
        modulo: 'pos',
      },
    ],
  },

  {
    id: 'inventario',
    titulo: 'Inventario',
    links: [
      {
        to: '/app/inventario',
        label: 'Inventario',
        icon: Boxes,
        modulo: 'inventario',
      },
      {
        to: '/app/stock-sucursales',
        label: 'Stock por sucursal',
        icon: Search,
        modulo: 'stock-sucursales',
      },
      {
        to: '/app/productos',
        label: 'Productos',
        icon: Package,
        modulo: 'productos',
      },
      {
        to: '/app/categorias',
        label: 'Categorías',
        icon: Tags,
        modulo: 'categorias',
      },
      {
        to: '/app/alertas',
        label: 'Alertas',
        icon: Bell,
        modulo: 'alertas',
      },
    ],
  },

  {
    id: 'ventas',
    titulo: 'Ventas y caja',
    links: [
      {
        to: '/app/ventas',
        label: 'Ventas',
        icon: ReceiptText,
        modulo: 'ventas',
      },
      {
        to: '/app/devoluciones',
        label: 'Cambios / Devoluciones',
        icon: RefreshCcw,
        modulo: 'devoluciones',
      },
      {
        to: '/app/caja',
        label: 'Caja',
        icon: Wallet,
        modulo: 'caja',
      },
      {
        to: '/app/cajas',
        label: 'Administrar cajas',
        icon: Layers3,
        modulo: 'cajas',
      },
      {
        to: '/app/reportes-cierre-caja',
        label: 'Reportes de cierre',
        icon: Files,
        modulo: 'reportes-cierre-caja',
      },
    ],
  },

  {
    id: 'compras',
    titulo: 'Compras',
    links: [
      {
        to: '/app/proveedores',
        label: 'Proveedores',
        icon: Truck,
        modulo: 'proveedores',
      },
      {
        to: '/app/compras',
        label: 'Compras a proveedores',
        icon: ClipboardList,
        modulo: 'compras',
      },
    ],
  },

  {
    id: 'clientes',
    titulo: 'Clientes y promociones',
    links: [
      {
        to: '/app/ofertas',
        label: 'Ofertas',
        icon: Gift,
        modulo: 'ofertas',
      },
      {
        to: '/app/tarjetas-puntos',
        label: 'Tarjetas de puntos',
        icon: BadgePercent,
        modulo: 'tarjetas-puntos',
      },
      {
        to: '/app/puntos',
        label: 'Puntos',
        icon: Award,
        modulo: 'puntos',
      },
      {
        to: '/app/catalogo-admin',
        label: 'Catálogo digital',
        icon: Sparkles,
        modulo: 'catalogo-admin',
      },
    ],
  },

  {
    id: 'administracion',
    titulo: 'Administración',
    links: [
      {
        to: '/app/usuarios',
        label: 'Usuarios',
        icon: Users,
        modulo: 'usuarios',
      },
      {
        to: '/app/sucursales',
        label: 'Sucursales',
        icon: Store,
        modulo: 'sucursales',
      },
      {
        to: '/app/configuracion-puntos',
        label: 'Config. de puntos',
        icon: BadgePercent,
        modulo: 'configuracion-puntos',
      },
      {
        to: '/app/configuracion-ticket',
        label: 'Config. de ticket',
        icon: Settings,
        modulo: 'configuracion-ticket',
      },
      {
        to: '/app/configuracion/permisos',
        label: 'Permisos',
        icon: ShieldCheck,
        modulo: 'configuracion-permisos',
      },
    ],
  },
];

/* =========================================================
   SIDEBAR
========================================================= */

export default function Sidebar({
  modoMovil = false,
  onNavigate,
}) {
  const { usuario } = useAuth();

  /*
   * Los permisos ahora se obtienen desde PermisosContext.
   *
   * PermisosContext consulta al backend y el backend obtiene
   * los permisos desde PostgreSQL.
   */
  const {
    tienePermiso,
    cargandoPermisos,
    errorPermisos,
  } = usePermisos();

  /*
   * Filtramos las secciones según los permisos actuales
   * almacenados en la base de datos.
   *
   * Si una sección no tiene ningún módulo disponible
   * para el usuario, simplemente no se muestra.
   */
  const seccionesPermitidas = secciones
    .map((seccion) => ({
      ...seccion,
      links: seccion.links.filter((link) =>
        tienePermiso(
          usuario?.rol,
          link.modulo
        )
      ),
    }))
    .filter(
      (seccion) =>
        seccion.links.length > 0
    );

  /*
   * Mientras los permisos están siendo consultados,
   * mostramos un pequeño loader.
   *
   * Evita que aparezcan/desaparezcan opciones del menú
   * mientras llega la respuesta del backend.
   */
  if (cargandoPermisos) {
    return (
      <aside
        className={`
          relative
          h-screen
          max-h-screen
          w-[290px]
          overflow-hidden
          border-r
          border-[#F0E2E7]
          bg-[#FFFBFC]
          text-[#342B2F]
          shadow-[10px_0_40px_rgba(122,77,91,0.045)]
          ${modoMovil
            ? 'flex'
            : 'hidden lg:flex'
          }
          flex-col
        `}
      >
        {/* Fondo decorativo */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="
              absolute
              -right-24
              -top-24
              h-64
              w-64
              rounded-full
              bg-[#F9E3E9]/70
              blur-3xl
            "
          />

          <div
            className="
              absolute
              -bottom-28
              -left-28
              h-72
              w-72
              rounded-full
              bg-[#FCEEF2]/80
              blur-3xl
            "
          />
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center">
          <div className="text-center">
            <div
              className="
                mx-auto
                h-8
                w-8
                animate-spin
                rounded-full
                border-4
                border-[#F0DDE3]
                border-t-[#B85F7D]
              "
            />

            <p
              className="
                mt-3
                text-xs
                font-bold
                text-[#8D747D]
              "
            >
              Cargando menú...
            </p>
          </div>
        </div>
      </aside>
    );
  }

  /*
   * Si por alguna razón no se pudieron obtener los permisos,
   * evitamos mostrar módulos incorrectos.
   *
   * ROOT puede seguir trabajando gracias a la regla
   * especial existente en PermisosContext.
   */
  if (
    errorPermisos &&
    usuario?.rol !== 'ROOT'
  ) {
    return (
      <aside
        className={`
          relative
          h-screen
          max-h-screen
          w-[290px]
          overflow-hidden
          border-r
          border-[#F0E2E7]
          bg-[#FFFBFC]
          text-[#342B2F]
          shadow-[10px_0_40px_rgba(122,77,91,0.045)]
          ${modoMovil
            ? 'flex'
            : 'hidden lg:flex'
          }
          flex-col
        `}
      >
        <div className="flex flex-1 items-center justify-center px-5">
          <div
            className="
              rounded-2xl
              border
              border-red-200
              bg-red-50
              p-5
              text-center
            "
          >
            <ShieldCheck
              size={30}
              className="mx-auto text-red-500"
            />

            <p className="mt-3 text-sm font-black text-red-700">
              No se pudieron cargar los permisos
            </p>

            <p className="mt-1 text-xs text-red-600">
              Intenta actualizar la página.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`
        relative
        h-screen
        max-h-screen
        w-[290px]
        overflow-hidden
        border-r
        border-[#F0E2E7]
        bg-[#FFFBFC]
        text-[#342B2F]
        shadow-[10px_0_40px_rgba(122,77,91,0.045)]
        ${modoMovil
          ? 'flex'
          : 'hidden lg:flex'
        }
        flex-col
      `}
    >
      {/* =======================================================
          FONDO DECORATIVO
      ======================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="
            absolute
            -right-24
            -top-24
            h-64
            w-64
            rounded-full
            bg-[#F9E3E9]/70
            blur-3xl
          "
        />

        <div
          className="
            absolute
            -bottom-28
            -left-28
            h-72
            w-72
            rounded-full
            bg-[#FCEEF2]/80
            blur-3xl
          "
        />

        <div
          className="
            absolute
            inset-0
            opacity-[0.22]
            bg-[radial-gradient(circle_at_1px_1px,#E5CBD3_1px,transparent_0)]
            [background-size:32px_32px]
          "
        />
      </div>

      {/* =======================================================
          BRAND
      ======================================================= */}

      <div
        className="
          relative
          z-10
          shrink-0
          border-b
          border-[#F2E5E9]
          px-5
          pb-5
          pt-6
        "
      >
        <div className="flex items-center gap-3">
          {/* isotipo */}
          <div
            className="
              relative
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-[1.05rem]
              bg-[#B85F7D]
              text-white
              shadow-[0_10px_24px_rgba(184,95,125,0.24)]
            "
          >
            <div
              className="
                absolute
                inset-0
                bg-gradient-to-br
                from-white/20
                to-transparent
              "
            />

            <ShoppingBag
              size={23}
              strokeWidth={1.7}
              className="relative"
            />

            <Sparkles
              size={11}
              className="
                absolute
                right-2
                top-2
                text-[#FFEAF0]
              "
            />
          </div>

          {/* nombre */}
          <div className="min-w-0">
            <h1
              className="
                truncate
                text-[15px]
                font-black
                tracking-[-0.02em]
                text-[#33292D]
              "
            >
              Moda & Belleza
            </h1>

            <p
              className="
                mt-0.5
                truncate
                text-[10px]
                font-bold
                uppercase
                tracking-[0.18em]
                text-[#A08790]
              "
            >
              Sistema Retail
            </p>
          </div>
        </div>
      </div>

      {/* =======================================================
          NAVEGACIÓN
      ======================================================= */}

      <nav
        className="
          sidebar-scroll
          relative
          z-10
          min-h-0
          flex-1
          space-y-6
          overflow-y-auto
          overscroll-contain
          px-4
          py-5
        "
      >
        {seccionesPermitidas.map((seccion) => (
          <div
            key={seccion.id}
            className="space-y-1.5"
          >
            {/* título sección */}
            <p
              className="
                mb-2
                px-3
                text-[10px]
                font-black
                uppercase
                tracking-[0.16em]
                text-[#AE929C]
              "
            >
              {seccion.titulo}
            </p>

            {/* links */}
            {seccion.links.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `
                      group
                      relative
                      flex
                      min-w-0
                      items-center
                      gap-3
                      rounded-[1rem]
                      px-3
                      py-2.5
                      text-[13px]
                      font-bold
                      outline-none
                      transition-all
                      duration-200

                      ${isActive
                      ? `
                            bg-[#FBEAF0]
                            text-[#A84E6C]
                            shadow-[0_7px_20px_rgba(184,95,125,0.08)]
                          `
                      : `
                            text-[#75636A]
                            hover:bg-white
                            hover:text-[#4A3A40]
                            hover:shadow-[0_7px_20px_rgba(106,69,81,0.06)]
                          `
                    }

                      focus-visible:ring-2
                      focus-visible:ring-[#E5AFC0]
                    `
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* indicador izquierdo */}
                      <span
                        className={`
                          absolute
                          -left-4
                          top-1/2
                          h-7
                          w-[3px]
                          -translate-y-1/2
                          rounded-r-full
                          transition-all
                          duration-200

                          ${isActive
                            ? 'bg-[#B85F7D] opacity-100'
                            : 'bg-transparent opacity-0'
                          }
                        `}
                      />

                      {/* icono */}
                      <span
                        className={`
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          transition-all
                          duration-200

                          ${isActive
                            ? `
                                bg-white
                                text-[#B85F7D]
                                shadow-[0_5px_15px_rgba(184,95,125,0.12)]
                              `
                            : `
                                bg-[#FFF4F7]
                                text-[#A1838E]
                                group-hover:bg-[#FCEBF0]
                                group-hover:text-[#B85F7D]
                              `
                          }
                        `}
                      >
                        <Icon
                          size={18}
                          strokeWidth={1.8}
                        />
                      </span>

                      {/* label */}
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>

                      {/* flecha */}
                      <ChevronRight
                        size={15}
                        className={`
                          shrink-0
                          transition-all
                          duration-200

                          ${isActive
                            ? `
                                translate-x-0
                                text-[#B85F7D]
                                opacity-100
                              `
                            : `
                                -translate-x-1
                                text-[#C3ADB5]
                                opacity-0
                                group-hover:translate-x-0
                                group-hover:opacity-100
                              `
                          }
                        `}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* =======================================================
          SCROLLBAR
      ======================================================= */}

      <style>
        {`
          .sidebar-scroll {
            scrollbar-width: thin;
            scrollbar-color: #E8C9D3 transparent;
          }

          .sidebar-scroll::-webkit-scrollbar {
            width: 5px;
          }

          .sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }

          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: #E8C9D3;
            border-radius: 999px;
          }

          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #DDA9BA;
          }

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
    </aside>
  );
}