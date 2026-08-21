import { useEffect, useLayoutEffect, useState } from 'react';

import {
  DEFAULT_COMPANY_IDENTITY,
  type CompanyIdentity,
  type SelfContext,
} from '@workledger/contracts';

const FALLBACK_FAVICON_PATH = '/workledger-favicon.svg';

export function companyIdentityFromOrganization(
  organization: SelfContext['organization'],
): CompanyIdentity {
  return Object.freeze({
    accentColor: organization.accentColor ?? DEFAULT_COMPANY_IDENTITY.accentColor,
    faviconPath: organization.faviconPath ?? null,
    logoPath: organization.logoPath ?? null,
    organizationName: organization.name,
  });
}

export function CompanyIdentityEffects({ identity }: Readonly<{ identity: CompanyIdentity }>) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const previousValue = root.style.getPropertyValue('--wl-identity-accent');
    const previousPriority = root.style.getPropertyPriority('--wl-identity-accent');
    root.style.setProperty('--wl-identity-accent', identity.accentColor);
    return () => {
      if (previousValue) {
        root.style.setProperty('--wl-identity-accent', previousValue, previousPriority);
      } else {
        root.style.removeProperty('--wl-identity-accent');
      }
    };
  }, [identity.accentColor]);

  useEffect(() => {
    let favicon = document.querySelector<HTMLLinkElement>('#workledger-favicon');
    const created = favicon === null;
    if (favicon === null) {
      favicon = document.createElement('link');
      favicon.id = 'workledger-favicon';
      favicon.rel = 'icon';
      document.head.append(favicon);
    }

    const useFallback = () => {
      favicon.href = FALLBACK_FAVICON_PATH;
      favicon.type = 'image/svg+xml';
    };
    favicon.addEventListener('error', useFallback);
    let faviconProbe: HTMLImageElement | undefined;
    if (identity.faviconPath === null) {
      useFallback();
    } else {
      favicon.href = identity.faviconPath;
      favicon.type = faviconType(identity.faviconPath);
      faviconProbe = new Image();
      faviconProbe.addEventListener('error', useFallback);
      faviconProbe.src = identity.faviconPath;
    }

    return () => {
      favicon.removeEventListener('error', useFallback);
      faviconProbe?.removeEventListener('error', useFallback);
      if (created) favicon.remove();
    };
  }, [identity.faviconPath]);

  return null;
}

export function CompanyIdentity({
  identity,
  presentation,
}: Readonly<{
  identity: CompanyIdentity;
  presentation: 'authentication' | 'shell';
}>) {
  const [failedLogoPath, setFailedLogoPath] = useState<string | null>(null);
  const hasConfiguredLogo = identity.logoPath !== null;
  const showsLogo = identity.logoPath !== null && failedLogoPath !== identity.logoPath;
  const dimensions =
    presentation === 'shell' ? { height: 36, width: 128 } : { height: 56, width: 192 };

  return (
    <span className={`wl-company-identity wl-company-identity-${presentation}`}>
      <span
        className={`wl-company-mark ${hasConfiguredLogo ? 'wl-company-mark-logo' : 'wl-company-mark-fallback'}`}
        aria-hidden="true"
      >
        {showsLogo ? (
          <img
            alt=""
            className="wl-company-logo"
            height={dimensions.height}
            onError={() => setFailedLogoPath(identity.logoPath)}
            src={identity.logoPath ?? undefined}
            width={dimensions.width}
          />
        ) : (
          <span className="wl-company-fallback-mark">
            {firstVisibleCharacter(identity.organizationName)}
          </span>
        )}
      </span>
      <span className="wl-company-names">
        <span className="wl-company-name">{identity.organizationName}</span>
        <span className="wl-product-name">WorkLedger</span>
      </span>
    </span>
  );
}

function firstVisibleCharacter(name: string): string {
  return [...name][0]?.toLocaleUpperCase('en-US') ?? 'W';
}

function faviconType(path: string): string {
  if (path.endsWith('.ico')) return 'image/x-icon';
  if (path.endsWith('.png')) return 'image/png';
  return 'image/svg+xml';
}
