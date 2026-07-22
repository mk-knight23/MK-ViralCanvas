# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security reports. Instead:

- Open a GitHub security advisory: <https://github.com/mk-knight23/MK-ViralCanvas/security/advisories/new>
- Or email the maintainer via the contact on <https://www.mkazi.live>

Expect an initial acknowledgment within a few days. This is an open-source solo-maintained project — response times reflect that.

## Scope

Reports in scope:

- Cross-site scripting (XSS) in the deployed app.
- Server-side request forgery (SSRF) in any serverless function.
- Injection in any serverless function that reaches a third-party API.
- Information disclosure of environment variables or user data.
- Auth or authorization bugs (there is no user auth in this app, so this generally means unexpected privileged endpoints).
- Dependency vulnerabilities in packages we actually import at runtime.

Out of scope:

- Missing rate limits on public endpoints that do no harm.
- Denial-of-service reports that require gigabyte-scale traffic.
- Reports against third-party APIs (TheMealDB, Imgflip, search providers) — please report to those vendors.

## Guarantees

- No secrets are hardcoded in source; all secrets come from environment variables.
- Serverless functions have request timeouts and validate query parameters before forwarding to upstream services.
- Client input length is capped before search queries are proxied.

## Dependency policy

Dependencies are added deliberately. `npm audit --production` is run before releases; high-severity findings block a release until patched or the affected dependency is removed.
