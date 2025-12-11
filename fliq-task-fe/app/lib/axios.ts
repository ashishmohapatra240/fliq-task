import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://api.fliq-task.ashishmohapatra.in",
  withCredentials: true,
  timeout: 30000,
});
