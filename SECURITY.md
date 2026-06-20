# Security Policy

## Secrets

Do not commit API keys, service tokens, private keys, `.env.local`, local logs, generated task data, or machine-specific backup manifests.

Use `.env.local.example` as the template for local configuration. Real credentials must stay in `.env.local` or in your deployment platform's secret manager.

## Reporting a Vulnerability

If you find a security issue, please open a private security advisory on GitHub or contact the maintainer privately. Do not post working credentials or exploit details in public issues.
