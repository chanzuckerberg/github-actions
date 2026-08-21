# Changelog

## [0.6.1](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.6.0...terragrunt-git-status-v0.6.1) (2026-08-21)


### BugFixes

* **terragrunt-engine:** enforce the apply gate and merge when auto-merge is refused ([#633](https://github.com/chanzuckerberg/github-actions/issues/633)) ([d30bd4d](https://github.com/chanzuckerberg/github-actions/commit/d30bd4d834695f127211819e44461167c472b747))

## [0.6.0](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.5.0...terragrunt-git-status-v0.6.0) (2026-08-14)


### Features

* **terragrunt-engine:** block apply when a PR is behind its base branch ([#629](https://github.com/chanzuckerberg/github-actions/issues/629)) ([f7eb415](https://github.com/chanzuckerberg/github-actions/commit/f7eb4157d057e2ff8a3e9aea12ad570047e8ce9f))

## [0.5.0](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.4.1...terragrunt-git-status-v0.5.0) (2026-08-13)


### Features

* **terragrunt-engine:** release stack authority when a PR closes ([#624](https://github.com/chanzuckerberg/github-actions/issues/624)) ([c9a49ec](https://github.com/chanzuckerberg/github-actions/commit/c9a49ec0f6f9e2edf22824309a28ad923f029d84))

## [0.4.1](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.4.0...terragrunt-git-status-v0.4.1) (2026-08-12)


### BugFixes

* **terragrunt-engine:** fail locked applies and enforce CODEOWNERS on null reviewDecision ([#621](https://github.com/chanzuckerberg/github-actions/issues/621)) ([d878755](https://github.com/chanzuckerberg/github-actions/commit/d878755c9d04aac0f99ce4aafba51cf7ffc06c18))

## [0.4.0](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.3.0...terragrunt-git-status-v0.4.0) (2026-08-12)


### Features

* **terragrunt-engine:** respect CODEOWNERS for apply-and-merge ([#619](https://github.com/chanzuckerberg/github-actions/issues/619)) ([5d5dc94](https://github.com/chanzuckerberg/github-actions/commit/5d5dc94dc15e73fbc1765f70773d31bd49cff174))

## [0.3.0](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.2.2...terragrunt-git-status-v0.3.0) (2026-07-20)


### Features

* **terragrunt-engine:** dispatch [@terragrunt-bot](https://github.com/terragrunt-bot) PR commands ([#595](https://github.com/chanzuckerberg/github-actions/issues/595)) ([ebdb6e0](https://github.com/chanzuckerberg/github-actions/commit/ebdb6e06f3c1c9285b496b2c3b26948d014e5de0))

## [0.2.2](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.2.1...terragrunt-git-status-v0.2.2) (2026-07-02)


### BugFixes

* **terragrunt-engine:** harden apply-and-merge flow ([#585](https://github.com/chanzuckerberg/github-actions/issues/585)) ([483867a](https://github.com/chanzuckerberg/github-actions/commit/483867a1456a8d258bbd71f625f6ea11c1b4e082))

## [0.2.1](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.2.0...terragrunt-git-status-v0.2.1) (2026-06-30)


### BugFixes

* **terragrunt-engine:** add !cancelled() to set-apply-gate condition ([#582](https://github.com/chanzuckerberg/github-actions/issues/582)) ([6eae80d](https://github.com/chanzuckerberg/github-actions/commit/6eae80d127de433f25e07b7f3567b5f01c9f249f))

## [0.2.0](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.1.0...terragrunt-git-status-v0.2.0) (2026-06-30)


### Features

* **terragrunt-git-status:** add comment-gate operation and remove legacy actions ([#579](https://github.com/chanzuckerberg/github-actions/issues/579)) ([ba48111](https://github.com/chanzuckerberg/github-actions/commit/ba481115687747005ed7abd417bbc7c6a5a61d21))

## [0.1.0](https://github.com/chanzuckerberg/github-actions/compare/terragrunt-git-status-v0.0.1...terragrunt-git-status-v0.1.0) (2026-06-29)


### Features

* **terragrunt-engine:** add finalize job and apply-gate status seeding ([#575](https://github.com/chanzuckerberg/github-actions/issues/575)) ([62252e6](https://github.com/chanzuckerberg/github-actions/commit/62252e6b8fe18c7839adf0240def88ce6c87fad8))
