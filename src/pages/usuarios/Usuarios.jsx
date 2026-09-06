import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Save,
  User,
  Mail,
  Lock,
  Shield,
  Store,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  CheckCircle2,
  CircleOff,
  KeyRound,
} from 'lucide-react';

import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const formInicial = {
  nombre: '',
  usuario: '',
  correo: '',
  password: '',
  id_rol: '',
  sucursales: [],
  activo: true,
};

const ROLES_MEDICOS = new Set([
  'DOCTOR',
  'DOCTOR_SHADDAI',
  'MEDICO',
  'MÉDICO',
]);

const esActivo = (valor) => {
  return (
    valor === true ||
    valor === 'true' ||
    valor === 1 ||
    valor === '1'
  );
};

const normalizarRol = (rol) => {
  return String(rol || '')
    .trim()
    .toUpperCase();
};

const ROL_ROOT = 'ROOT';

const esRolRoot = (rol) => normalizarRol(rol) === ROL_ROOT;

export default function Usuarios() {
  const { usuario: usuarioSesion } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);

  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const [form, setForm] = useState(formInicial);

  const sesionEsRoot = esRolRoot(usuarioSesion?.rol);

  const rolesPermitidos = useMemo(() => {
    if (sesionEsRoot) return roles;

    return roles.filter((rol) => !esRolRoot(rol.nombre));
  }, [roles, sesionEsRoot]);

  const puedeGestionarUsuario = (item) => {
    if (!item) return false;

    if (sesionEsRoot) return true;

    return !esRolRoot(item.rol);
  };

  // =========================================================
  // RESUMEN
  // =========================================================

  const resumen = useMemo(() => {
    const total = usuarios.length;
    const activos = usuarios.filter((u) => esActivo(u.activo)).length;
    const inactivos = total - activos;

    return {
      total,
      activos,
      inactivos,
    };
  }, [usuarios]);

  // =========================================================
  // HELPERS
  // =========================================================

  const formatoFecha = (fecha) => {
    if (!fecha) return '—';

    return new Date(fecha).toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getRolStyle = (rol) => {
    const valor = normalizarRol(rol);

    if (valor === 'SUPER_ADMIN') {
      return 'bg-red-50 text-red-700 border-red-100';
    }

    if (valor === 'ADMIN_SUCURSAL') {
      return 'bg-[#F0EBF6] text-[#765D8D] border-[#E5DCEC]';
    }

    if (valor === 'CAJERO') {
      return 'bg-[#FBEAF0] text-[#A84E6C] border-[#F0D4DE]';
    }

    if (valor === 'ALMACEN') {
      return 'bg-amber-50 text-amber-700 border-amber-100';
    }

    if (valor === 'COMPRAS') {
      return 'bg-violet-50 text-violet-700 border-violet-100';
    }

    if (valor === 'VENDEDOR') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }

    if (valor === 'LECTURA') {
      return 'bg-slate-100 text-slate-600 border-slate-200';
    }

    return 'bg-[#F8EDF1] text-[#66535A] border-[#EEDFE4]';
  };

  const nombreRolLegible = (rol) => {
    const valor = normalizarRol(rol);

    const nombres = {
      ROOT: 'ROOT',
      SUPER_ADMIN: 'Super administrador',
      ADMIN_SUCURSAL: 'Administrador de sucursal',
      CAJERO: 'Cajero',
      ALMACEN: 'Almacén',
      COMPRAS: 'Compras',
      VENDEDOR: 'Vendedor',
      LECTURA: 'Lectura',
    };

    return nombres[valor] || rol || 'Sin rol';
  };

  // =========================================================
  // CARGA
  // =========================================================

  const cargarUsuarios = async () => {
    try {
      setCargando(true);

      const params = new URLSearchParams();

      if (buscar.trim()) {
        params.append('buscar', buscar.trim());
      }

      const query = params.toString();

      const { data } = await api.get(
        query ? `/usuarios?${query}` : '/usuarios'
      );

      if (data.ok) {
        const lista = data.usuarios || [];

        const usuariosVisibles = lista.filter((item) => {
          const rol = normalizarRol(item.rol);

          // Oculta roles médicos de esta vista.
          if (ROLES_MEDICOS.has(rol)) return false;

          // ROOT puede ver cuentas ROOT.
          if (sesionEsRoot) return true;

          // SUPER_ADMIN y cualquier otro rol no deben ver cuentas ROOT.
          return !esRolRoot(rol);
        });

        setUsuarios(usuariosVisibles);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudieron cargar los usuarios.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setCargando(false);
    }
  };

  const cargarRoles = async () => {
    try {
      const { data } = await api.get('/usuarios/roles');

      if (data.ok) {
        const rolesRetail = (data.roles || []).filter(
          (rol) => !ROLES_MEDICOS.has(normalizarRol(rol.nombre))
        );

        setRoles(rolesRetail);
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los roles.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  const cargarSucursales = async () => {
    try {
      const { data } = await api.get('/sucursales');

      if (data.ok) {
        setSucursales(
          (data.sucursales || []).filter((s) => esActivo(s.activo))
        );
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las sucursales.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

  useEffect(() => {
    cargarUsuarios();
    cargarRoles();
    cargarSucursales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================================================
  // MODAL
  // =========================================================

  const abrirNuevo = () => {
    const rolCajero = rolesPermitidos.find(
      (r) => normalizarRol(r.nombre) === 'CAJERO'
    );

    setForm({
      ...formInicial,
      id_rol: rolCajero?.id_rol || rolesPermitidos[0]?.id_rol || '',
      sucursales: [],
    });

    setModoEdicion(false);
    setUsuarioEditando(null);
    setMostrarPassword(false);
    setModalAbierto(true);
  };

  const abrirEditar = (usuario) => {
    if (!puedeGestionarUsuario(usuario)) {
      Swal.fire({
        icon: 'warning',
        title: 'Acceso restringido',
        text: 'Solo una cuenta ROOT puede modificar a otro usuario ROOT.',
        confirmButtonColor: '#AD526F',
      });
      return;
    }

    setUsuarioEditando(usuario);
    setModoEdicion(true);
    setMostrarPassword(false);

    setForm({
      nombre: usuario.nombre || '',
      usuario: usuario.usuario || '',
      correo: usuario.correo || '',
      password: '',
      id_rol: usuario.id_rol || '',
      sucursales: (usuario.sucursales || []).map((s) =>
        Number(s.id_sucursal)
      ),
      activo: esActivo(usuario.activo),
    });

    setModalAbierto(true);
  };

  const cerrarModal = () => {
    if (guardando) return;

    setModalAbierto(false);
    setModoEdicion(false);
    setUsuarioEditando(null);
    setMostrarPassword(false);
    setForm(formInicial);
  };

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleSucursal = (idSucursal) => {
    const idNum = Number(idSucursal);

    setForm((prev) => {
      const existe = prev.sucursales.includes(idNum);

      return {
        ...prev,
        sucursales: existe
          ? prev.sucursales.filter((id) => id !== idNum)
          : [...prev.sucursales, idNum],
      };
    });
  };

  // =========================================================
  // VALIDACIÓN
  // =========================================================

  const validarForm = () => {
    if (!form.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nombre obligatorio',
        text: 'Ingresa el nombre completo del usuario.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (!form.usuario.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Usuario obligatorio',
        text: 'Ingresa el nombre de acceso.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (
      !modoEdicion &&
      (!form.password || form.password.length < 6)
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña inválida',
        text: 'La contraseña debe tener al menos 6 caracteres.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (
      modoEdicion &&
      form.password &&
      form.password.length < 6
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña inválida',
        text:
          'La nueva contraseña debe tener al menos 6 caracteres.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (!form.id_rol) {
      Swal.fire({
        icon: 'warning',
        title: 'Rol obligatorio',
        text: 'Selecciona un rol para el usuario.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    const rolSeleccionado = roles.find(
      (rol) => Number(rol.id_rol) === Number(form.id_rol)
    );

    if (!sesionEsRoot && esRolRoot(rolSeleccionado?.nombre)) {
      Swal.fire({
        icon: 'error',
        title: 'Rol no permitido',
        text: 'Solo una cuenta ROOT puede asignar el rol ROOT.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (
      !Array.isArray(form.sucursales) ||
      form.sucursales.length === 0
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Sucursal obligatoria',
        text: 'Asigna al menos una sucursal al usuario.',
        confirmButtonColor: '#AD526F',
      });

      return false;
    }

    if (form.correo.trim()) {
      const correoValido =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          form.correo.trim()
        );

      if (!correoValido) {
        Swal.fire({
          icon: 'warning',
          title: 'Correo inválido',
          text: 'Ingresa un correo electrónico válido.',
          confirmButtonColor: '#AD526F',
        });

        return false;
      }
    }

    return true;
  };

  // =========================================================
  // GUARDAR
  // =========================================================

  const guardarUsuario = async (e) => {
    e.preventDefault();

    if (!validarForm()) return;

    try {
      setGuardando(true);

      const payload = {
        nombre: form.nombre.trim(),
        usuario: form.usuario.trim(),
        correo: form.correo.trim() || null,
        id_rol: Number(form.id_rol),
        sucursales: form.sucursales.map((id) => Number(id)),
        activo: Boolean(form.activo),
      };

      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      let respuesta;

      if (modoEdicion) {
        respuesta = await api.put(
          `/usuarios/${usuarioEditando.id_usuario}`,
          payload
        );
      } else {
        respuesta = await api.post('/usuarios', payload);
      }

      if (respuesta.data.ok) {
        await Swal.fire({
          icon: 'success',
          title: modoEdicion
            ? 'Usuario actualizado'
            : 'Usuario creado',
          text: respuesta.data.mensaje,
          timer: 1500,
          showConfirmButton: false,
        });

        cerrarModal();
        await cargarUsuarios();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo guardar el usuario.',
        confirmButtonColor: '#AD526F',
      });
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================
  // DESACTIVAR
  // =========================================================

  const desactivarUsuario = async (usuario) => {
    if (!puedeGestionarUsuario(usuario)) {
      Swal.fire({
        icon: 'warning',
        title: 'Acceso restringido',
        text: 'Solo una cuenta ROOT puede desactivar a otro usuario ROOT.',
        confirmButtonColor: '#AD526F',
      });
      return;
    }

    if (
      Number(usuario.id_usuario) ===
      Number(usuarioSesion?.id_usuario)
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Acción no permitida',
        text: 'No puedes desactivar tu propio usuario.',
        confirmButtonColor: '#AD526F',
      });

      return;
    }

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Desactivar usuario?',
      text: `Se desactivará: ${usuario.nombre}`,
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#8B7A80',
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const { data } = await api.delete(
        `/usuarios/${usuario.id_usuario}`
      );

      if (data.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Usuario desactivado',
          text: data.mensaje,
          timer: 1400,
          showConfirmButton: false,
        });

        await cargarUsuarios();
      }
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text:
          error.response?.data?.mensaje ||
          'No se pudo desactivar el usuario.',
        confirmButtonColor: '#AD526F',
      });
    }
  };

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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] bg-[#FBEAF0] text-[#AD526F] sm:h-14 sm:w-14">
              <Users size={25} />
            </div>

            <div className="min-w-0">
          
              <h1 className="mt-3 text-2xl font-black tracking-[-0.03em] text-[#342A2E] sm:text-3xl">
                Usuarios y roles
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#89757D] sm:text-base">
                Administra accesos, roles operativos y sucursales
                asignadas a cada integrante del equipo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirNuevo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.23)] transition hover:-translate-y-0.5 hover:bg-[#8B3F5B] sm:w-auto"
          >
            <Plus size={19} />
            Nuevo usuario
          </button>
        </div>

        <div className="relative mt-6 flex flex-col gap-3 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B4A0A7]"
              size={19}
            />

            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  cargarUsuarios();
                }
              }}
              className="w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] py-3 pl-12 pr-4 text-sm font-semibold text-[#4A3B40] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D48BA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]"
              placeholder="Buscar por nombre, usuario, correo o rol..."
            />
          </div>

          <button
            type="button"
            onClick={cargarUsuarios}
            disabled={cargando}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#44353B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#35292E] disabled:opacity-60 md:w-auto"
          >
            {cargando ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={18} />
            )}

            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </section>

      {/* =====================================================
          KPI
      ===================================================== */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <UsuarioKpi
          titulo="Total usuarios"
          valor={resumen.total}
          detalle="Cuentas registradas"
          icono={Users}
          claseIcono="bg-[#FBEAF0] text-[#AD526F]"
        />

        <UsuarioKpi
          titulo="Activos"
          valor={resumen.activos}
          detalle="Con acceso habilitado"
          icono={CheckCircle2}
          claseIcono="bg-emerald-50 text-emerald-700"
        />

        <UsuarioKpi
          titulo="Inactivos"
          valor={resumen.inactivos}
          detalle="Sin acceso al sistema"
          icono={CircleOff}
          claseIcono="bg-slate-100 text-slate-600"
        />
      </section>

      {/* =====================================================
          LISTADO
      ===================================================== */}

      <section className="overflow-hidden rounded-[2rem] border border-[#F0E2E7] bg-white shadow-[0_14px_45px_rgba(118,76,91,0.05)]">
        <div className="flex items-center justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F5] text-[#AD526F]">
              <Shield size={18} />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-[-0.02em] text-[#43353A] sm:text-xl">
                Personal con acceso
              </h2>

              <p className="mt-0.5 text-xs font-semibold text-[#9A858D]">
                {usuarios.length} usuario(s) en la vista actual
              </p>
            </div>
          </div>
        </div>

        {/* MÓVIL */}
        <div className="space-y-3 p-4 lg:hidden">
          {cargando ? (
            <EstadoLista
              cargando
              texto="Cargando usuarios..."
            />
          ) : usuarios.length === 0 ? (
            <EstadoLista texto="No hay usuarios registrados." />
          ) : (
            usuarios.map((item) => (
              <article
                key={item.id_usuario}
                className="rounded-[1.5rem] border border-[#F0E4E8] bg-[#FFFCFD] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#AD526F]">
                      <User size={20} />
                    </div>

                    <div className="min-w-0">
                      <p className="break-words font-black text-[#43353A]">
                        {item.nombre}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-[#9A858D]">
                        @{item.usuario}
                      </p>
                    </div>
                  </div>

                  <EstadoUsuario activo={item.activo} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${getRolStyle(
                      item.rol
                    )}`}
                  >
                    {nombreRolLegible(item.rol)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <InfoUsuario
                    icono={Mail}
                    titulo="Correo"
                    valor={item.correo || '—'}
                  />

                  <InfoUsuario
                    icono={Store}
                    titulo="Sucursales"
                    valor={
                      (item.sucursales || []).length > 0
                        ? item.sucursales
                            .map((sucursal) => sucursal.nombre)
                            .join(', ')
                        : 'Sin sucursal'
                    }
                  />
                </div>

                <p className="mt-3 text-[10px] font-semibold text-[#AA939B]">
                  Alta: {formatoFecha(item.fecha_creacion)}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEditar(item)}
                    disabled={!puedeGestionarUsuario(item)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FBEAF0] px-4 py-3 font-black text-[#A84E6C] transition hover:bg-[#F5DDE5] disabled:cursor-not-allowed disabled:opacity-35"
                    title={puedeGestionarUsuario(item) ? 'Editar' : 'Solo ROOT puede editar esta cuenta'}
                  >
                    <Pencil size={17} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => desactivarUsuario(item)}
                    disabled={
                      !puedeGestionarUsuario(item) ||
                      Number(item.id_usuario) ===
                        Number(usuarioSesion?.id_usuario)
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <Trash2 size={17} />
                    Desactivar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {/* DESKTOP */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1150px]">
            <thead className="border-b border-[#F1E4E8] bg-[#FFFAFB]">
              <tr>
                <Th>Usuario</Th>
                <Th>Correo</Th>
                <Th>Rol</Th>
                <Th>Sucursales</Th>
                <Th align="center">Estado</Th>
                <Th>Fecha alta</Th>
                <Th align="center">Acciones</Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#F5EAED]">
              {cargando ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center"
                  >
                    <LoadingRow texto="Cargando usuarios..." />
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center font-semibold text-[#8A757D]"
                  >
                    No hay usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuarios.map((item) => (
                  <tr
                    key={item.id_usuario}
                    className="transition hover:bg-[#FFFAFB]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#AD526F]">
                          <User size={20} />
                        </div>

                        <div className="min-w-0">
                          <p className="font-black text-[#43353A]">
                            {item.nombre}
                          </p>

                          <p className="mt-1 text-xs font-semibold text-[#9A858D]">
                            @{item.usuario}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#766168]">
                      <div className="flex items-center gap-2">
                        <Mail
                          size={15}
                          className="shrink-0 text-[#B49FA7]"
                        />

                        <span className="max-w-[230px] truncate">
                          {item.correo || '—'}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${getRolStyle(
                          item.rol
                        )}`}
                      >
                        {nombreRolLegible(item.rol)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex max-w-[340px] flex-wrap gap-2">
                        {(item.sucursales || []).length === 0 ? (
                          <span className="text-sm font-semibold text-[#AA939B]">
                            Sin sucursal
                          </span>
                        ) : (
                          item.sucursales.map((sucursal) => (
                            <span
                              key={`${item.id_usuario}-${sucursal.id_sucursal}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[#F8EDF1] px-3 py-1.5 text-xs font-black text-[#66535A]"
                            >
                              <Store size={13} />
                              {sucursal.nombre}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-center">
                      <EstadoUsuario activo={item.activo} />
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#766168]">
                      {formatoFecha(item.fecha_creacion)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditar(item)}
                          disabled={!puedeGestionarUsuario(item)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FBEAF0] text-[#A84E6C] transition hover:bg-[#F5DDE5] disabled:cursor-not-allowed disabled:opacity-35"
                          title={puedeGestionarUsuario(item) ? 'Editar' : 'Solo ROOT puede editar esta cuenta'}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => desactivarUsuario(item)}
                          disabled={
                            !puedeGestionarUsuario(item) ||
                            Number(item.id_usuario) ===
                              Number(usuarioSesion?.id_usuario)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35"
                          title={
                            Number(item.id_usuario) ===
                            Number(usuarioSesion?.id_usuario)
                              ? 'No puedes desactivar tu propio usuario'
                              : 'Desactivar'
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          MODAL
      ===================================================== */}

      {modalAbierto && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#33272C]/55 p-3 backdrop-blur-sm sm:p-5">
          <div
            className="absolute inset-0"
            onClick={cerrarModal}
          />

          <div className="relative my-auto flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_30px_90px_rgba(69,43,53,0.22)]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#F2E5E9] px-5 py-5 sm:px-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF2F5] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#AD526F]">
                  <Shield size={12} />
                  {modoEdicion ? 'Edición' : 'Nuevo acceso'}
                </div>

                <h2 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#3C3034] sm:text-2xl">
                  {modoEdicion
                    ? 'Editar usuario'
                    : 'Nuevo usuario'}
                </h2>

                <p className="mt-1 text-sm leading-relaxed text-[#8A757D]">
                  Define datos de acceso, rol y sucursales asignadas.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModal}
                disabled={guardando}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8EDF1] text-[#8A6572] transition hover:bg-[#F2DDE4] disabled:opacity-60"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={guardarUsuario}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  {/* NOMBRE */}
                  <Campo label="Nombre completo *">
                    <div className="relative">
                      <User
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Escribe el nombre completo..."
                      />
                    </div>
                  </Campo>

                  {/* USUARIO */}
                  <Campo label="Usuario de acceso *">
                    <div className="relative">
                      <User
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        name="usuario"
                        value={form.usuario}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="Ej. caja.centro"
                        autoComplete="username"
                      />
                    </div>
                  </Campo>

                  {/* CORREO */}
                  <Campo label="Correo">
                    <div className="relative">
                      <Mail
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        type="email"
                        name="correo"
                        value={form.correo}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                        placeholder="usuario@correo.com"
                      />
                    </div>
                  </Campo>

                  {/* PASSWORD */}
                  <Campo
                    label={`Contraseña ${
                      modoEdicion ? '(opcional)' : '*'
                    }`}
                  >
                    <div className="relative">
                      <Lock
                        className={iconInputClass}
                        size={18}
                      />

                      <input
                        type={
                          mostrarPassword
                            ? 'text'
                            : 'password'
                        }
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        className={`${inputClass} pl-11 pr-12`}
                        placeholder={
                          modoEdicion
                            ? 'Dejar vacío para conservarla'
                            : 'Mínimo 6 caracteres'
                        }
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setMostrarPassword((prev) => !prev)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A99199] transition hover:text-[#66535A]"
                        aria-label={
                          mostrarPassword
                            ? 'Ocultar contraseña'
                            : 'Mostrar contraseña'
                        }
                      >
                        {mostrarPassword ? (
                          <EyeOff size={19} />
                        ) : (
                          <Eye size={19} />
                        )}
                      </button>
                    </div>
                  </Campo>

                  {/* ROL */}
                  <Campo label="Rol *">
                    <div className="relative">
                      <Shield
                        className={iconInputClass}
                        size={18}
                      />

                      <select
                        name="id_rol"
                        value={form.id_rol}
                        onChange={handleChange}
                        className={`${inputClass} pl-11`}
                      >
                        <option value="">
                          Selecciona rol
                        </option>

                        {rolesPermitidos.map((rol) => (
                          <option
                            key={rol.id_rol}
                            value={rol.id_rol}
                          >
                            {nombreRolLegible(rol.nombre)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </Campo>

                  {/* ESTADO */}
                  {modoEdicion && (
                    <Campo label="Estado">
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-[1.3rem] border p-3.5 transition ${
                          form.activo
                            ? 'border-[#E7BAC8] bg-[#FFF1F5]'
                            : 'border-[#EEE2E6] bg-[#FFFCFD]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="activo"
                          checked={form.activo}
                          onChange={handleChange}
                          className="sr-only"
                        />

                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            form.activo
                              ? 'bg-[#AD526F] text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {form.activo ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <CircleOff size={17} />
                          )}
                        </span>

                        <span>
                          <span className="block text-sm font-black text-[#59464D]">
                            Usuario activo
                          </span>

                          <span className="mt-0.5 block text-xs text-[#9B858D]">
                            Puede iniciar sesión en el sistema.
                          </span>
                        </span>
                      </label>
                    </Campo>
                  )}

                  {/* SUCURSALES */}
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <label className="block text-sm font-black text-[#5D4A51]">
                          Sucursales asignadas *
                        </label>

                        <p className="mt-1 text-xs leading-relaxed text-[#9B858D]">
                          Selecciona las sucursales donde podrá operar este usuario.
                        </p>
                      </div>

                      <span className="text-xs font-black text-[#AD526F]">
                        {form.sucursales.length} seleccionada(s)
                      </span>
                    </div>

                    {sucursales.length === 0 ? (
                      <div className="mt-3 rounded-[1.3rem] border border-dashed border-[#E7D7DC] bg-[#FFFAFB] p-5 text-center text-sm font-semibold text-[#9A858D]">
                        No hay sucursales activas disponibles.
                      </div>
                    ) : (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sucursales.map((sucursal) => {
                          const checked =
                            form.sucursales.includes(
                              Number(sucursal.id_sucursal)
                            );

                          return (
                            <label
                              key={sucursal.id_sucursal}
                              className={`cursor-pointer rounded-[1.3rem] border p-4 transition ${
                                checked
                                  ? 'border-[#D987A3] bg-[#FFF2F5] shadow-[0_8px_20px_rgba(173,82,111,0.08)]'
                                  : 'border-[#EEDFE4] bg-white hover:border-[#E1A9BA] hover:bg-[#FFFAFB]'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    toggleSucursal(
                                      sucursal.id_sucursal
                                    )
                                  }
                                  className="mt-0.5 h-5 w-5 accent-[#AD526F]"
                                />

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Store
                                      size={15}
                                      className={
                                        checked
                                          ? 'text-[#AD526F]'
                                          : 'text-[#A99199]'
                                      }
                                    />

                                    <p className="truncate font-black text-[#4C3D42]">
                                      {sucursal.nombre}
                                    </p>
                                  </div>

                                  <p className="mt-1 text-xs font-semibold text-[#9B858D]">
                                    {sucursal.clave || 'Sin clave'}
                                  </p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* INFORMACIÓN CONTRASEÑA */}
                  <div className="md:col-span-2">
                    <div className="flex items-start gap-3 rounded-[1.3rem] border border-[#F0E4E8] bg-[#FFFAFB] p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#AD526F]">
                        <KeyRound size={17} />
                      </div>

                      <div>
                        <p className="text-sm font-black text-[#59464D]">
                          Seguridad de acceso
                        </p>

                        <p className="mt-1 text-xs leading-relaxed text-[#9B858D]">
                          {modoEdicion
                            ? 'Deja la contraseña vacía si no deseas modificarla.'
                            : 'La contraseña debe contener al menos 6 caracteres.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#F3E7EA] px-5 py-5 sm:flex-row sm:justify-end sm:px-6">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="w-full rounded-2xl bg-[#F8EDF1] px-5 py-3 font-black text-[#80606B] transition hover:bg-[#F2DDE4] disabled:opacity-60 sm:w-auto"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#AD526F] px-5 py-3 font-black text-white shadow-[0_12px_28px_rgba(173,82,111,0.22)] transition hover:bg-[#8B3F5B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {guardando ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={18} />
                  )}

                  {guardando
                    ? 'Guardando...'
                    : modoEdicion
                      ? 'Actualizar usuario'
                      : 'Guardar usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>
        {`
          .swal2-container {
            z-index: 20000 !important;
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
    </div>
  );
}

/* =========================================================
   COMPONENTES VISUALES
========================================================= */

const inputClass =
  'w-full rounded-2xl border border-[#EEDFE4] bg-[#FFFBFC] px-4 py-3 text-sm font-semibold text-[#4B3C42] outline-none transition placeholder:font-normal placeholder:text-[#B5A1A8] focus:border-[#D58AA2] focus:bg-white focus:ring-4 focus:ring-[#FBEAF0]';

const iconInputClass =
  'absolute left-4 top-1/2 -translate-y-1/2 text-[#B5A1A8]';

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

function UsuarioKpi({
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

      <p className="mt-1 text-3xl font-black tracking-[-0.035em] text-[#3A2F33]">
        {valor}
      </p>

      <p className="mt-2 text-[11px] font-semibold text-[#AA939B]">
        {detalle}
      </p>
    </div>
  );
}

function EstadoUsuario({
  activo,
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
        esActivo(activo)
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500'
      }`}
    >
      {esActivo(activo) ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function InfoUsuario({
  icono: Icono,
  titulo,
  valor,
}) {
  return (
    <div className="rounded-[1.15rem] border border-[#F2E7EA] bg-white p-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#A18A92]">
        <Icono size={13} />
        {titulo}
      </p>

      <p className="mt-2 break-words text-sm font-semibold leading-relaxed text-[#67545B]">
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

function LoadingRow({
  texto,
}) {
  return (
    <div className="flex items-center justify-center gap-2 font-semibold text-[#8A757D]">
      <Loader2
        size={18}
        className="animate-spin text-[#AD526F]"
      />
      {texto}
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
