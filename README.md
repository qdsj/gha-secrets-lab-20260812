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

Experiment completed on 2026-08-12.

| Scenario | Ubuntu | Windows | Repository secrets | `staging` secrets | `env` vs CLI |
| --- | --- | --- | --- | --- | --- |
| `workflow_dispatch` | Pass | Pass | Present | Present, environment value wins | Same value |
| Configured `push main` | Pass | Pass | Present | Present, environment value wins | Same value |
| Same-repository PR | Pass | Pass | Present | Present, environment value wins | Same value |
| Fork PR | Pass | Pass | Empty | Empty | Both empty |
| Undefined secret | Pass | Pass | Empty | Empty | Both empty |

Run evidence:

- [`workflow_dispatch` run 31589879053](https://github.com/qdsj/gha-secrets-lab-20260812/actions/runs/31589879053)
- [same-repository PR #1](https://github.com/qdsj/gha-secrets-lab-20260812/pull/1) and [run 31590211549](https://github.com/qdsj/gha-secrets-lab-20260812/actions/runs/31590211549)
- [fork PR #2](https://github.com/qdsj/gha-secrets-lab-20260812/pull/2) and [run 31590281358](https://github.com/qdsj/gha-secrets-lab-20260812/actions/runs/31590281358)
- [configured `push main` run 31590451479](https://github.com/qdsj/gha-secrets-lab-20260812/actions/runs/31590451479)
- [all-empty baseline run 31589535440](https://github.com/qdsj/gha-secrets-lab-20260812/actions/runs/31589535440), captured before the fake secrets were configured

## Conclusions

1. Step-level `env` does not consume or discard a GitHub Actions secret. For trusted events, `env` and a CLI argument receive identical bytes on both runner operating systems.
2. A `pull_request` workflow from a public fork receives neither repository secrets nor environment secrets. Interpolating the same expression into a CLI command still produces an empty string because the value was withheld before the shell started.
3. A job that references the `staging` environment receives the environment secret when it exists; it overrides the repository secret with the same name.
4. An unconfigured secret expands to an empty string. In command logs this appears as `''`; configured secrets are masked as `***`.
5. Common shell-special characters survived the tested single-quoted CLI path. A value containing an apostrophe broke the command on both Ubuntu and Windows, while the same value passed through `env` intact.
6. Passing a secret on the CLI exposes it to the runner's generated script and process argument list. Step-level `env` avoids quoting problems and is the safer transport when the event is allowed to receive secrets.

The downloaded logs were scanned for the known sentinel prefixes. No raw sentinel value was found; only lengths, hashes, match results, `***`, and empty-string markers were retained.
