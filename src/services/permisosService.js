import axios from 'axios';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:3001/api'
).replace(/\/$/, '');


const obtenerHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
};


/**
 * GET /api/permisos
 * Obtiene todos los permisos agrupados por rol.
 */
export const obtenerPermisos = async () => {
  const { data } = await axios.get(
    `${API_URL}/permisos`,
    obtenerHeaders()
  );

  return data;
};


/**
 * GET /api/permisos/modulos
 * Obtiene todos los módulos disponibles.
 */
export const obtenerModulos = async () => {
  const { data } = await axios.get(
    `${API_URL}/permisos/modulos`,
    obtenerHeaders()
  );

  return data;
};


/**
 * GET /api/permisos/configuracion/:rol
 * Obtiene todos los módulos indicando si están
 * permitidos o no para determinado rol.
 */
export const obtenerConfiguracionPermisos = async (rol) => {
  const { data } = await axios.get(
    `${API_URL}/permisos/configuracion/${rol}`,
    obtenerHeaders()
  );

  return data;
};


/**
 * GET /api/permisos/:rol
 * Obtiene únicamente los permisos habilitados.
 */
export const obtenerPermisosPorRol = async (rol) => {
  const { data } = await axios.get(
    `${API_URL}/permisos/${rol}`,
    obtenerHeaders()
  );

  return data;
};


/**
 * PUT /api/permisos/:rol
 * Actualiza los permisos de un rol.
 */
export const actualizarPermisosRol = async (
  rol,
  permisos
) => {
  const { data } = await axios.put(
    `${API_URL}/permisos/${rol}`,
    {
      permisos,
    },
    obtenerHeaders()
  );

  return data;
};