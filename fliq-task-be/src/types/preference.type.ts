import { z } from "zod";

export const createPreferenceSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  dateTime: z.string(),
  phoneNumber: z.string().min(1),
  timeZone: z.string().optional(),
});

export type CreatePreferenceType = z.infer<typeof createPreferenceSchema>;

export const updatePreferenceSchema = z
  .object({
    name: z.string().min(1),
    email: z.email(),
    dateTime: z.string(),
    phoneNumber: z.string().min(1),
    timeZone: z.string().optional(),
  })
  .partial();

export type UpdatePreferenceType = z.infer<typeof updatePreferenceSchema>;
