import { axiosInstance } from "../lib/axios";

const preferenceService = {
  createPreference: async (data: any) => {
    const response = await axiosInstance.post("/preferences", data);
    return response.data;
  },
  getPreference: async () => {
    const response = await axiosInstance.get("/preferences");
    return response.data;
  },
  updatePreference: async (id: string, data: any) => {
    const response = await axiosInstance.put(`/preferences/${id}`, data);
    return response.data;
  },
  deletePreference: async (id: string) => {
    const response = await axiosInstance.delete(`/preferences/${id}`);
    return response.data;
  },
};

export default preferenceService;
