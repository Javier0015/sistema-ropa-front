import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

import {
  User,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  Store,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

const APP_NAME = 'Moda & Belleza';
const APP_DESCRIPTION = 'Sistema Retail';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    usuario: '',
    password: '',
  });

  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  // =========================================================
  // RUTA INICIAL SEGÚN ROL
  // =========================================================

  const obtenerRutaInicial = (usuarioLogin) => {
    const rol = String(usuarioLogin?.rol || '').toUpperCase();

    switch (rol) {
      case 'CAJERO':
      case 'VENDEDOR':
        return '/app/pos';

      case 'ALMACEN':
        return '/app/inventario';

      case 'SUPER_ADMIN':
      case 'ADMIN_SUCURSAL':
      default:
        return '/app/dashboard';
    }
  };

  // =========================================================
  // FORMULARIO
  // =========================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const usuario = form.usuario.trim();

    if (!usuario || !form.password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos obligatorios',
        text: 'Ingresa tu usuario y contraseña.',
        confirmButtonColor: '#B85F7D',
      });

      return;
    }

    try {
      setCargando(true);

      const respuesta = await login(usuario, form.password);

      if (!respuesta?.ok) {
        return;
      }

      const rutaInicial = obtenerRutaInicial(respuesta.usuario);

      await Swal.fire({
        icon: 'success',
        title: 'Bienvenido',
        text: `Hola, ${respuesta.usuario?.nombre || usuario}`,
        timer: 900,
        showConfirmButton: false,
      });

      navigate(rutaInicial, {
        replace: true,
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso denegado',
        text:
          error.response?.data?.mensaje ||
          'No se pudo iniciar sesión. Verifica tus datos.',
        confirmButtonColor: '#B85F7D',
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FFF9FA]">
      {/* =========================================================
          FONDO BASE
      ========================================================= */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Fondo radial principal */}
        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(circle_at_50%_40%,rgba(249,220,229,0.72)_0%,rgba(255,249,250,0.95)_42%,#FFF9FA_75%)]
          "
        />

        {/* Grid muy ligero */}
        <div
          className="
            absolute
            inset-0
            opacity-[0.28]
            bg-[linear-gradient(to_right,#F1E1E6_1px,transparent_1px),linear-gradient(to_bottom,#F1E1E6_1px,transparent_1px)]
            [background-size:48px_48px]
          "
        />

        {/* =======================================================
            ORBES GRANDES
        ======================================================= */}

        {/* Orb izquierda superior */}
        <div
          className="
            absolute
            -left-28
            top-[8%]
            h-[360px]
            w-[360px]
            rounded-full
            bg-[#F5CAD7]/30
            blur-[3px]
            animate-[orbFloatOne_12s_ease-in-out_infinite]
          "
        >
          <div
            className="
              absolute
              inset-[44px]
              rounded-full
              border
              border-[#E8B9C7]/45
            "
          />

          <div
            className="
              absolute
              inset-[92px]
              rounded-full
              border
              border-[#DFA7B8]/30
            "
          />

          <div
            className="
              absolute
              left-1/2
              top-1/2
              h-12
              w-12
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-[#D88AA2]/20
              shadow-[0_0_65px_rgba(216,138,162,0.45)]
            "
          />
        </div>

        {/* Orb derecha */}
        <div
          className="
            absolute
            -right-24
            top-[20%]
            h-[410px]
            w-[410px]
            rounded-full
            border
            border-[#EAC3CE]/35
            animate-[orbFloatTwo_14s_ease-in-out_infinite]
          "
        >
          <div
            className="
              absolute
              inset-[38px]
              rounded-full
              border
              border-[#F0D4DC]/60
            "
          />

          <div
            className="
              absolute
              inset-[94px]
              rounded-full
              bg-[#F7DCE4]/24
            "
          />

          <div
            className="
              absolute
              left-[13%]
              top-[28%]
              h-5
              w-5
              rounded-full
              bg-[#D98CA4]/50
              shadow-[0_0_28px_rgba(217,140,164,0.55)]
            "
          />

          <div
            className="
              absolute
              bottom-[17%]
              right-[23%]
              h-3
              w-3
              rounded-full
              bg-[#C96F8B]/45
              shadow-[0_0_24px_rgba(201,111,139,0.5)]
            "
          />
        </div>

        {/* Orb inferior izquierda */}
        <div
          className="
            absolute
            -bottom-52
            left-[10%]
            h-[430px]
            w-[430px]
            rounded-full
            border
            border-[#F0CDD6]/45
            animate-[orbFloatThree_15s_ease-in-out_infinite]
          "
        >
          <div
            className="
              absolute
              inset-[54px]
              rounded-full
              border
              border-[#F4DCE3]/75
            "
          />

          <div
            className="
              absolute
              inset-[120px]
              rounded-full
              bg-[#F5D4DE]/20
              shadow-[0_0_90px_rgba(232,180,197,0.25)]
            "
          />
        </div>

        {/* =======================================================
            ORBES PEQUEÑOS
        ======================================================= */}

        <div
          className="
            absolute
            left-[18%]
            top-[18%]
            h-20
            w-20
            rounded-full
            border
            border-[#DDA6B7]/40
            bg-white/25
            backdrop-blur-sm
            animate-[smallOrbOne_9s_ease-in-out_infinite]
          "
        >
          <div
            className="
              absolute
              left-1/2
              top-1/2
              h-3
              w-3
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              bg-[#C96F8B]/55
            "
          />
        </div>

        <div
          className="
            absolute
            bottom-[16%]
            right-[18%]
            h-28
            w-28
            rounded-full
            border
            border-[#E7B9C6]/45
            bg-[#FCEEF2]/25
            animate-[smallOrbTwo_11s_ease-in-out_infinite]
          "
        >
          <div
            className="
              absolute
              inset-5
              rounded-full
              border
              border-[#F0CDD7]/60
            "
          />
        </div>

        <div
          className="
            absolute
            right-[29%]
            top-[15%]
            h-10
            w-10
            rounded-full
            bg-[#E6B4C3]/20
            shadow-[0_0_50px_rgba(217,140,164,0.35)]
            animate-[smallOrbThree_8s_ease-in-out_infinite]
          "
        />

        <div
          className="
            absolute
            bottom-[23%]
            left-[29%]
            h-7
            w-7
            rounded-full
            border
            border-[#D58BA2]/40
            animate-[smallOrbFour_10s_ease-in-out_infinite]
          "
        />

        {/* =======================================================
            ANILLOS ORBITALES
        ======================================================= */}

        <div
          className="
            absolute
            left-[8%]
            top-[53%]
            hidden
            h-[170px]
            w-[170px]
            lg:block
          "
        >
          <div
            className="
              absolute
              inset-0
              rounded-full
              border
              border-[#E5B6C4]/35
              animate-[orbitSpin_22s_linear_infinite]
            "
          >
            <span
              className="
                absolute
                left-1/2
                top-[-5px]
                h-3
                w-3
                -translate-x-1/2
                rounded-full
                bg-[#CE7C96]/60
                shadow-[0_0_18px_rgba(206,124,150,0.45)]
              "
            />
          </div>

          <div
            className="
              absolute
              inset-[31px]
              rounded-full
              border
              border-dashed
              border-[#EDD1D9]/60
              animate-[orbitSpinReverse_18s_linear_infinite]
            "
          >
            <span
              className="
                absolute
                bottom-[5px]
                right-[4px]
                h-2
                w-2
                rounded-full
                bg-[#DFA6B7]/80
              "
            />
          </div>
        </div>

        <div
          className="
            absolute
            right-[8%]
            top-[58%]
            hidden
            h-[150px]
            w-[150px]
            lg:block
          "
        >
          <div
            className="
              absolute
              inset-0
              rounded-full
              border
              border-[#EAC4CF]/45
              animate-[orbitSpinReverse_26s_linear_infinite]
            "
          >
            <span
              className="
                absolute
                left-[-4px]
                top-1/2
                h-2.5
                w-2.5
                -translate-y-1/2
                rounded-full
                bg-[#C96F8B]/55
                shadow-[0_0_20px_rgba(201,111,139,0.45)]
              "
            />
          </div>
        </div>

        {/* =======================================================
            PARTÍCULAS
        ======================================================= */}

        <span className="particle particle-1" />
        <span className="particle particle-2" />
        <span className="particle particle-3" />
        <span className="particle particle-4" />
        <span className="particle particle-5" />
        <span className="particle particle-6" />
        <span className="particle particle-7" />
        <span className="particle particle-8" />
        <span className="particle particle-9" />
        <span className="particle particle-10" />

        {/* Luz central */}
        <div
          className="
            absolute
            left-1/2
            top-1/2
            h-[520px]
            w-[520px]
            -translate-x-1/2
            -translate-y-1/2
            rounded-full
            bg-white/70
            blur-[100px]
          "
        />
      </div>

      {/* =========================================================
          HEADER
      ========================================================= */}

      <header
        className="
          relative
          z-20
          mx-auto
          flex
          w-full
          max-w-[1500px]
          items-center
          justify-between
          px-5
          py-6
          sm:px-8
          lg:px-12
        "
      >
        {/* Marca 
        <div className="flex items-center gap-3">
          <div
            className="
              relative
              flex
              h-12
              w-12
              items-center
              justify-center
              overflow-hidden
              rounded-[1.05rem]
              bg-[#B85F7D]
              text-white
              shadow-[0_12px_28px_rgba(184,95,125,0.22)]
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
              size={22}
              strokeWidth={1.7}
              className="relative"
            />
          </div>

          <div>
            <p
              className="
                text-sm
                font-black
                tracking-[-0.015em]
                text-[#33292D]
              "
            >
              {APP_NAME}
            </p>

            <p
              className="
                mt-0.5
                text-[10px]
                font-bold
                uppercase
                tracking-[0.21em]
                text-[#A28891]
              "
            >
              {APP_DESCRIPTION}
            </p>
          </div>
        </div>
*/}

      </header>

      {/* =========================================================
          LOGIN
      ========================================================= */}

      <section
        className="
          relative
          z-10
          mx-auto
          flex
          min-h-[calc(100vh-145px)]
          w-full
          max-w-[1500px]
          items-center
          justify-center
          px-5
          pb-12
          sm:px-8
          lg:px-12
        "
      >
        <div
          className="
            relative
            w-full
            max-w-[470px]
            animate-[loginEnter_.7s_cubic-bezier(.22,1,.36,1)]
          "
        >
          {/* Halo exterior */}
          <div
            className="
              absolute
              -inset-10
              -z-10
              rounded-full
              bg-[#E8B4C5]/15
              blur-3xl
            "
          />

          {/* Anillo detrás de la card */}
          <div
            className="
              absolute
              left-1/2
              top-1/2
              -z-10
              hidden
              h-[590px]
              w-[590px]
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              border
              border-[#ECCAD4]/30
              lg:block
            "
          />

          <div
            className="
              absolute
              left-1/2
              top-1/2
              -z-10
              hidden
              h-[530px]
              w-[530px]
              -translate-x-1/2
              -translate-y-1/2
              rounded-full
              border
              border-dashed
              border-[#F0D7DE]/45
              lg:block
              animate-[orbitSpin_50s_linear_infinite]
            "
          />

          {/* =====================================================
              CARD
          ===================================================== */}

          <div
            className="
              relative
              overflow-hidden
              rounded-[2.6rem]
              border
              border-white/90
              bg-white/82
              p-7
              shadow-[0_32px_85px_rgba(102,63,76,0.14)]
              backdrop-blur-[28px]
              sm:p-9
            "
          >
            {/* Línea superior */}
            <div
              className="
                absolute
                left-1/2
                top-0
                h-[4px]
                w-28
                -translate-x-1/2
                rounded-b-full
                bg-[#CF7895]
              "
            />

            {/* Brillo interno */}
            <div
              className="
                pointer-events-none
                absolute
                -right-16
                -top-16
                h-48
                w-48
                rounded-full
                bg-[#FCECF1]/75
                blur-2xl
              "
            />

            {/* =================================================
                HEADER CARD
            ================================================= */}

            <div className="relative text-center">
              {/* Icono */}
              <div
                className="
                  relative
                  mx-auto
                  flex
                  h-[72px]
                  w-[72px]
                  items-center
                  justify-center
                  rounded-[1.6rem]
                  border
                  border-[#F5E2E8]
                  bg-[#FFF0F4]
                  text-[#B85F7D]
                "
              >
                <Store
                  size={30}
                  strokeWidth={1.65}
                />

                <span
                  className="
                    absolute
                    -right-2
                    -top-2
                    flex
                    h-7
                    w-7
                    items-center
                    justify-center
                    rounded-full
                    border-4
                    border-white
                    bg-[#D888A3]
                    text-white
                  "
                >
                  <Sparkles size={12} />
                </span>
              </div>

              {/* Badge
              <div
                className="
                  mt-6
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-[#FFF2F5]
                  px-3.5
                  py-2
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-[#B85F7D]
                "
              >
                <Sparkles size={13} />
                Bienvenido
              </div>
 */}
              <h1
                className="
                  mt-5
                  text-[2.2rem]
                  font-black
                  tracking-[-0.045em]
                  text-[#2F272A]
                  sm:text-[2.45rem]
                "
              >
                Inicia sesión
              </h1>

              <p
                className="
                  mx-auto
                  mt-2.5
                  max-w-[310px]
                  text-sm
                  leading-relaxed
                  text-[#8B777E]
                "
              >
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </div>

            {/* =================================================
                FORMULARIO
            ================================================= */}

            <form
              onSubmit={handleSubmit}
              className="relative mt-8 space-y-5"
            >
              {/* USUARIO */}
              <div>
                <label
                  htmlFor="usuario"
                  className="
                    mb-2
                    ml-1
                    block
                    text-[11px]
                    font-black
                    uppercase
                    tracking-[0.1em]
                    text-[#6E5961]
                  "
                >
                  Usuario
                </label>

                <div className="group relative">
                  <User
                    size={19}
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-[#B5A1A8]
                      transition-colors
                      duration-200
                      group-focus-within:text-[#B85F7D]
                    "
                  />

                  <input
                    id="usuario"
                    type="text"
                    name="usuario"
                    value={form.usuario}
                    onChange={handleChange}
                    autoComplete="username"
                    placeholder="Ingresa tu usuario"
                    disabled={cargando}
                    className="
                      w-full
                      rounded-[1.2rem]
                      border
                      border-[#EEDFE4]
                      bg-[#FFFBFC]/90
                      py-4
                      pl-12
                      pr-4
                      text-sm
                      font-medium
                      text-[#392F33]
                      outline-none
                      transition-all
                      duration-200
                      placeholder:font-normal
                      placeholder:text-[#BBA9AF]
                      hover:border-[#E0C3CD]
                      focus:border-[#D488A0]
                      focus:bg-white
                      focus:ring-4
                      focus:ring-[#FBEAF0]
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="
                    mb-2
                    ml-1
                    block
                    text-[11px]
                    font-black
                    uppercase
                    tracking-[0.1em]
                    text-[#6E5961]
                  "
                >
                  Contraseña
                </label>

                <div className="group relative">
                  <Lock
                    size={19}
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-[#B5A1A8]
                      transition-colors
                      duration-200
                      group-focus-within:text-[#B85F7D]
                    "
                  />

                  <input
                    id="password"
                    type={mostrarPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    disabled={cargando}
                    className="
                      w-full
                      rounded-[1.2rem]
                      border
                      border-[#EEDFE4]
                      bg-[#FFFBFC]/90
                      py-4
                      pl-12
                      pr-12
                      text-sm
                      font-medium
                      text-[#392F33]
                      outline-none
                      transition-all
                      duration-200
                      placeholder:font-normal
                      placeholder:text-[#BBA9AF]
                      hover:border-[#E0C3CD]
                      focus:border-[#D488A0]
                      focus:bg-white
                      focus:ring-4
                      focus:ring-[#FBEAF0]
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setMostrarPassword((prev) => !prev)
                    }
                    disabled={cargando}
                    aria-label={
                      mostrarPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    title={
                      mostrarPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    className="
                      absolute
                      right-3
                      top-1/2
                      flex
                      h-9
                      w-9
                      -translate-y-1/2
                      cursor-pointer
                      items-center
                      justify-center
                      rounded-xl
                      text-[#A68D96]
                      outline-none
                      transition
                      hover:bg-[#FFF0F4]
                      hover:text-[#B85F7D]
                      focus-visible:ring-2
                      focus-visible:ring-[#D98CA4]
                      disabled:cursor-not-allowed
                    "
                  >
                    {mostrarPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* =================================================
                  BOTÓN
              ================================================= */}

              <button
                type="submit"
                disabled={cargando}
                className="
                  group
                  relative
                  mt-1
                  flex
                  w-full
                  cursor-pointer
                  items-center
                  justify-center
                  gap-2
                  overflow-hidden
                  rounded-[1.2rem]
                  bg-[#B85F7D]
                  py-4
                  text-sm
                  font-black
                  text-white
                  shadow-[0_15px_32px_rgba(184,95,125,0.26)]
                  outline-none
                  transition-all
                  duration-300
                  hover:-translate-y-0.5
                  hover:bg-[#A95270]
                  hover:shadow-[0_19px_38px_rgba(184,95,125,0.31)]
                  focus-visible:ring-4
                  focus-visible:ring-[#F0CBD6]
                  active:translate-y-0
                  active:scale-[0.99]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {/* brillo */}
                <span
                  className="
                    absolute
                    inset-0
                    -translate-x-[120%]
                    skew-x-12
                    bg-white/15
                    transition-transform
                    duration-700
                    group-hover:translate-x-[120%]
                  "
                />

                <span className="relative flex items-center gap-2">
                  {cargando ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Ingresando...
                    </>
                  ) : (
                    <>
                      Iniciar sesión

                      <ArrowRight
                        size={18}
                        className="
                          transition-transform
                          duration-300
                          group-hover:translate-x-1
                        "
                      />
                    </>
                  )}
                </span>
              </button>
            </form>

           
          </div>
        </div>
      </section>

      {/* =========================================================
          ANIMACIONES Y PARTÍCULAS
      ========================================================= */}

      <style>
        {`
          @keyframes loginEnter {
            from {
              opacity: 0;
              transform: translateY(22px) scale(.975);
            }

            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes orbFloatOne {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }

            50% {
              transform: translate(34px, -22px) scale(1.05);
            }
          }

          @keyframes orbFloatTwo {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }

            50% {
              transform: translate(-28px, 34px) scale(1.04);
            }
          }

          @keyframes orbFloatThree {
            0%, 100% {
              transform: translate(0, 0);
            }

            50% {
              transform: translate(40px, -28px);
            }
          }

          @keyframes smallOrbOne {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }

            50% {
              transform: translate(18px, -28px) scale(1.08);
            }
          }

          @keyframes smallOrbTwo {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }

            50% {
              transform: translate(-25px, -18px) scale(.94);
            }
          }

          @keyframes smallOrbThree {
            0%, 100% {
              transform: translate(0, 0);
            }

            50% {
              transform: translate(22px, 16px);
            }
          }

          @keyframes smallOrbFour {
            0%, 100% {
              transform: translate(0, 0);
            }

            50% {
              transform: translate(-16px, -20px);
            }
          }

          @keyframes orbitSpin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }

          @keyframes orbitSpinReverse {
            from {
              transform: rotate(360deg);
            }

            to {
              transform: rotate(0deg);
            }
          }

          @keyframes particleFloat {
            0%, 100% {
              transform: translate3d(0, 0, 0) scale(1);
              opacity: .25;
            }

            50% {
              transform: translate3d(10px, -22px, 0) scale(1.35);
              opacity: .8;
            }
          }

          .particle {
            position: absolute;
            width: 5px;
            height: 5px;
            border-radius: 999px;
            background: rgba(190, 103, 132, .55);
            box-shadow: 0 0 14px rgba(190, 103, 132, .28);
            animation: particleFloat 7s ease-in-out infinite;
          }

          .particle-1 {
            left: 12%;
            top: 25%;
            animation-delay: -2s;
          }

          .particle-2 {
            left: 23%;
            top: 68%;
            width: 4px;
            height: 4px;
            animation-duration: 9s;
          }

          .particle-3 {
            left: 34%;
            top: 18%;
            width: 3px;
            height: 3px;
            animation-delay: -4s;
          }

          .particle-4 {
            right: 14%;
            top: 25%;
            animation-duration: 8s;
          }

          .particle-5 {
            right: 25%;
            bottom: 17%;
            width: 3px;
            height: 3px;
            animation-delay: -3s;
          }

          .particle-6 {
            left: 15%;
            bottom: 12%;
            width: 6px;
            height: 6px;
            opacity: .4;
            animation-duration: 10s;
          }

          .particle-7 {
            right: 38%;
            top: 12%;
            animation-delay: -1s;
          }

          .particle-8 {
            right: 9%;
            bottom: 32%;
            width: 4px;
            height: 4px;
            animation-duration: 11s;
          }

          .particle-9 {
            left: 39%;
            bottom: 8%;
            width: 3px;
            height: 3px;
            animation-delay: -5s;
          }

          .particle-10 {
            right: 31%;
            top: 42%;
            width: 3px;
            height: 3px;
            animation-duration: 12s;
          }

          @media (prefers-reduced-motion: reduce) {
            *,
            *::before,
            *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
        `}
      </style>
    </main>
  );
} 