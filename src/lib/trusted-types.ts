/**
 * Trusted Types setup for the `require-trusted-types-for 'script'` CSP
 * directive. Must be imported before React ever renders (see main.tsx) —
 * next-themes' ThemeProvider sets innerHTML on its very first mount.
 *
 * Registers a 'default' policy rather than only a narrowly-scoped named
 * one. This is Google's own documented real-world pattern for adopting
 * Trusted Types in an app with third-party dependencies you can't edit
 * (https://web.dev/articles/trusted-types#the_default_policy) — verified
 * necessary here, not a guess: without it, next-themes' internal FOUC-
 * prevention script (dangerouslySetInnerHTML deep in its own source, not
 * ours) throws on every single page load, confirmed via a real headless-
 * browser run against the production build before this was added.
 *
 * A pass-through default policy doesn't sanitize content — its real value
 * is (a) satisfying this exact third-party-library gap, and (b) blocking
 * any FUTURE unreviewed innerHTML/document.write call site from silently
 * working, since it forces every new one through this file for review
 * rather than through the raw native setter.
 */

const policy =
  typeof window !== "undefined" && window.trustedTypes
    ? window.trustedTypes.createPolicy("default", {
        createHTML: (input: string) => input,
        createScript: (input: string) => input,
        createScriptURL: (input: string) => input,
      })
    : null;

export function trustedHTML(html: string): string {
  return policy ? (policy.createHTML(html) as unknown as string) : html;
}
