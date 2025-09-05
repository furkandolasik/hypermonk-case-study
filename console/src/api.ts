import axios from 'axios';
import axiosRetry from 'axios-retry';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_INVOKE_URL,
});

axiosRetry(api, {
  retries: 2,
  retryDelay: (retryCount) => retryCount * 100,
});

export default api;
