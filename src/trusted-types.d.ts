// Minimal ambient types for the Trusted Types API (window.trustedTypes).
// Not in this project's TS DOM lib version, and @types/trusted-types can't
// be installed here due to an unrelated pre-existing peer-dependency
// conflict (knip vs eslint-utils) — this covers only what
// src/lib/trusted-types.ts actually uses.
interface TrustedHTML {
  readonly __trustedHTMLBrand: unique symbol;
}

interface TrustedTypePolicy {
  createHTML(input: string): TrustedHTML;
}

interface TrustedTypePolicyOptions {
  createHTML?: (input: string) => string;
  createScript?: (input: string) => string;
  createScriptURL?: (input: string) => string;
}

interface TrustedTypePolicyFactory {
  createPolicy(name: string, options: TrustedTypePolicyOptions): TrustedTypePolicy;
}

interface Window {
  readonly trustedTypes?: TrustedTypePolicyFactory;
}
