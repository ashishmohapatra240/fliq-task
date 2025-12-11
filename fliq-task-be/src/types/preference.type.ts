import { z } from "zod";

export const createPreferenceSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  dateTime: z.string(),
  phoneNumber: z.string().min(1),
});

export type CreatePreferenceType = z.infer<typeof createPreferenceSchema>;

export const updatePreferenceSchema = z
  .object({
    name: z.string().min(1),
    email: z.email(),
    dateTime: z.string(),
    phoneNumber: z.string().min(1),
  })
  .partial();

export type UpdatePreferenceType = z.infer<typeof updatePreferenceSchema>;
