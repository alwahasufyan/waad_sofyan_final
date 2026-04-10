import axios from 'axios';
import authService from 'services/authService';

const API_BASE_URL = '/api/v1';
const SESSION_EXPIRED_EVENT = 'auth:session-expired';
const LOCAL_401_PATH_PREFIXES = [
  '/auth/login',
  '/auth/register',
  '/auth/session/login',
  '/auth/session/logout',
  '/auth/forgot-password',
  '/auth/token/forgot-password',
  '/auth/token/reset-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/resend-verification'
];

const normalizeInternalUrl = (url) => {
  if (!url || /^https?:\/\//i.test(url)) {
    return url;
  }

  if (url === '/api' || url === '/api/v1') {
    return '/';
  }

  if (url.startsWith('/api/v1/')) {
    return url.replace(/^\/api\/v1/, '');
  }

  if (url.startsWith('/api/')) {
    return url.replace(/^\/api/, '');
  }

  return url;
};

const isSameOriginRequest = (config) => {
  const requestUrl = config?.url || '';

  if (!requestUrl || !/^https?:\/\//i.test(requestUrl)) {
    return true;
  }

  try {
    return new URL(requestUrl).origin === window.location.origin;
  } catch {
    return false;
  }
};

const shouldHandleUnauthorizedGlobally = (error) => {
  if (error.response?.status !== 401 || !isSameOriginRequest(error.config || {})) {
    return false;
  }

  const normalizedUrl = normalizeInternalUrl(error.config?.url || '');
  return !LOCAL_401_PATH_PREFIXES.some((pathPrefix) => normalizedUrl.startsWith(pathPrefix));
};

const redirectToLogin = () => {
  if (window.location.pathname === '/login') {
    return;
  }

  const redirectUrl = `${window.location.origin}/login`;
  window.location.assign(redirectUrl);
};
const isFormDataPayload = (data) => typeof FormData !== 'undefined' && data instanceof FormData;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true
});

api.interceptors.request.use(
  (config) => {
    const nextConfig = {
      ...config,
      url: normalizeInternalUrl(config.url || '')
    };

    if (isFormDataPayload(nextConfig.data) && nextConfig.headers) {
      delete nextConfig.headers['Content-Type'];
      delete nextConfig.headers['content-type'];
    }

    if (isSameOriginRequest(nextConfig)) {
      const token = authService.getToken();

      if (token) {
        nextConfig.headers = nextConfig.headers || {};
        nextConfig.headers.Authorization = `Bearer ${token}`;
      }
    }

    return nextConfig;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (shouldHandleUnauthorizedGlobally(error)) {
      authService.clearToken();
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export const fetcher = async (args) => {
  const [url, config] = Array.isArray(args) ? args : [args];
  const response = await api.get(url, { ...config });
  return response.data;
};

export const fetcherPost = async (args) => {
  const [url, data, config] = Array.isArray(args) ? args : [args];
  const response =
    typeof config === 'undefined'
      ? await api.post(url, data)
      : await api.post(url, data, { ...config });
  return response.data;
};

export default api;