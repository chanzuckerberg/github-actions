# Bot commands

Comment on a pull request to drive the engine.

## `@terragrunt-bot apply-and-merge`

```text
@terragrunt-bot apply-and-merge [--times=N] [--refresh=true|false]
```

| Option | Default | Description |
| --- | --- | --- |
| `--times=N` | `1` | TODO |
| `--refresh` | `auto` | TODO |

### Preconditions

!!! todo
    List the checks performed before an apply runs (write access, approvals, code owners, up to date with base, no conflicts, non-draft).
    Source: `.github/actions/terragrunt-git-status/src/lib.ts`.

## `@terragrunt-bot unlock`

!!! todo
    Explain when to use it and what it clears.

## `@terragrunt-bot help`

!!! todo
    Describe the help response.
