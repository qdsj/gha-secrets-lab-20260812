# GitHub Actions Secrets Lab

Public, reproducible experiment for observing how GitHub Actions makes repository and environment secrets available across trusted events and fork pull requests.

The probe never prints a secret value. It records only whether a value is present, its length, its SHA-256 digest, and whether that digest matches the non-secret expected digest.

## Matrix

- Events: `push`, `workflow_dispatch`, same-repository `pull_request`, fork `pull_request`
- Runners: `ubuntu-latest`, `windows-latest`
- Scopes: repository secrets, `staging` environment secrets
- Transport: step-level `env`, single-quoted CLI arguments through `npm run ... --`
- Boundaries: undefined secret, common shell-special characters, apostrophe in a single-quoted CLI argument

## Results

Experiment results and run links will be added after all scenarios complete.

