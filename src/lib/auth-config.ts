export const herculesAuthority = import.meta.env
  .VITE_HERCULES_OIDC_AUTHORITY as string | undefined;

export const herculesClientId = import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID as
  | string
  | undefined;

const realAuthRequested = import.meta.env.VITE_ENABLE_REAL_AUTH === "true";

export const hasHerculesAuthConfig = Boolean(
  realAuthRequested && herculesAuthority && herculesClientId,
);
