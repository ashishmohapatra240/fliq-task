"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import preferenceService from "../services/preference.service";

export const useCreatePreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => preferenceService.createPreference(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preference"] });
    },
  });
};

export const useGetPreference = () => {
  return useQuery({
    queryKey: ["preference"],
    queryFn: preferenceService.getPreference,
  });
};

export const useUpdatePreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // accept both id and data as a single payload to match tanstack signature
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      preferenceService.updatePreference(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preference"] });
    },
  });
};

export const useDeletePreference = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => preferenceService.deletePreference(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preference"] });
    },
  });
};
