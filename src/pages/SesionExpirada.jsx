import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export default function SesionExpirada() {
  const navigate = useNavigate();

  const volverLogin = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');

    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F7F2EE] text-[#2F272A]">
      <div className="min-h-screen grid lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative flex min-h-[52vh] flex-col justify-between overflow-hidden px-6 py-8 sm:px-10 lg:min-h-screen lg:px-14 lg:py-12 xl:px-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#E9BFCB]/45 blur-3xl" />
            <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-[#F1D9DF]/55 blur-3xl" />
            <div className="absolute right-[14%] top-[18%] h-28 w-28 rotate-12 rounded-[2rem] border border-[#DDB4C0]/40" />
            <div className="absolute bottom-[20%] left-[12%] h-20 w-20 -rotate-12 rounded-full border border-[#E7CAD2]/70" />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4">
           

            
          </div>

          <div className="relative z-10 my-12 max-w-4xl lg:my-0">
            <div className="flex items-end gap-4 sm:gap-6">
              <span className="text-[5.5rem] font-black leading-none tracking-[-0.08em] text-[#E6C7D0] sm:text-[8rem] lg:text-[10rem]">
                01
              </span>

              <div className="pb-2 sm:pb-4">
                <div className="mb-3 flex items-center gap-2 text-[#AD526F]">
                  <Clock3 size={20} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">
                    Tiempo de sesión agotado
                  </span>
                </div>

                <h1 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.04em] text-[#2F272A] sm:text-6xl lg:text-7xl">
                  Tu acceso
                  <span className="block text-[#AD526F]">terminó por seguridad.</span>
                </h1>
              </div>
            </div>

            <p className="mt-7 max-w-2xl text-base font-semibold leading-relaxed text-[#78686E] sm:text-lg">
              El sistema cerró la sesión después de un periodo de inactividad.
              Tus datos permanecen protegidos y puedes continuar iniciando sesión nuevamente.
            </p>
          </div>

          <div className="relative z-10 grid gap-3 sm:grid-cols-3">
            <div className="border-t border-[#DCCDD1] pt-4">

            </div>

            <div className="border-t border-[#DCCDD1] pt-4">
              
            </div>

            <div className="border-t border-[#DCCDD1] pt-4">
             
            </div>
          </div>
        </section>

        <section className="relative flex items-center bg-[#2F272A] px-5 py-10 sm:px-8 lg:min-h-screen lg:px-10 xl:px-14">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-[#AD526F]/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-[#6F4151]/20 blur-3xl" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-md">
            <div className="mb-7 flex items-center justify-between">
             


            </div>

            <div className="border-y border-white/10 py-8">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D1A7B4]">
                Continúa donde te quedaste
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight tracking-[-0.03em] text-white sm:text-4xl">
                Inicia sesión nuevamente
              </h2>

              <p className="mt-4 text-sm font-semibold leading-relaxed text-[#C8B8BE] sm:text-base">
                Al ingresar de nuevo recuperarás el acceso a tus módulos según tu rol y sucursal asignada.
              </p>
            </div>

            <div className="mt-7 space-y-3">
              

             <br />
             <br />
             <br />
            </div>

            <button
              type="button"
              onClick={volverLogin}
              className="group mt-8 flex w-full items-center justify-between rounded-2xl bg-[#AD526F] px-5 py-4 font-black text-white shadow-xl shadow-black/20 transition hover:bg-[#8B3F5B] active:scale-[0.99]"
            >
              <span>Volver al inicio de sesión</span>

              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 transition group-hover:translate-x-1">
                <ArrowRight size={20} />
              </span>
            </button>

           
          </div>
        </section>
      </div>
    </div>
  );
}