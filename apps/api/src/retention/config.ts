/**
 * Retention profile configuration and validation.
 *
 * Implements the deployment-owned retention profile required by docs/06-security-operations.md section 19.
 * Production deployments require all eight retention classes explicitly configured;
 * unset placeholders fail the production-readiness check.
 */

import type { RetentionClass, RetentionClassConfig, RetentionProfile } from '@workledger/contracts';

/**
 * Default retention profile placeholders (INVALID FOR PRODUCTION).
 *
 * Production deployments MUST override these with deployment-specific values.
 * These placeholders are intentionally invalid to force explicit configuration.
 */
export const DEFAULT_RETENTION_PROFILE: RetentionProfile = {
  version: '1.0',
  effectiveDate: new Date('2026-01-01T00:00:00Z').toISOString(),
  classes: [
    {
      retentionClass: 'AUTH_TRANSIENT',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'PURGE',
      applyToBackups: false,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Expired sessions, reset/invitation grants, rate-limit state',
    },
    {
      retentionClass: 'ACCOUNT_SECURITY',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'RETAIN',
      applyToBackups: true,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Account/security metadata, credential changes, role assignments',
    },
    {
      retentionClass: 'OPERATIONAL_LOGS',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'PURGE',
      applyToBackups: false,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Application logs, diagnostics, health checks',
    },
    {
      retentionClass: 'NOTIFICATIONS',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'PURGE',
      applyToBackups: false,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Notification delivery attempts and email-delivery state',
    },
    {
      retentionClass: 'SENSITIVE_HR',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'MINIMIZE',
      applyToBackups: true,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Sickness classification, absence notes, decision reasons, entitlement details',
    },
    {
      retentionClass: 'DOMAIN_HISTORY',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'MINIMIZE',
      applyToBackups: true,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Punches, decisions, ledgers, approved snapshots, adjustments, domain audit history',
    },
    {
      retentionClass: 'TECHNICAL_AUDIT',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'PURGE',
      applyToBackups: false,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Security/technical audit evidence, access logs',
    },
    {
      retentionClass: 'DATABASE_BACKUPS',
      durationDays: null, // PLACEHOLDER - must be set
      behavior: 'PURGE',
      applyToBackups: true,
      operator: 'PLACEHOLDER',
      jurisdictionOwner: 'PLACEHOLDER',
      notes: 'Encrypted database backup copies and manifests',
    },
  ],
};

/**
 * Validation result for a retention profile.
 */
export interface RetentionProfileValidation {
  readonly valid: boolean;
  readonly productionReady: boolean;
  readonly issues: readonly string[];
}

/**
 * Validate a retention profile for completeness and production readiness.
 */
export function validateRetentionProfile(
  profile: RetentionProfile,
  environment: 'development' | 'test' | 'production',
): RetentionProfileValidation {
  const issues: string[] = [];

  if (profile.version !== '1.0') {
    issues.push(`Retention profile version must be 1.0, got ${profile.version}`);
  }

  if (profile.classes.length !== 8) {
    issues.push(`Retention profile must define all 8 classes, got ${profile.classes.length}`);
    return { valid: false, productionReady: false, issues: Object.freeze(issues) };
  }

  const expectedClasses: readonly RetentionClass[] = [
    'AUTH_TRANSIENT',
    'ACCOUNT_SECURITY',
    'OPERATIONAL_LOGS',
    'NOTIFICATIONS',
    'SENSITIVE_HR',
    'DOMAIN_HISTORY',
    'TECHNICAL_AUDIT',
    'DATABASE_BACKUPS',
  ];

  const foundClasses = new Set(profile.classes.map((c) => c.retentionClass));
  for (const expected of expectedClasses) {
    if (!foundClasses.has(expected)) {
      issues.push(`Missing required retention class: ${expected}`);
    }
  }

  let hasPlaceholders = false;

  for (const classConfig of profile.classes) {
    if (classConfig.durationDays === null) {
      issues.push(
        `Retention class ${classConfig.retentionClass} has null durationDays (must be explicit)`,
      );
      hasPlaceholders = true;
    }

    if (classConfig.operator === 'PLACEHOLDER' || classConfig.jurisdictionOwner === 'PLACEHOLDER') {
      issues.push(
        `Retention class ${classConfig.retentionClass} has placeholder operator or jurisdiction owner`,
      );
      hasPlaceholders = true;
    }

    if (classConfig.durationDays !== null && classConfig.durationDays < 0) {
      issues.push(`Retention class ${classConfig.retentionClass} has negative durationDays`);
    }
  }

  const productionReady = environment !== 'production' || !hasPlaceholders;

  if (environment === 'production' && hasPlaceholders) {
    issues.push(
      'Production deployment requires all retention classes explicitly configured without placeholders',
    );
  }

  return {
    valid: issues.length === 0,
    productionReady,
    issues: Object.freeze(issues),
  };
}

/**
 * Get the retention configuration for a specific class.
 */
export function getRetentionConfig(
  profile: RetentionProfile,
  retentionClass: RetentionClass,
): RetentionClassConfig | null {
  return profile.classes.find((c) => c.retentionClass === retentionClass) ?? null;
}

/**
 * Calculate the cutoff date for a retention class.
 * Records older than this date are eligible for purge/minimization.
 */
export function calculateRetentionCutoff(config: RetentionClassConfig, now: Date): Date | null {
  if (config.durationDays === null || config.behavior === 'RETAIN') {
    return null;
  }

  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - config.durationDays);
  return cutoff;
}
