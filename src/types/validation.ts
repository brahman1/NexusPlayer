import { z } from 'zod';

const httpUrlSchema = z
  .url('Adresse invalide')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'Utilisez une adresse HTTP ou HTTPS',
  });

export const playlistNameSchema = z
  .string()
  .trim()
  .min(1, 'Le nom est obligatoire')
  .max(80, 'Le nom est trop long');

export const m3uUrlInputSchema = z.object({
  name: playlistNameSchema,
  url: httpUrlSchema,
});

export const xtreamInputSchema = z.object({
  name: playlistNameSchema,
  serverUrl: httpUrlSchema,
  username: z.string().trim().min(1, "L’identifiant est obligatoire"),
  password: z.string().min(1, 'Le mot de passe est obligatoire'),
});

export type M3uUrlInput = z.infer<typeof m3uUrlInputSchema>;
export type XtreamInput = z.infer<typeof xtreamInputSchema>;
