# Security Policy

## Supported versions

WorkLedger has no released or supported version. The repository is in its foundation phase and does
not yet contain a complete application, authentication, product database schema, production
deployment, or production security evidence.

| Version or branch | Supported |
|---|---|
| `main` and development snapshots | No; development and security review only |
| Published releases | None exist |

Security reports about repository code, configuration, dependencies, or documented deployment
assumptions are still welcome. This policy does not promise a patch, response time, operational
support, or suitability for production use.

## Report a vulnerability privately

Use [GitHub Private Vulnerability Reporting](https://github.com/vmitsaras/WorkLedger/security/advisories/new).
Do not disclose a suspected vulnerability through a public issue, discussion, pull request, commit,
or social post.

Include only the information needed to investigate:

- the affected commit, file, component, or configuration;
- the vulnerability type and realistic impact;
- concise reproduction steps or a minimal proof of concept;
- relevant preconditions and whether the issue affects only a development surface;
- possible mitigation or remediation, if known.

Do not include live credentials, tokens, employee records, sickness or absence information,
production database contents, private keys, or unrelated personal data. Use synthetic and redacted
examples. If sensitive material was exposed during testing, describe the type and scope without
copying it into the report.

GitHub's private advisory thread is the communication and acknowledgement record for the report.
The maintainer may request clarification, assess whether the finding belongs to WorkLedger or an
upstream dependency, and coordinate a fix or disclosure there. Because the project has no supported
release or security-response team, no acknowledgement or remediation deadline is guaranteed.

## Coordinated disclosure

Please allow the maintainer a reasonable opportunity to investigate before public disclosure. If a
finding is accepted, remediation and any advisory publication will be coordinated in the private
thread. Report vulnerabilities in third-party products to their maintainers as well; notify
WorkLedger privately when the repository's direct use or configuration makes that issue relevant.

The [MIT License](LICENSE) applies without warranty. This reporting route is a coordination aid and
does not turn the current development snapshot into a supported product.
