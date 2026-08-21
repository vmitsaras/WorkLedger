import { z } from 'zod';

import { createSuccessEnvelopeSchema } from './api.js';

const identityAssetPathSchema = z
  .string()
  .min(1)
  .max(240)
  .regex(/^\/identity\/[A-Za-z0-9][A-Za-z0-9._/-]*$/u)
  .refine(
    (value) =>
      !value.includes('//') &&
      !value.split('/').some((segment) => segment === '.' || segment === '..'),
  );

export const companyIdentityAccentSchema = z.string().regex(/^#[0-9a-f]{6}$/u);
export const companyIdentityLogoPathSchema = identityAssetPathSchema.refine((value) =>
  /\.(?:avif|png|svg|webp)$/u.test(value),
);
export const companyIdentityFaviconPathSchema = identityAssetPathSchema.refine((value) =>
  /\.(?:ico|png|svg)$/u.test(value),
);

export const companyIdentitySchema = z.strictObject({
  accentColor: companyIdentityAccentSchema,
  faviconPath: companyIdentityFaviconPathSchema.nullable(),
  logoPath: companyIdentityLogoPathSchema.nullable(),
  organizationName: z.string().min(1).max(80),
});

export const companyIdentityEnvelopeSchema = createSuccessEnvelopeSchema(companyIdentitySchema);

export const DEFAULT_COMPANY_IDENTITY = Object.freeze({
  accentColor: '#075985',
  faviconPath: null,
  logoPath: null,
  organizationName: 'WorkLedger',
}) satisfies CompanyIdentity;

export type CompanyIdentity = z.infer<typeof companyIdentitySchema>;
