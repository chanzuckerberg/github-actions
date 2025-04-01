# Changelog

## [6.0.0](https://github.com/chanzuckerberg/github-actions/compare/v5.6.2...v6.0.0) (2025-03-31)


### ⚠ BREAKING CHANGES

* convert argus-builder manifest-update to TS ([#388](https://github.com/chanzuckerberg/github-actions/issues/388))
* convert argus-builder build-prep action to TS ([#386](https://github.com/chanzuckerberg/github-actions/issues/386))

### Features

* bump to use privileged runners in argus builder ([#381](https://github.com/chanzuckerberg/github-actions/issues/381)) ([2d3285c](https://github.com/chanzuckerberg/github-actions/commit/2d3285ca220be4d6f7e46aeb167232e97918e6f0))
* convert argus-builder build-prep action to TS ([#386](https://github.com/chanzuckerberg/github-actions/issues/386)) ([367e223](https://github.com/chanzuckerberg/github-actions/commit/367e22313ff3f180fc4f42f6182ae3fbef4f47cd))
* convert argus-builder manifest-update to TS ([#388](https://github.com/chanzuckerberg/github-actions/issues/388)) ([b5a034e](https://github.com/chanzuckerberg/github-actions/commit/b5a034ef7e1eeaddf8fe6c3f8e2ee04da1cd3c37))


### BugFixes

* expression injections in jira-validate-reference ([#387](https://github.com/chanzuckerberg/github-actions/issues/387)) ([ed1e62a](https://github.com/chanzuckerberg/github-actions/commit/ed1e62a5e17a53ef3dd8c3eb353c12c3ab44f836))


### Misc

* add tests and workflow to run tests in CI ([#384](https://github.com/chanzuckerberg/github-actions/issues/384)) ([85706b3](https://github.com/chanzuckerberg/github-actions/commit/85706b317c52de7c9b4b7249d15d81f41bc5ac2e))

## [5.6.2](https://github.com/chanzuckerberg/github-actions/compare/v5.6.1...v5.6.2) (2025-03-18)


### BugFixes

* don't use docker image for yq ([#382](https://github.com/chanzuckerberg/github-actions/issues/382)) ([7d4cf33](https://github.com/chanzuckerberg/github-actions/commit/7d4cf33879e7ae128c4ded659619e7792e20e76b))

## [5.6.1](https://github.com/chanzuckerberg/github-actions/compare/v5.6.0...v5.6.1) (2025-03-15)


### BugFixes

* only run container scanning optin ([#379](https://github.com/chanzuckerberg/github-actions/issues/379)) ([e00ae88](https://github.com/chanzuckerberg/github-actions/commit/e00ae88355caeff8cf4910344913362fe74a4f2c))

## [5.6.0](https://github.com/chanzuckerberg/github-actions/compare/v5.5.1...v5.6.0) (2025-03-15)


### Features

* add find-changed-files and convert validate-json-schema to TS ([#377](https://github.com/chanzuckerberg/github-actions/issues/377)) ([ef32935](https://github.com/chanzuckerberg/github-actions/commit/ef32935a4340835f203ea23c84c5933d051c511d))

## [5.5.1](https://github.com/chanzuckerberg/github-actions/compare/v5.5.0...v5.5.1) (2025-03-07)


### BugFixes

* use inputs for app id and PK ([1bd12ca](https://github.com/chanzuckerberg/github-actions/commit/1bd12ca7ee2fb4d38dcf0ebaca847975de95a21f))


### Misc

* CCIE-3947 update release-please-semvar readme ([#365](https://github.com/chanzuckerberg/github-actions/issues/365)) ([f174832](https://github.com/chanzuckerberg/github-actions/commit/f1748324a260af9d7f9fc7d000c24eb229d80fd4))

## [5.5.0](https://github.com/chanzuckerberg/github-actions/compare/v5.4.0...v5.5.0) (2025-03-05)


### Features

* bumps the version on release-please-semvar ([#372](https://github.com/chanzuckerberg/github-actions/issues/372)) ([ac0bbeb](https://github.com/chanzuckerberg/github-actions/commit/ac0bbebce94a3915e36684aa05ad5881153b728b))
* CCIE-3947 add component-in-tag input to release-please-semvar ([#366](https://github.com/chanzuckerberg/github-actions/issues/366)) ([2155f13](https://github.com/chanzuckerberg/github-actions/commit/2155f13b6b280ce69c00ecc71ddb88c0e56b09fc))
* remove old vulnerability comments when adding new vulnerability report comment ([#371](https://github.com/chanzuckerberg/github-actions/issues/371)) ([f52d986](https://github.com/chanzuckerberg/github-actions/commit/f52d986c26561a8de7e7af78e73380f837fa9e95))
* tag major/minor version to monorepo components ([#370](https://github.com/chanzuckerberg/github-actions/issues/370)) ([ac9a969](https://github.com/chanzuckerberg/github-actions/commit/ac9a969a85493eb55054388476e6e1f6f61cdf62))


### Misc

* deprecate pulling app tokens using tibdex ([#359](https://github.com/chanzuckerberg/github-actions/issues/359)) ([b863d3b](https://github.com/chanzuckerberg/github-actions/commit/b863d3b59f14e5278f2556fc89e700797c4e6cf3))

## [5.4.0](https://github.com/chanzuckerberg/github-actions/compare/v5.3.0...v5.4.0) (2025-02-27)


### Features

* don't use github actions cache; we use pull through cache ([#351](https://github.com/chanzuckerberg/github-actions/issues/351)) ([ef2e369](https://github.com/chanzuckerberg/github-actions/commit/ef2e36989bf32f7d52996a6d8b73fa99f4025d80))
* make the argus builder work with yaml anchors ([#368](https://github.com/chanzuckerberg/github-actions/issues/368)) ([0927e22](https://github.com/chanzuckerberg/github-actions/commit/0927e2281bddff72d2d22491a3954bab7290e3a2))

## [5.3.0](https://github.com/chanzuckerberg/github-actions/compare/v5.2.0...v5.3.0) (2025-02-26)


### Features

* CCIE-3947 tag unpinned major/minor versions ([#358](https://github.com/chanzuckerberg/github-actions/issues/358)) ([1fa67d3](https://github.com/chanzuckerberg/github-actions/commit/1fa67d3eeae04039695256249cfad3e89e2c9d14))


### BugFixes

* CCIE-3947 add checkout step to release.yaml ([#361](https://github.com/chanzuckerberg/github-actions/issues/361)) ([ab8e141](https://github.com/chanzuckerberg/github-actions/commit/ab8e141ebde81c4fecdc0b454abe9b4191c8f40b))
* CCIE-3947 add shell property to release-please-semvar ([#363](https://github.com/chanzuckerberg/github-actions/issues/363)) ([a8c39d2](https://github.com/chanzuckerberg/github-actions/commit/a8c39d2b74ac2b4605bacbe338cc3ee0b07aecbe))
* CCIE-3947 pass app token to release-please-semvar ([#362](https://github.com/chanzuckerberg/github-actions/issues/362)) ([e5209b3](https://github.com/chanzuckerberg/github-actions/commit/e5209b306fa3a3b1cd340c384ceb7e2a27180ba5))
* CCIE-3947 unpin release please git rev in release.yaml ([#360](https://github.com/chanzuckerberg/github-actions/issues/360)) ([5278e0f](https://github.com/chanzuckerberg/github-actions/commit/5278e0f92e1b4b8fc09aacbbc066d71687c71978))

## [5.2.0](https://github.com/chanzuckerberg/github-actions/compare/v5.1.0...v5.2.0) (2025-02-21)


### Features

* embed docker scanning into argus builder action ([#346](https://github.com/chanzuckerberg/github-actions/issues/346)) ([9ed240d](https://github.com/chanzuckerberg/github-actions/commit/9ed240d96a6ccd85012f13b09f0c4c6b3853afd5))

## [5.1.0](https://github.com/chanzuckerberg/github-actions/compare/v5.0.0...v5.1.0) (2025-02-20)


### Features

* use ECR settings from argus-artifacts repo ([#355](https://github.com/chanzuckerberg/github-actions/issues/355)) ([fbdf971](https://github.com/chanzuckerberg/github-actions/commit/fbdf971fade05568971793b73439648a99615ef3))

## [5.0.0](https://github.com/chanzuckerberg/github-actions/compare/v4.3.0...v5.0.0) (2025-02-19)


### ⚠ BREAKING CHANGES

* *BREAKING* allow passing multiple labels that should make argus builder update manifests ([#353](https://github.com/chanzuckerberg/github-actions/issues/353))

### Features

* *BREAKING* allow passing multiple labels that should make argus builder update manifests ([#353](https://github.com/chanzuckerberg/github-actions/issues/353)) ([89bc6f0](https://github.com/chanzuckerberg/github-actions/commit/89bc6f095035b2a37bd6abd3312a54fc265a4a3d))

## [4.3.0](https://github.com/chanzuckerberg/github-actions/compare/v4.2.0...v4.3.0) (2025-02-14)


### Features

* add reusable workflow for keeping argus helm charts up to date ([#350](https://github.com/chanzuckerberg/github-actions/issues/350)) ([bbaab62](https://github.com/chanzuckerberg/github-actions/commit/bbaab62dea89f48856e61ea86e604e6b1edb6ed2))

## [4.2.0](https://github.com/chanzuckerberg/github-actions/compare/v4.1.0...v4.2.0) (2025-02-11)


### Features

* CCIE-3978 make argus-docker-build runs-on configurable ([#349](https://github.com/chanzuckerberg/github-actions/issues/349)) ([1ba083b](https://github.com/chanzuckerberg/github-actions/commit/1ba083b25bd297fb8a901fae0cf9d72e116dc6ed))


### Misc

* CCIE-3978 remove Linux & self-hosted github runner tags ([#345](https://github.com/chanzuckerberg/github-actions/issues/345)) ([2e67f39](https://github.com/chanzuckerberg/github-actions/commit/2e67f3938dd872bd70306e2dbe903458f52a6f39))

## [4.1.0](https://github.com/chanzuckerberg/github-actions/compare/v4.0.1...v4.1.0) (2025-02-05)


### Features

* CCIE-3899 Add force_update_manifest to argus-docker-build ([#342](https://github.com/chanzuckerberg/github-actions/issues/342)) ([1586e1e](https://github.com/chanzuckerberg/github-actions/commit/1586e1eba1252b7043722b108a259ff1126323d2))


### Misc

* fix release ([#347](https://github.com/chanzuckerberg/github-actions/issues/347)) ([a90dd27](https://github.com/chanzuckerberg/github-actions/commit/a90dd27095252da21f7102acad4ab352f3bf0ca7))
* remove deprecated tags ([#332](https://github.com/chanzuckerberg/github-actions/issues/332)) ([7e24ee1](https://github.com/chanzuckerberg/github-actions/commit/7e24ee1e9cb7498b6985257653201929ab6f1c2f))

## [4.0.1](https://github.com/chanzuckerberg/github-actions/compare/v4.0.0...v4.0.1) (2025-01-31)


### Misc

* CCIE-3899 use sha to fetch PR in argus-docker-build ([#340](https://github.com/chanzuckerberg/github-actions/issues/340)) ([36a44c2](https://github.com/chanzuckerberg/github-actions/commit/36a44c2cb5e7f0c8b7646f80c56478109bb241bf))

## [4.0.0](https://github.com/chanzuckerberg/github-actions/compare/v3.6.1...v4.0.0) (2025-01-27)


### ⚠ BREAKING CHANGES

* CCIE-3896 rename CZI_GITHUB_HELPER_* to GH_ACTIONS_HELPER_* ([#333](https://github.com/chanzuckerberg/github-actions/issues/333))

### Features

* CCIE-3896 rename CZI_GITHUB_HELPER_* to GH_ACTIONS_HELPER_* ([#333](https://github.com/chanzuckerberg/github-actions/issues/333)) ([f53ac72](https://github.com/chanzuckerberg/github-actions/commit/f53ac72b29a9d435f6c4f177a5beaa423842f3e5))


### Misc

* CCIE-3899 use build-prep@3.6.1 ([#335](https://github.com/chanzuckerberg/github-actions/issues/335)) ([8d3d492](https://github.com/chanzuckerberg/github-actions/commit/8d3d492c470de3394b3b20be0caac66405eeb222))
* fix build-prep tag ([#337](https://github.com/chanzuckerberg/github-actions/issues/337)) ([64ab808](https://github.com/chanzuckerberg/github-actions/commit/64ab8080958b220ebf87692510bd907e911721f4))

## [3.6.1](https://github.com/chanzuckerberg/github-actions/compare/v3.6.0...v3.6.1) (2025-01-24)


### BugFixes

* do not update manifest on PRs without stack label ([#331](https://github.com/chanzuckerberg/github-actions/issues/331)) ([90e3b17](https://github.com/chanzuckerberg/github-actions/commit/90e3b174f84caefcc4ca67fa282f2297a230391d))

## [3.6.0](https://github.com/chanzuckerberg/github-actions/compare/v3.5.0...v3.6.0) (2024-12-10)


### Features

* allow update manifests to be turned off ([0c07e62](https://github.com/chanzuckerberg/github-actions/commit/0c07e62b97a01a51fdec13a12b7d3883cebfc9b3))

## [3.5.0](https://github.com/chanzuckerberg/github-actions/compare/v3.4.2...v3.5.0) (2024-11-26)


### Features

* allow skipping checking if tag exists ([f7a1cf7](https://github.com/chanzuckerberg/github-actions/commit/f7a1cf72543ac0b7e676959d4ffb046d09796ab3))


### BugFixes

* bash script in happy-cleanup github action ([#329](https://github.com/chanzuckerberg/github-actions/issues/329)) ([04fb669](https://github.com/chanzuckerberg/github-actions/commit/04fb669a704eea859935253e5c2fb72b7cdbdd61))


### Misc

* bump github-script version ([#327](https://github.com/chanzuckerberg/github-actions/issues/327)) ([6a1d02c](https://github.com/chanzuckerberg/github-actions/commit/6a1d02cfe4728fe4c1e1ec32d7cb6c07de320193))

## [3.4.2](https://github.com/chanzuckerberg/github-actions/compare/v3.4.1...v3.4.2) (2024-11-07)


### Misc

* pin to latest release ([072114a](https://github.com/chanzuckerberg/github-actions/commit/072114a86d6866b64e0df2802ec3cf20ff3e21d4))

## [3.4.1](https://github.com/chanzuckerberg/github-actions/compare/v3.4.0...v3.4.1) (2024-11-07)


### Misc

* add a clean parameter to the checkout ([#324](https://github.com/chanzuckerberg/github-actions/issues/324)) ([4e4223e](https://github.com/chanzuckerberg/github-actions/commit/4e4223e12a904a69dcff2d819505b311acace29c))

## [3.4.0](https://github.com/chanzuckerberg/github-actions/compare/v3.3.0...v3.4.0) (2024-10-22)


### Features

* Fix happy-cleanup aws profile setting ([#319](https://github.com/chanzuckerberg/github-actions/issues/319)) ([83129b4](https://github.com/chanzuckerberg/github-actions/commit/83129b4c8b10f44b57eca3c4a4a3c6f6996aa23b))
* small change to bump the release ([#322](https://github.com/chanzuckerberg/github-actions/issues/322)) ([9c73329](https://github.com/chanzuckerberg/github-actions/commit/9c7332935d01ede0022a2e4f50a2180ea5395366))

## [3.3.0](https://github.com/chanzuckerberg/github-actions/compare/v3.2.3...v3.3.0) (2024-10-02)


### Features

* allow multiple projectKeys in jira automations ([#315](https://github.com/chanzuckerberg/github-actions/issues/315)) ([9abdda4](https://github.com/chanzuckerberg/github-actions/commit/9abdda4d328968ee4862f720aaba672ec7f5b6a8))


### Misc

* roll back mutliple projectKey support ([#317](https://github.com/chanzuckerberg/github-actions/issues/317)) ([dea8a11](https://github.com/chanzuckerberg/github-actions/commit/dea8a117439171e7f7e4751a087e1354e233b104))
* update jira release workflow ([#318](https://github.com/chanzuckerberg/github-actions/issues/318)) ([c276d61](https://github.com/chanzuckerberg/github-actions/commit/c276d61d83aa6d1aadd6e1c1f64d741844f34e8f))

## [3.2.3](https://github.com/chanzuckerberg/github-actions/compare/v3.2.2...v3.2.3) (2024-09-23)


### BugFixes

* prevent manifest update after another commit ([#313](https://github.com/chanzuckerberg/github-actions/issues/313)) ([184fd1b](https://github.com/chanzuckerberg/github-actions/commit/184fd1b7af7570e355d1bd0c442c5cb8a09fd93d))

## [3.2.2](https://github.com/chanzuckerberg/github-actions/compare/v3.2.1...v3.2.2) (2024-09-16)


### BugFixes

* typo ([#311](https://github.com/chanzuckerberg/github-actions/issues/311)) ([e22ae9f](https://github.com/chanzuckerberg/github-actions/commit/e22ae9fb2ab335465481e357f48456932aede3f1))

## [3.2.1](https://github.com/chanzuckerberg/github-actions/compare/v3.2.0...v3.2.1) (2024-09-16)


### BugFixes

* set dot option in minimatch ([#309](https://github.com/chanzuckerberg/github-actions/issues/309)) ([f3b209a](https://github.com/chanzuckerberg/github-actions/commit/f3b209a6c2fa3bf4edafe9abadc87705d85bf0e6))

## [3.2.0](https://github.com/chanzuckerberg/github-actions/compare/v3.1.0...v3.2.0) (2024-09-10)


### Features

* argus-docker-build allow skipping manifest update ([#307](https://github.com/chanzuckerberg/github-actions/issues/307)) ([a4e91c6](https://github.com/chanzuckerberg/github-actions/commit/a4e91c6cdf63ac870a05eadf3ebec8a2346b0bd3))


### Misc

* bump dorny/paths-filter from 2.10.2 to 3.0.2 ([#272](https://github.com/chanzuckerberg/github-actions/issues/272)) ([ad2288c](https://github.com/chanzuckerberg/github-actions/commit/ad2288cdef257524846902f74fd17a3b25d4aa81))

## [3.1.0](https://github.com/chanzuckerberg/github-actions/compare/v3.0.0...v3.1.0) (2024-08-30)


### Features

* support pull_request trigger in argus docker builder ([#304](https://github.com/chanzuckerberg/github-actions/issues/304)) ([054ac7b](https://github.com/chanzuckerberg/github-actions/commit/054ac7bd94bce45e1b07ef35042da487ba6bec45))

## [3.0.0](https://github.com/chanzuckerberg/github-actions/compare/v2.15.3...v3.0.0) (2024-08-29)


### ⚠ BREAKING CHANGES

* support for building argus monorepo all in the same workflow ([#302](https://github.com/chanzuckerberg/github-actions/issues/302))

### Features

* support for building argus monorepo all in the same workflow ([#302](https://github.com/chanzuckerberg/github-actions/issues/302)) ([a8e3826](https://github.com/chanzuckerberg/github-actions/commit/a8e382625d319f919fa356d955d95d679917f2bb))

## [2.15.3](https://github.com/chanzuckerberg/github-actions/compare/v2.15.2...v2.15.3) (2024-08-21)


### Misc

* use pull-through cache in docker-builders for qemu ([#299](https://github.com/chanzuckerberg/github-actions/issues/299)) ([07ae9c3](https://github.com/chanzuckerberg/github-actions/commit/07ae9c3950e07a8e1c6426b30f91ede86b127d11))

## [2.15.2](https://github.com/chanzuckerberg/github-actions/compare/v2.15.1...v2.15.2) (2024-08-16)


### BugFixes

* prevent manifest update when dependent job was cancelled (2) ([#297](https://github.com/chanzuckerberg/github-actions/issues/297)) ([f755674](https://github.com/chanzuckerberg/github-actions/commit/f7556746ffef827dbe6d6dd7c2d8f2b1662c86b6))

## [2.15.1](https://github.com/chanzuckerberg/github-actions/compare/v2.15.0...v2.15.1) (2024-08-16)


### BugFixes

* prevent manifest update when dependent job was cancelled ([#295](https://github.com/chanzuckerberg/github-actions/issues/295)) ([17272a0](https://github.com/chanzuckerberg/github-actions/commit/17272a0044360c87d274f1bc1e226a4ecb199fb8))

## [2.15.0](https://github.com/chanzuckerberg/github-actions/compare/v2.14.0...v2.15.0) (2024-08-16)


### Features

* Add secret_files arg to Argus docker builder to allow passing files to build context ([#293](https://github.com/chanzuckerberg/github-actions/issues/293)) ([fe01920](https://github.com/chanzuckerberg/github-actions/commit/fe0192038cc934397910d3768f03c8aa35dbf152))

## [2.14.0](https://github.com/chanzuckerberg/github-actions/compare/v2.13.2...v2.14.0) (2024-08-08)


### Features

* scope Argus ECR repo name with working directory ([#291](https://github.com/chanzuckerberg/github-actions/issues/291)) ([cdbe4f8](https://github.com/chanzuckerberg/github-actions/commit/cdbe4f89ff76793b9f5b84c27b04976ed279be39))

## [2.13.2](https://github.com/chanzuckerberg/github-actions/compare/v2.13.1...v2.13.2) (2024-08-02)


### BugFixes

* make 'Update Manifest' job fail if any image build fails ([#289](https://github.com/chanzuckerberg/github-actions/issues/289)) ([7a08299](https://github.com/chanzuckerberg/github-actions/commit/7a08299241246b063672ce4014f068fc6ec79372))

## [2.13.1](https://github.com/chanzuckerberg/github-actions/compare/v2.13.0...v2.13.1) (2024-07-30)


### BugFixes

* update Jira URLs after czi-tech to czi migration ([#287](https://github.com/chanzuckerberg/github-actions/issues/287)) ([60629a9](https://github.com/chanzuckerberg/github-actions/commit/60629a9ec3a18abb6b362754f4b6287cca168414))


### Misc

* bump google-github-actions/release-please-action ([#271](https://github.com/chanzuckerberg/github-actions/issues/271)) ([08e6a7b](https://github.com/chanzuckerberg/github-actions/commit/08e6a7b6e4f224cc7babb8d9ced2959d68e16d06))

## [2.13.0](https://github.com/chanzuckerberg/github-actions/compare/v2.12.0...v2.13.0) (2024-07-15)


### Features

* break argus-docker-build workflow into composite actions ([#283](https://github.com/chanzuckerberg/github-actions/issues/283)) ([d9d1014](https://github.com/chanzuckerberg/github-actions/commit/d9d1014b19da6dd46d12a2e15f2f0319aed2b42f))


### Misc

* upgrade release-please action ([#286](https://github.com/chanzuckerberg/github-actions/issues/286)) ([102be50](https://github.com/chanzuckerberg/github-actions/commit/102be50d09a67f315e28a3ba026dedf0154c31b9))

## [2.12.0](https://github.com/chanzuckerberg/github-actions/compare/v2.11.1...v2.12.0) (2024-07-11)


### Features

* adding docker scanning github action workflow ([#274](https://github.com/chanzuckerberg/github-actions/issues/274)) ([89b5406](https://github.com/chanzuckerberg/github-actions/commit/89b5406c40cf13ec055ab8e44633019e1655802b))

### [2.11.1](https://github.com/chanzuckerberg/github-actions/compare/v2.11.0...v2.11.1) (2024-07-09)


### Bug Fixes

* handle force pushes in argus builder ([#280](https://github.com/chanzuckerberg/github-actions/issues/280)) ([5012077](https://github.com/chanzuckerberg/github-actions/commit/50120775b18694741b872689591c9efcbe402e13))

## [2.11.0](https://github.com/chanzuckerberg/github-actions/compare/v2.10.0...v2.11.0) (2024-07-08)


### Features

* add ability to delete all stacks in happy environment ([#275](https://github.com/chanzuckerberg/github-actions/issues/275)) ([9e055ea](https://github.com/chanzuckerberg/github-actions/commit/9e055eaa8dfc05123dc2d3150485025c76c18c83))
* add more conventional commit types ([#279](https://github.com/chanzuckerberg/github-actions/issues/279)) ([c212929](https://github.com/chanzuckerberg/github-actions/commit/c2129291817d4055272deee803d893d6669ababd))

## [2.10.0](https://github.com/chanzuckerberg/github-actions/compare/v2.9.0...v2.10.0) (2024-07-03)


### Features

* support build_args in argus docker builder workflow ([#276](https://github.com/chanzuckerberg/github-actions/issues/276)) ([95e9d8d](https://github.com/chanzuckerberg/github-actions/commit/95e9d8d72e892814927d854a4c4bb10eb9fb47fe))

## [2.9.0](https://github.com/chanzuckerberg/github-actions/compare/v2.8.0...v2.9.0) (2024-05-30)


### Features

* embed branch filtering into Argus builder workflow ([#269](https://github.com/chanzuckerberg/github-actions/issues/269)) ([a44edd2](https://github.com/chanzuckerberg/github-actions/commit/a44edd2aff119166fff43c7ffb35daefc54464bb))

## [2.8.0](https://github.com/chanzuckerberg/github-actions/compare/v2.7.0...v2.8.0) (2024-05-30)


### Features

* add working-dir to happy cleanup ([#262](https://github.com/chanzuckerberg/github-actions/issues/262)) ([ddd2721](https://github.com/chanzuckerberg/github-actions/commit/ddd27219796550ee602fc28437d8ffa4c7d5e3d3))
* embed path filtering into Argus builder workflow ([#268](https://github.com/chanzuckerberg/github-actions/issues/268)) ([a07fed7](https://github.com/chanzuckerberg/github-actions/commit/a07fed754128b4eed970be1007537b1aa681ea62))


### Bug Fixes

* don't fail builds if another build fails ([#267](https://github.com/chanzuckerberg/github-actions/issues/267)) ([099e5d6](https://github.com/chanzuckerberg/github-actions/commit/099e5d6bb175b9ad805bf1998d3500b0f7c5246f))

## [2.7.0](https://github.com/chanzuckerberg/github-actions/compare/v2.6.0...v2.7.0) (2024-05-01)


### Features

* argus-docker-build update multiple envs ([#263](https://github.com/chanzuckerberg/github-actions/issues/263)) ([0ec8d51](https://github.com/chanzuckerberg/github-actions/commit/0ec8d51d812d5fbb7c8c807cb896be287edbd25b))

## [2.6.0](https://github.com/chanzuckerberg/github-actions/compare/v2.5.0...v2.6.0) (2024-04-23)


### Features

* default platform to ARM ([#260](https://github.com/chanzuckerberg/github-actions/issues/260)) ([1ef30cf](https://github.com/chanzuckerberg/github-actions/commit/1ef30cf559b4bb09aae49ad2cce1c45ae86df4b6))

## [2.5.0](https://github.com/chanzuckerberg/github-actions/compare/v2.4.0...v2.5.0) (2024-04-22)


### Features

* start using the prod core platform account ([#258](https://github.com/chanzuckerberg/github-actions/issues/258)) ([449a3e9](https://github.com/chanzuckerberg/github-actions/commit/449a3e904ba77c14c69a688e18d0de9c8f954ec0))

## [2.4.0](https://github.com/chanzuckerberg/github-actions/compare/v2.3.0...v2.4.0) (2024-04-19)


### Features

* always log in to core platform prod ECR ([#256](https://github.com/chanzuckerberg/github-actions/issues/256)) ([f0d73b9](https://github.com/chanzuckerberg/github-actions/commit/f0d73b9361e12fb38e554f4d5f1e578f656d2623))

## [2.3.0](https://github.com/chanzuckerberg/github-actions/compare/v2.2.1...v2.3.0) (2024-04-17)


### Features

* allow image to be built for different platform ([#255](https://github.com/chanzuckerberg/github-actions/issues/255)) ([28cf226](https://github.com/chanzuckerberg/github-actions/commit/28cf226818b8408e8dd3d26bac255e9d87d006ac))


### Bug Fixes

* Revert "fix: use default token to prevent build cycle ([#251](https://github.com/chanzuckerberg/github-actions/issues/251))" ([#253](https://github.com/chanzuckerberg/github-actions/issues/253)) ([478b89f](https://github.com/chanzuckerberg/github-actions/commit/478b89f2e590101797fb4da27bbf547344523c47))

### [2.2.1](https://github.com/chanzuckerberg/github-actions/compare/v2.2.0...v2.2.1) (2024-04-08)


### Bug Fixes

* use default token to prevent build cycle ([#251](https://github.com/chanzuckerberg/github-actions/issues/251)) ([728e81c](https://github.com/chanzuckerberg/github-actions/commit/728e81cdd6cf09d180babe9d6bfe3c33bebc0d1c))

## [2.2.0](https://github.com/chanzuckerberg/github-actions/compare/v2.1.0...v2.2.0) (2024-04-02)


### Features

* add reusable Argus Builder action/workflow ([#249](https://github.com/chanzuckerberg/github-actions/issues/249)) ([4681a50](https://github.com/chanzuckerberg/github-actions/commit/4681a505ba69536d555f543b0f0cb0b8adba95b4))

## [2.1.0](https://github.com/chanzuckerberg/github-actions/compare/v2.0.0...v2.1.0) (2024-02-01)


### Features

* allow deps for conventional commits ([#245](https://github.com/chanzuckerberg/github-actions/issues/245)) ([a63ad0e](https://github.com/chanzuckerberg/github-actions/commit/a63ad0e12357e3af246433d8a26a1fef1d95fc44))


### Bug Fixes

* set default for version lock file location ([#247](https://github.com/chanzuckerberg/github-actions/issues/247)) ([df86206](https://github.com/chanzuckerberg/github-actions/commit/df86206aa76475f2db3b64682659a253f3a407ef))
* set the OIDC token env variable for auth ([#248](https://github.com/chanzuckerberg/github-actions/issues/248)) ([4e08944](https://github.com/chanzuckerberg/github-actions/commit/4e08944080c55d70d2ce27c4ee8a257c5e81c05e))

## [2.0.0](https://github.com/chanzuckerberg/github-actions/compare/v1.29.0...v2.0.0) (2024-01-17)


### ⚠ BREAKING CHANGES

* don't checkout ref every time (#243)

### Bug Fixes

* don't checkout ref every time ([#243](https://github.com/chanzuckerberg/github-actions/issues/243)) ([94a4c59](https://github.com/chanzuckerberg/github-actions/commit/94a4c59a6e5c779a51deb42a042aea6c04c460ec))

## [1.29.0](https://github.com/chanzuckerberg/github-actions/compare/v1.28.0...v1.29.0) (2024-01-12)


### Features

* add platforms input to docker-build-push ([#240](https://github.com/chanzuckerberg/github-actions/issues/240)) ([6a68b28](https://github.com/chanzuckerberg/github-actions/commit/6a68b28d569eeabf08399236fa39127dfd62569f))
* additional logging for happy-cleanup ([#241](https://github.com/chanzuckerberg/github-actions/issues/241)) ([6dcbbb0](https://github.com/chanzuckerberg/github-actions/commit/6dcbbb001452371cb1e528abb2bca5e0f2bfb746))

## [1.28.0](https://github.com/chanzuckerberg/github-actions/compare/v1.27.1...v1.28.0) (2024-01-10)


### Features

* Add resusable action to set app config with happy config ([#233](https://github.com/chanzuckerberg/github-actions/issues/233)) ([b2a74da](https://github.com/chanzuckerberg/github-actions/commit/b2a74da378496645bb6ebe3a820fa6b19cba05f9))
* upgrade deps on composite actions ([#239](https://github.com/chanzuckerberg/github-actions/issues/239)) ([3387a66](https://github.com/chanzuckerberg/github-actions/commit/3387a66d03e19a1a01163a3dc8717f58c2c70c56))


### Bug Fixes

* conventional-commits: handle dependabot hyphen ([#1](https://github.com/chanzuckerberg/github-actions/issues/1)) ([#235](https://github.com/chanzuckerberg/github-actions/issues/235)) ([f997e84](https://github.com/chanzuckerberg/github-actions/commit/f997e8414703f00e3163b108ca9e89876d62055d))

### [1.27.1](https://github.com/chanzuckerberg/github-actions/compare/v1.27.0...v1.27.1) (2024-01-05)


### Bug Fixes

* only use slice flags when slice is set ([b10aa97](https://github.com/chanzuckerberg/github-actions/commit/b10aa97de100f0726e77015a1f7a492795dd645c))

## [1.27.0](https://github.com/chanzuckerberg/github-actions/compare/v1.26.0...v1.27.0) (2024-01-04)


### Features

* add slice to happy deploy stack action ([#236](https://github.com/chanzuckerberg/github-actions/issues/236)) ([04dbac6](https://github.com/chanzuckerberg/github-actions/commit/04dbac6485f7644dd3c0fe189d0b9aa11cb7c77e))


### Bug Fixes

* happy addtags github action ([#230](https://github.com/chanzuckerberg/github-actions/issues/230)) ([0b740d8](https://github.com/chanzuckerberg/github-actions/commit/0b740d81436af68cb9af1011cab89199823c0161))

## [1.26.0](https://github.com/chanzuckerberg/github-actions/compare/v1.25.0...v1.26.0) (2023-10-27)


### Features

* include image-source-role-arn input for deploy happy ([#228](https://github.com/chanzuckerberg/github-actions/issues/228)) ([4168f8c](https://github.com/chanzuckerberg/github-actions/commit/4168f8c33d6d85d68c847da7a443969ed1cb5061))

## [1.25.0](https://github.com/chanzuckerberg/github-actions/compare/v1.24.0...v1.25.0) (2023-10-13)


### Features

* pass along args to allow a happy deploy from a diff repo ([#227](https://github.com/chanzuckerberg/github-actions/issues/227)) ([b358d74](https://github.com/chanzuckerberg/github-actions/commit/b358d74b04a30a1f5b0751d4859eeb97e50a56f0))


### Bug Fixes

* make message more 'human' and add a note about adding ! for breaking changes ([#225](https://github.com/chanzuckerberg/github-actions/issues/225)) ([489cb0a](https://github.com/chanzuckerberg/github-actions/commit/489cb0a19cfec0f5c0bbc279282e6350222b5fd2))

## [1.24.0](https://github.com/chanzuckerberg/github-actions/compare/v1.23.0...v1.24.0) (2023-09-01)


### Features

* allow deploy-happy-stack to sync with lock file ([#222](https://github.com/chanzuckerberg/github-actions/issues/222)) ([5f94a46](https://github.com/chanzuckerberg/github-actions/commit/5f94a4601e9548dc20fb9d015ae332b1d314c51d))

## [1.23.0](https://github.com/chanzuckerberg/github-actions/compare/v1.22.1...v1.23.0) (2023-08-30)


### Features

* exclude stacknames ([#219](https://github.com/chanzuckerberg/github-actions/issues/219)) ([b236d7c](https://github.com/chanzuckerberg/github-actions/commit/b236d7c84fadb43e11c0a3f8f291df28b4d17a2e))

### [1.22.1](https://github.com/chanzuckerberg/github-actions/compare/v1.22.0...v1.22.1) (2023-08-29)


### Bug Fixes

* wording update to happy stack cleanup ([#216](https://github.com/chanzuckerberg/github-actions/issues/216)) ([d79a00b](https://github.com/chanzuckerberg/github-actions/commit/d79a00be4fc3909c51a27115bc3c09adf191d27c))

## [1.22.0](https://github.com/chanzuckerberg/github-actions/compare/v1.21.0...v1.22.0) (2023-08-28)


### Features

* add caching for tf providers ([#215](https://github.com/chanzuckerberg/github-actions/issues/215)) ([7979abe](https://github.com/chanzuckerberg/github-actions/commit/7979abef655f4b15a917bb23d642c595d1e7e164))
* terraform plan github action ([#213](https://github.com/chanzuckerberg/github-actions/issues/213)) ([ffd2276](https://github.com/chanzuckerberg/github-actions/commit/ffd22760628d7987df9928b6007e768e17a89d32))

## [1.21.0](https://github.com/chanzuckerberg/github-actions/compare/v1.20.5...v1.21.0) (2023-08-09)


### Features

* Allow the github ref specification ([#209](https://github.com/chanzuckerberg/github-actions/issues/209)) ([c7c2ad7](https://github.com/chanzuckerberg/github-actions/commit/c7c2ad7a226e51e636e888c118919ad44519cf92))

### [1.20.5](https://github.com/chanzuckerberg/github-actions/compare/v1.20.4...v1.20.5) (2023-08-09)


### Bug Fixes

* ensure happy asset exists when selecting latest release ([#207](https://github.com/chanzuckerberg/github-actions/issues/207)) ([99f597f](https://github.com/chanzuckerberg/github-actions/commit/99f597f118e999f34715ce72d4faf38fb4b36765))

### [1.20.4](https://github.com/chanzuckerberg/github-actions/compare/v1.20.3...v1.20.4) (2023-08-03)


### Bug Fixes

* ghcli pathing ([5a32319](https://github.com/chanzuckerberg/github-actions/commit/5a323192ace4eec4c4f62c912f983b505ad0140b))
* only create jira version if gh release has PR references ([#205](https://github.com/chanzuckerberg/github-actions/issues/205)) ([1e54db0](https://github.com/chanzuckerberg/github-actions/commit/1e54db0344767dea53a62fd7525a4bd344ffc7e2))
* tarball left behind on curl ([ddc5ade](https://github.com/chanzuckerberg/github-actions/commit/ddc5adee380b7032b3f5eda6f288a1027d8e8e7b))
* wrong location for ghcli tar file ([a3a29e8](https://github.com/chanzuckerberg/github-actions/commit/a3a29e8940416871089cc349fe9990831e607339))

### [1.20.3](https://github.com/chanzuckerberg/github-actions/compare/v1.20.2...v1.20.3) (2023-07-26)


### Bug Fixes

* install ghcli in tmp directory ([24fcf4f](https://github.com/chanzuckerberg/github-actions/commit/24fcf4fc7a56c5e18c99fa3b3b81f13d35a16235))

### [1.20.2](https://github.com/chanzuckerberg/github-actions/compare/v1.20.1...v1.20.2) (2023-07-26)


### Bug Fixes

* handle backticks in jira ticket title ([#200](https://github.com/chanzuckerberg/github-actions/issues/200)) ([8e3aadc](https://github.com/chanzuckerberg/github-actions/commit/8e3aadc4f8a8e5f67ffd067e53544df4d5141bf2))

### [1.20.1](https://github.com/chanzuckerberg/github-actions/compare/v1.20.0...v1.20.1) (2023-07-26)


### Bug Fixes

* handle backticks in jira ticket title ([#198](https://github.com/chanzuckerberg/github-actions/issues/198)) ([df6cfc7](https://github.com/chanzuckerberg/github-actions/commit/df6cfc719727356c9e7bf9d14360ca4f77503efa))

## [1.20.0](https://github.com/chanzuckerberg/github-actions/compare/v1.19.0...v1.20.0) (2023-07-24)


### Features

* upgrade actions/checkout to v3 ([#196](https://github.com/chanzuckerberg/github-actions/issues/196)) ([8bd4cbe](https://github.com/chanzuckerberg/github-actions/commit/8bd4cbe77bd5d616f90bf539bb11b97109cfa510))

## [1.19.0](https://github.com/chanzuckerberg/github-actions/compare/v1.18.1...v1.19.0) (2023-07-10)


### Features

* comment on PR when jira validation fails ([#195](https://github.com/chanzuckerberg/github-actions/issues/195)) ([9267926](https://github.com/chanzuckerberg/github-actions/commit/92679264f2432018b7d3696492ca8d72cdbba5af))


### Bug Fixes

* add SECENG jira space to conventional-commits title ([#193](https://github.com/chanzuckerberg/github-actions/issues/193)) ([eb339eb](https://github.com/chanzuckerberg/github-actions/commit/eb339ebd691f08393f9dc6d8012858074f7beea9))

### [1.18.1](https://github.com/chanzuckerberg/github-actions/compare/v1.18.0...v1.18.1) (2023-06-28)


### Bug Fixes

* use tagged jira-find-marker version ([#191](https://github.com/chanzuckerberg/github-actions/issues/191)) ([480abb0](https://github.com/chanzuckerberg/github-actions/commit/480abb06ed1f11e82bf71aa56be44f04e79073dc))

## [1.18.0](https://github.com/chanzuckerberg/github-actions/compare/v1.17.0...v1.18.0) (2023-06-27)


### Features

* add workflow to create and release Jira versions ([#188](https://github.com/chanzuckerberg/github-actions/issues/188)) ([538b276](https://github.com/chanzuckerberg/github-actions/commit/538b27673ac9b21c270948a0177fd533d8740ed6))

## [1.17.0](https://github.com/chanzuckerberg/github-actions/compare/v1.16.0...v1.17.0) (2023-06-20)


### Features

* new composite action to validate jira issue references in PRs ([#184](https://github.com/chanzuckerberg/github-actions/issues/184)) ([feaad9a](https://github.com/chanzuckerberg/github-actions/commit/feaad9a0bb9c121c39a65e6ca281653eef4e5883))


### Bug Fixes

* can't use secrets in composite action ([#186](https://github.com/chanzuckerberg/github-actions/issues/186)) ([bebadf6](https://github.com/chanzuckerberg/github-actions/commit/bebadf64d3df73d2649290218bb0040a26170d98))

## [1.16.0](https://github.com/chanzuckerberg/github-actions/compare/v1.15.0...v1.16.0) (2023-06-07)


### Features

* allow to promote images from stack and env ([#182](https://github.com/chanzuckerberg/github-actions/issues/182)) ([c5147b3](https://github.com/chanzuckerberg/github-actions/commit/c5147b340be6c0ce75df2ae472c860e69d16ee61))

## [1.15.0](https://github.com/chanzuckerberg/github-actions/compare/v1.14.0...v1.15.0) (2023-05-30)


### Features

* pin install-happy to main ([#181](https://github.com/chanzuckerberg/github-actions/issues/181)) ([371fc16](https://github.com/chanzuckerberg/github-actions/commit/371fc16845bfb8dd4b1b13b5ec9a56e14e81203c))
* update how to install gh cli ([#179](https://github.com/chanzuckerberg/github-actions/issues/179)) ([fba5b20](https://github.com/chanzuckerberg/github-actions/commit/fba5b2067236a576c8909d02fbd1a094059a8e8d))

## [1.14.0](https://github.com/chanzuckerberg/github-actions/compare/v1.13.0...v1.14.0) (2023-05-11)


### Features

* use self-hosted gh runners ([#177](https://github.com/chanzuckerberg/github-actions/issues/177)) ([5987dbc](https://github.com/chanzuckerberg/github-actions/commit/5987dbcee55c9802453b73114eb7d758f33aca4c))


### Bug Fixes

* bump version of deploy-happy-stack ([8d0a0b3](https://github.com/chanzuckerberg/github-actions/commit/8d0a0b3f20059fbc70cd1beaaa9eab79e7cca569))

## [1.13.0](https://github.com/chanzuckerberg/github-actions/compare/v1.12.0...v1.13.0) (2023-05-11)


### Features

* add happy dependencies to the install happy script ([#175](https://github.com/chanzuckerberg/github-actions/issues/175)) ([0c33d3c](https://github.com/chanzuckerberg/github-actions/commit/0c33d3c782cb6475fe9e8fbca4046ced74789e4a))

## [1.12.0](https://github.com/chanzuckerberg/github-actions/compare/v1.11.7...v1.12.0) (2023-05-09)


### Features

* enable optional docker-compose-path argument ([#170](https://github.com/chanzuckerberg/github-actions/issues/170)) ([984f1dc](https://github.com/chanzuckerberg/github-actions/commit/984f1dcc78369c05f073af0887c94030cd36f21d))


### Bug Fixes

* .npm secrets not mounted ([#172](https://github.com/chanzuckerberg/github-actions/issues/172)) ([09ed5f8](https://github.com/chanzuckerberg/github-actions/commit/09ed5f8a9c17977fbceb71ca7d527ce761d963e6))

### [1.11.7](https://github.com/chanzuckerberg/github-actions/compare/v1.11.6...v1.11.7) (2023-02-06)


### Bug Fixes

* update to use patched install-happy version ([#167](https://github.com/chanzuckerberg/github-actions/issues/167)) ([60c8231](https://github.com/chanzuckerberg/github-actions/commit/60c82314b1b6b416fb6a688e08bae47247bc640b))

### [1.11.6](https://github.com/chanzuckerberg/github-actions/compare/v1.11.5...v1.11.6) (2023-02-06)


### Bug Fixes

* paginate latest happy version lookup ([#165](https://github.com/chanzuckerberg/github-actions/issues/165)) ([5407fc9](https://github.com/chanzuckerberg/github-actions/commit/5407fc98a773d6802b897c8faacca7f734129d78))

### [1.11.5](https://github.com/chanzuckerberg/github-actions/compare/v1.11.4...v1.11.5) (2023-01-26)


### Bug Fixes

* upgrade to use fixed version of install-happy ([#162](https://github.com/chanzuckerberg/github-actions/issues/162)) ([057a65d](https://github.com/chanzuckerberg/github-actions/commit/057a65d3cd2ce807a34c4663d65a70ed69f680f7))

### [1.11.4](https://github.com/chanzuckerberg/github-actions/compare/v1.11.3...v1.11.4) (2023-01-26)


### Bug Fixes

* find correct latest happy version ([#160](https://github.com/chanzuckerberg/github-actions/issues/160)) ([d8e43a0](https://github.com/chanzuckerberg/github-actions/commit/d8e43a08f5e1278c255e55107e9afd77924818b9))

### [1.11.3](https://github.com/chanzuckerberg/github-actions/compare/v1.11.2...v1.11.3) (2023-01-20)


### Bug Fixes

* bug with copy/paste wrong updated value ([436b568](https://github.com/chanzuckerberg/github-actions/commit/436b568e85e7daaf88437615ddbc0726de64d281))

### [1.11.2](https://github.com/chanzuckerberg/github-actions/compare/v1.11.1...v1.11.2) (2023-01-20)


### Bug Fixes

* grab the stack names from filter ([23dc728](https://github.com/chanzuckerberg/github-actions/commit/23dc728bc594ac16e24f4eba7f441120a2190b86))

### [1.11.1](https://github.com/chanzuckerberg/github-actions/compare/v1.11.0...v1.11.1) (2023-01-19)


### Bug Fixes

* aws profile set by environment ([b981a76](https://github.com/chanzuckerberg/github-actions/commit/b981a76c14fda34e2c7e5667a71e6312598f7ed3))

## [1.11.0](https://github.com/chanzuckerberg/github-actions/compare/v1.10.0...v1.11.0) (2023-01-19)


### Features

* reusable action to delete happy stacks ([#155](https://github.com/chanzuckerberg/github-actions/issues/155)) ([3563849](https://github.com/chanzuckerberg/github-actions/commit/356384951fc169afca975e1b806f33272fcb97ca))

## [1.10.0](https://github.com/chanzuckerberg/github-actions/compare/v1.9.0...v1.10.0) (2022-11-14)


### Features

* allow specifying working direcory in happy stack deploy ([#153](https://github.com/chanzuckerberg/github-actions/issues/153)) ([2d0836c](https://github.com/chanzuckerberg/github-actions/commit/2d0836ce2f7a99ad36e16226743032326ca938c0))

## [1.9.0](https://github.com/chanzuckerberg/github-actions/compare/v1.8.0...v1.9.0) (2022-10-27)


### Features

* use new install-happy action ([#151](https://github.com/chanzuckerberg/github-actions/issues/151)) ([2b8d97a](https://github.com/chanzuckerberg/github-actions/commit/2b8d97a02357ccfd0252a40b686ef67021ec3f32))

## [1.8.0](https://github.com/chanzuckerberg/github-actions/compare/v1.7.4...v1.8.0) (2022-10-26)


### Features

* default to using latest version of happy ([#149](https://github.com/chanzuckerberg/github-actions/issues/149)) ([9ff663d](https://github.com/chanzuckerberg/github-actions/commit/9ff663d7ee1b309cc7040bdd06a9644b825a20d5))

### [1.7.4](https://github.com/chanzuckerberg/github-actions/compare/v1.7.3...v1.7.4) (2022-09-23)


### Bug Fixes

* add PRDOSEC jira project to conventional commits regex ([#145](https://github.com/chanzuckerberg/github-actions/issues/145)) ([05ba60b](https://github.com/chanzuckerberg/github-actions/commit/05ba60b993e738bd39ee16031847f41d6cadf847))
* conventional commit regex capture groups ([#143](https://github.com/chanzuckerberg/github-actions/issues/143)) ([74ed720](https://github.com/chanzuckerberg/github-actions/commit/74ed7201c9e92c32e2f7bcd8786cb9a194348269))
* **ONCALL-229:** Fix Create-or-update behavior of the deploy-happy-stack ([#147](https://github.com/chanzuckerberg/github-actions/issues/147)) ([c1dc456](https://github.com/chanzuckerberg/github-actions/commit/c1dc45631bcfb206d01ebc52f6ca815f92669f12))

### [1.7.3](https://github.com/chanzuckerberg/github-actions/compare/v1.7.2...v1.7.3) (2022-07-13)


### Bug Fixes

* When happy list errors out for whatever reason, treat it as a failure, not as an update ([#137](https://github.com/chanzuckerberg/github-actions/issues/137)) ([27fd165](https://github.com/chanzuckerberg/github-actions/commit/27fd1654aa10c5ecdada98b5a860ff78bf2a151e))

### [1.7.2](https://github.com/chanzuckerberg/github-actions/compare/v1.7.1...v1.7.2) (2022-07-01)


### Bug Fixes

* Stack update fails as grep doesn't pick up the output ([#130](https://github.com/chanzuckerberg/github-actions/issues/130)) ([a2db87d](https://github.com/chanzuckerberg/github-actions/commit/a2db87dc97959f5f43e68763b90378818910b9f6))

### [1.7.1](https://github.com/chanzuckerberg/github-actions/compare/v1.7.0...v1.7.1) (2022-07-01)


### Bug Fixes

* Update pinned ref action in docker-build-push ([#132](https://github.com/chanzuckerberg/github-actions/issues/132)) ([0de90dd](https://github.com/chanzuckerberg/github-actions/commit/0de90dda7c3c742549d41ff14424d61ef1b1d933))

## [1.7.0](https://github.com/chanzuckerberg/github-actions/compare/v1.6.2...v1.7.0) (2022-06-30)


### Features

* (CCIE-308) Adding delete action ([#129](https://github.com/chanzuckerberg/github-actions/issues/129)) ([1bd8689](https://github.com/chanzuckerberg/github-actions/commit/1bd86899281d23e1a05f7726f22a45e4e110663c))

### [1.6.2](https://github.com/chanzuckerberg/github-actions/compare/v1.6.1...v1.6.2) (2022-06-28)


### Bug Fixes

* Incorrectly passed env-file argument ([#127](https://github.com/chanzuckerberg/github-actions/issues/127)) ([6a0ec96](https://github.com/chanzuckerberg/github-actions/commit/6a0ec963273ff32fd86f816c9b8517e070330458))

### [1.6.1](https://github.com/chanzuckerberg/github-actions/compare/v1.6.0...v1.6.1) (2022-06-23)


### Bug Fixes

* Retag action was calling the happy cli locally ([#125](https://github.com/chanzuckerberg/github-actions/issues/125)) ([d248b12](https://github.com/chanzuckerberg/github-actions/commit/d248b12e9f5f244b9d8bc723b699820f1fd4181a))

## [1.6.0](https://github.com/chanzuckerberg/github-actions/compare/v1.5.0...v1.6.0) (2022-06-22)


### Features

* Release retag-happy github action ([#123](https://github.com/chanzuckerberg/github-actions/issues/123)) ([449380c](https://github.com/chanzuckerberg/github-actions/commit/449380cc524a5c5d59fef8053f0d5ac484b3d515))

## [1.5.0](https://github.com/chanzuckerberg/github-actions/compare/v1.4.0...v1.5.0) (2022-06-22)


### Features

* add env-file option to happy stack deploy ([#116](https://github.com/chanzuckerberg/github-actions/issues/116)) ([3f9a5cd](https://github.com/chanzuckerberg/github-actions/commit/3f9a5cdaf50fafd6ced794a56e46177d216d149d))
* Last Successful Deployment Action and Re-tag Action ([#119](https://github.com/chanzuckerberg/github-actions/issues/119)) ([7477d71](https://github.com/chanzuckerberg/github-actions/commit/7477d71112ac0a744100f1cd7e8c5f7715f10f69))
* Release retag-happy github action ([#122](https://github.com/chanzuckerberg/github-actions/issues/122)) ([69b5e5f](https://github.com/chanzuckerberg/github-actions/commit/69b5e5f8535125d3c1cace92da4838df0aa06c2a))

## [1.4.0](https://github.com/chanzuckerberg/github-actions/compare/v1.3.4...v1.4.0) (2022-06-13)


### Features

* add delete functionality to deploy-happy-stack ([#115](https://github.com/chanzuckerberg/github-actions/issues/115)) ([512e55e](https://github.com/chanzuckerberg/github-actions/commit/512e55ede634ec6cc221063535daa1d0824932ce))

### [1.3.4](https://github.com/chanzuckerberg/github-actions/compare/v1.3.3...v1.3.4) (2022-06-02)


### Bug Fixes

* bump version ([#111](https://github.com/chanzuckerberg/github-actions/issues/111)) ([ed47eb4](https://github.com/chanzuckerberg/github-actions/commit/ed47eb41bd286fa7fda5cc15d4ff865dc0352f88))

### [1.3.3](https://github.com/chanzuckerberg/github-actions/compare/v1.3.2...v1.3.3) (2022-06-01)


### Bug Fixes

* add docs to release-please version ([#107](https://github.com/chanzuckerberg/github-actions/issues/107)) ([989f4ba](https://github.com/chanzuckerberg/github-actions/commit/989f4bacacd23ab2b4373da1c8878cff4b7f6ebd))

### [1.3.2](https://github.com/chanzuckerberg/github-actions/compare/v1.3.1...v1.3.2) (2022-06-01)


### Bug Fixes

* update version of install happy ([#105](https://github.com/chanzuckerberg/github-actions/issues/105)) ([59cd968](https://github.com/chanzuckerberg/github-actions/commit/59cd968312f3bd7fd1e2c9a8df7fea1d3d9b2e6d))

### [1.3.1](https://github.com/chanzuckerberg/github-actions/compare/v1.3.0...v1.3.1) (2022-06-01)


### Bug Fixes

* update version of install-happy ([#103](https://github.com/chanzuckerberg/github-actions/issues/103)) ([ec97286](https://github.com/chanzuckerberg/github-actions/commit/ec972863ddaccd2fdcd872646f975c8ea5f3f284))

## [1.3.0](https://github.com/chanzuckerberg/github-actions/compare/v1.2.2...v1.3.0) (2022-05-26)


### Features

* Add the ability to pass arbitrary tag into deploy-happy-stack action ([#98](https://github.com/chanzuckerberg/github-actions/issues/98)) ([5c2ab58](https://github.com/chanzuckerberg/github-actions/commit/5c2ab58d3a49b66295954382b405e7fd52ec70a6))
* Support installing the happy CLI system-wide ([#96](https://github.com/chanzuckerberg/github-actions/issues/96)) ([f8857aa](https://github.com/chanzuckerberg/github-actions/commit/f8857aa7f28f9514d0e7794e9ec7aec0c623b394))


### Bug Fixes

* Typo in a tag parameter description ([#99](https://github.com/chanzuckerberg/github-actions/issues/99)) ([ad477a1](https://github.com/chanzuckerberg/github-actions/commit/ad477a1c7cb46ea8ea73879c6080fd2f462e6ef5))

### [1.2.2](https://github.com/chanzuckerberg/github-actions/compare/v1.2.1...v1.2.2) (2022-04-26)


### Bug Fixes

* version update ([#87](https://github.com/chanzuckerberg/github-actions/issues/87)) ([97ede60](https://github.com/chanzuckerberg/github-actions/commit/97ede60fee4a44fda4d4c697be060043b4cc0ad9))

### [1.2.1](https://github.com/chanzuckerberg/github-actions/compare/v1.2.0...v1.2.1) (2022-04-26)


### Bug Fixes

* deploy-happy-stack: fix bug introduced by new ENV parameter ([#82](https://github.com/chanzuckerberg/github-actions/issues/82)) ([17414e4](https://github.com/chanzuckerberg/github-actions/commit/17414e497606b2a5f6336e3db54ac6845422d848))

## [1.2.0](https://github.com/chanzuckerberg/github-actions/compare/v1.1.0...v1.2.0) (2022-04-23)


### Features

* version bump ([4746e1b](https://github.com/chanzuckerberg/github-actions/commit/4746e1bc05fbeaeddcf2a43496744c2cd7a20976))

## [1.1.0](https://github.com/chanzuckerberg/github-actions/compare/v1.0.5...v1.1.0) (2022-04-23)


### Features

* version bump ([639bd72](https://github.com/chanzuckerberg/github-actions/commit/639bd7271dca3a6cad3b8429c1d39ad5275ce592))
* version bump ([8f24ce6](https://github.com/chanzuckerberg/github-actions/commit/8f24ce67498d7f2eef6f6902854f1d6568090636))


### Bug Fixes

* version bump ([6d80c28](https://github.com/chanzuckerberg/github-actions/commit/6d80c281ff91d19bbdcc6aa2365af51b0e1da2b8))
* version bump ([6691a5a](https://github.com/chanzuckerberg/github-actions/commit/6691a5ae1282d1869096bbe7a35e97efde504a07))
* version bump ([198a667](https://github.com/chanzuckerberg/github-actions/commit/198a6675401b2979dba79bf94cf8ea37eaa62bd6))

### [1.0.5](https://github.com/chanzuckerberg/github-actions/compare/v1.0.4...v1.0.5) (2022-04-23)


### Bug Fixes

* version bump ([931198a](https://github.com/chanzuckerberg/github-actions/commit/931198a3d01023001ce41326dcd4c460a9a00d06))
* version bump ([c908b5b](https://github.com/chanzuckerberg/github-actions/commit/c908b5b232fa5e57b5a2ec15405e69b2ed1c9e3c))
* version bump2 ([90e9f89](https://github.com/chanzuckerberg/github-actions/commit/90e9f89b1ba526bd7c1b8ce2f9a7640a15a5eae6))
* version bump2 ([1a27700](https://github.com/chanzuckerberg/github-actions/commit/1a277004ac7451cc40a85ea9efcbdfe782087fbb))

### [1.0.4](https://github.com/chanzuckerberg/github-actions/compare/v1.0.3...v1.0.4) (2022-04-23)


### Bug Fixes

* revert back to main version ([a6ddf36](https://github.com/chanzuckerberg/github-actions/commit/a6ddf36a0b1425188a66d538505e8eb727680480))
* revert revert ([3101e8b](https://github.com/chanzuckerberg/github-actions/commit/3101e8bb6c5086f4b396d02df192a5f3aec0e513))

### [1.0.3](https://github.com/chanzuckerberg/github-actions/compare/v1.0.2...v1.0.3) (2022-04-23)


### Bug Fixes

* remove install happy test comment ([6a204e5](https://github.com/chanzuckerberg/github-actions/commit/6a204e599d05f5b5ab8d171912342e77f4967208))
* removing last test comment ([6fe5eab](https://github.com/chanzuckerberg/github-actions/commit/6fe5eabaece50cc5320fb709010188cf9cbda456))

### [1.0.2](https://github.com/chanzuckerberg/github-actions/compare/v1.0.1...v1.0.2) (2022-04-23)


### Bug Fixes

* delete version.txt ([7b20373](https://github.com/chanzuckerberg/github-actions/commit/7b203735ce07ff062a4489126d5b8f6fc3084e8a))
* install-happy ([2c14ebb](https://github.com/chanzuckerberg/github-actions/commit/2c14ebb7cab8fecf2d5e24d2ad79befec2adb4d7))
* remove comment ([c613a08](https://github.com/chanzuckerberg/github-actions/commit/c613a0824523e44682eee635a2c1558c0107a280))
* test ([a1f42eb](https://github.com/chanzuckerberg/github-actions/commit/a1f42ebdd7b8ec064e4a9b9c0a87d13f1f0f91c5))
* test docker-build push ([de82461](https://github.com/chanzuckerberg/github-actions/commit/de8246115500c196391998e5c64ceea58c370009))
* test get-github ([6f0b5f1](https://github.com/chanzuckerberg/github-actions/commit/6f0b5f17897122721a841303c2779119477b6540))

### [1.0.1](https://github.com/chanzuckerberg/github-actions/compare/v1.0.0...v1.0.1) (2022-04-23)


### Bug Fixes

* add comment to test ([1d4efca](https://github.com/chanzuckerberg/github-actions/commit/1d4efca59da673e7541bac5817eecc70d7d82258))
* revert comment ([9d7f8de](https://github.com/chanzuckerberg/github-actions/commit/9d7f8dee196875f1378acb12ffe0898148db5c09))
* test ([343ae2c](https://github.com/chanzuckerberg/github-actions/commit/343ae2c1311a684dd449a57e724db5a570940142))

## 1.0.0 (2022-04-23)


### Bug Fixes

* test ([343ae2c](https://github.com/chanzuckerberg/github-actions/commit/343ae2c1311a684dd449a57e724db5a570940142))

### [2.0.1](https://github.com/chanzuckerberg/github-actions/compare/v2.0.0...v2.0.1) (2022-04-23)


### Bug Fixes

* test ([#65](https://github.com/chanzuckerberg/github-actions/issues/65)) ([fecd0a2](https://github.com/chanzuckerberg/github-actions/commit/fecd0a287fa3e033e21902968c95b83f8bf21f74))

### [1.8.10](https://github.com/chanzuckerberg/github-actions/compare/v1.8.9...v1.8.10) (2022-04-23)


### Bug Fixes

* test ([#65](https://github.com/chanzuckerberg/github-actions/issues/65)) ([fecd0a2](https://github.com/chanzuckerberg/github-actions/commit/fecd0a287fa3e033e21902968c95b83f8bf21f74))

### [1.8.9](https://github.com/chanzuckerberg/github-actions/compare/v1.8.8...v1.8.9) (2022-04-22)


### Bug Fixes

* adding env to list check ([#63](https://github.com/chanzuckerberg/github-actions/issues/63)) ([72114b7](https://github.com/chanzuckerberg/github-actions/commit/72114b738e257cbc77281a5abd9f1e58bb303cd7))

### [1.8.8](https://github.com/chanzuckerberg/github-actions/compare/v1.8.7...v1.8.8) (2022-04-21)


### Bug Fixes

* test ([#60](https://github.com/chanzuckerberg/github-actions/issues/60)) ([0eee7f3](https://github.com/chanzuckerberg/github-actions/commit/0eee7f35fd1a984cc76c0a621e0f84d4e39b1599))

### [1.8.7](https://github.com/chanzuckerberg/github-actions/compare/v1.8.6...v1.8.7) (2022-04-21)


### Bug Fixes

* add bootstrap-sha ([#58](https://github.com/chanzuckerberg/github-actions/issues/58)) ([c6d62e2](https://github.com/chanzuckerberg/github-actions/commit/c6d62e2231f97c718e57332955304925bc0946bd))

### [1.8.6](https://github.com/chanzuckerberg/github-actions/compare/v1.8.5...v1.8.6) (2022-04-21)


### Bug Fixes

* version.txt ([#55](https://github.com/chanzuckerberg/github-actions/issues/55)) ([e17782b](https://github.com/chanzuckerberg/github-actions/commit/e17782bd282708185060fcebdce9378578fbb6e9))
* version.txt ([#57](https://github.com/chanzuckerberg/github-actions/issues/57)) ([6aa749b](https://github.com/chanzuckerberg/github-actions/commit/6aa749b3aeed3f48b4be13783b1e1bbec4136cfa))

### [1.8.5](https://github.com/chanzuckerberg/github-actions/compare/v1.8.4...v1.8.5) (2022-04-21)


### Bug Fixes

* blah ([#53](https://github.com/chanzuckerberg/github-actions/issues/53)) ([842818a](https://github.com/chanzuckerberg/github-actions/commit/842818aef61bc2937a22fcaff2315144b0171c46))

### [1.8.4](https://github.com/chanzuckerberg/github-actions/compare/v1.8.3...v1.8.4) (2022-04-21)


### Bug Fixes

* initial version ([#51](https://github.com/chanzuckerberg/github-actions/issues/51)) ([cb3eac9](https://github.com/chanzuckerberg/github-actions/commit/cb3eac9de53cc005d9055c9f1b358991950645c2))
* only tag get-github-ref-names ([#49](https://github.com/chanzuckerberg/github-actions/issues/49)) ([110bf8f](https://github.com/chanzuckerberg/github-actions/commit/110bf8f705d931947df5eb1772bce3d9236f0b17))
* the tagging ([d3fcc37](https://github.com/chanzuckerberg/github-actions/commit/d3fcc37fd587724083bc65c8f36c71ce8b81c92e))

### [1.8.3](https://github.com/chanzuckerberg/github-actions/compare/v1.8.2...v1.8.3) (2022-04-21)


### Bug Fixes

* the tagging ([d3fcc37](https://github.com/chanzuckerberg/github-actions/commit/d3fcc37fd587724083bc65c8f36c71ce8b81c92e))

### [1.8.2](https://github.com/chanzuckerberg/github-actions/compare/v1.8.1...v1.8.2) (2022-04-20)


### Bug Fixes

* the test code so that PRs are back to where they were ([#43](https://github.com/chanzuckerberg/github-actions/issues/43)) ([4c53d19](https://github.com/chanzuckerberg/github-actions/commit/4c53d1923a16b14174efc4a749c63ff4cf06004c))

### [1.8.1](https://github.com/chanzuckerberg/github-actions/compare/v1.8.0...v1.8.1) (2022-04-20)


### Bug Fixes

* revert version of release-please ([#36](https://github.com/chanzuckerberg/github-actions/issues/36)) ([330cc32](https://github.com/chanzuckerberg/github-actions/commit/330cc32f459de0911625eea673b93d6cc09c89e1))
* revert version of release-please ([#37](https://github.com/chanzuckerberg/github-actions/issues/37)) ([dfdc2f8](https://github.com/chanzuckerberg/github-actions/commit/dfdc2f83cf7e9540a3add14616f63d237dfec9bd))
* testing if a fix makes a release PR ([#41](https://github.com/chanzuckerberg/github-actions/issues/41)) ([a1e5df5](https://github.com/chanzuckerberg/github-actions/commit/a1e5df542e66f5d71cb17dbc7fc5060a598d194f))

## [1.8.0](https://github.com/chanzuckerberg/github-actions/compare/v1.7.0...v1.8.0) (2022-04-19)


### Features

* adding env input to create/update stack ([#32](https://github.com/chanzuckerberg/github-actions/issues/32)) ([3d50d97](https://github.com/chanzuckerberg/github-actions/commit/3d50d9785aaa8e3cac51a280b3420360c2198f58))

## [1.7.0](https://github.com/chanzuckerberg/github-actions/compare/v1.6.0...v1.7.0) (2022-04-15)


### Features

* Docker Build and Push Upgrade get-github-ref-names to v1.6.0 ([#30](https://github.com/chanzuckerberg/github-actions/issues/30)) ([85ea809](https://github.com/chanzuckerberg/github-actions/commit/85ea80906696110eb9f6ebdcde7e4cf5faa8c280))

## [1.6.0](https://github.com/chanzuckerberg/github-actions/compare/v1.5.1...v1.6.0) (2022-04-15)


### Features

* **get-github-ref-names:** Add support for release event ([#28](https://github.com/chanzuckerberg/github-actions/issues/28)) ([b234d6e](https://github.com/chanzuckerberg/github-actions/commit/b234d6e2dd14b58b1cf8f03a3acf046175a449a2))

### [1.5.1](https://github.com/chanzuckerberg/github-actions/compare/v1.5.0...v1.5.1) (2022-04-06)


### Bug Fixes

* Release action uses generated token ([#27](https://github.com/chanzuckerberg/github-actions/issues/27)) ([2141470](https://github.com/chanzuckerberg/github-actions/commit/2141470140bb7a7521017603979c33b7e07de3ad))
* Update internal versions to latest ([#25](https://github.com/chanzuckerberg/github-actions/issues/25)) ([c4b5600](https://github.com/chanzuckerberg/github-actions/commit/c4b5600b452b6a52f89e6e668b3a1acf1dcac63d))

## [1.5.0](https://github.com/chanzuckerberg/github-actions/compare/v1.4.0...v1.5.0) (2022-04-06)


### Features

* Enable dependabot to keep GHA versions up to date; pin latest; happy-deploy-stack allows setting happy cli version ([#23](https://github.com/chanzuckerberg/github-actions/issues/23)) ([abb2f43](https://github.com/chanzuckerberg/github-actions/commit/abb2f43aa173caa13b3602415d482ca9bbf6d395))

## [1.4.0](https://github.com/chanzuckerberg/github-actions/compare/v1.3.0...v1.4.0) (2022-04-06)


### Features

* Docker Build + Push; Get Github Ref Names ([#22](https://github.com/chanzuckerberg/github-actions/issues/22)) ([09a79d8](https://github.com/chanzuckerberg/github-actions/commit/09a79d869f781d2069e81965d570c1ff1bc5b1b1))
* Enforce conventional commits pr title ([#21](https://github.com/chanzuckerberg/github-actions/issues/21)) ([2b376db](https://github.com/chanzuckerberg/github-actions/commit/2b376db625877205ca782566696f1c53dea32f68))

## [1.3.0](https://github.com/chanzuckerberg/github-actions/compare/v1.2.0...v1.3.0) (2022-03-10)


### Features

* happy push, docker build+push, install happy ([#17](https://github.com/chanzuckerberg/github-actions/issues/17)) ([62ea2cb](https://github.com/chanzuckerberg/github-actions/commit/62ea2cb4247fd65ae7dec27ffadf58696abd3c29))

## [1.2.0](https://github.com/chanzuckerberg/github-actions/compare/v1.1.0...v1.2.0) (2022-03-02)


### Features

* Shared action to create or update a happy stack ([#15](https://github.com/chanzuckerberg/github-actions/issues/15)) ([e3eec6a](https://github.com/chanzuckerberg/github-actions/commit/e3eec6a2bc334818c2991b2e28771a87e4ca8844))

## [1.1.0](https://github.com/chanzuckerberg/github-actions/compare/v1.0.0...v1.1.0) (2022-03-02)


### Features

* Add a GH action to download and install Happy CLI ([#13](https://github.com/chanzuckerberg/github-actions/issues/13)) ([0a179f1](https://github.com/chanzuckerberg/github-actions/commit/0a179f1b1dd6ad84239259e92386d2863c006f56))

## 1.0.0 (2022-03-01)


### Features

* docker-build-push action ([#11](https://github.com/chanzuckerberg/github-actions/issues/11)) ([5fb3b67](https://github.com/chanzuckerberg/github-actions/commit/5fb3b6715e829dad16b4c088b8636b710e18f2c6))
* Initial Code + Conventional Commits Action ([d10c2e5](https://github.com/chanzuckerberg/github-actions/commit/d10c2e59399b9c8275e41b34c24f264a245a8ead))


### Bug Fixes

* Add empty release manifest ([6ef2570](https://github.com/chanzuckerberg/github-actions/commit/6ef2570b372f26c141ff36c605dbf9206f645da8))
* address reusable actions must be rooted in .github/workflows ([#10](https://github.com/chanzuckerberg/github-actions/issues/10)) ([7058aef](https://github.com/chanzuckerberg/github-actions/commit/7058aefe53e4aebcbc7a8b1dcaffd8cb2bb10230))
* attempt to set the initial version to 0.0.0 ([2ab3e7e](https://github.com/chanzuckerberg/github-actions/commit/2ab3e7e629be7687ccbf80f9f30859da15107a37))
* attempt to set the initial version to 0.0.0 ([00674c3](https://github.com/chanzuckerberg/github-actions/commit/00674c356a8a3bf8c2034e4f42257ede190e6709))
* attempt to set the initial version to 0.0.0 ([4396768](https://github.com/chanzuckerberg/github-actions/commit/4396768ead3deb68c727268ff6e93fc5357167ab))
* attempt to set the initial version to 0.0.0 ([caab874](https://github.com/chanzuckerberg/github-actions/commit/caab8742b119e127145b9d3d17091376514b1581))
* conventional-commits don't require pr-title ([14a7be4](https://github.com/chanzuckerberg/github-actions/commit/14a7be4f0fa6084b60c7400c12c1d71b57a1a00b))
* Revert to using GoogleCloudPlatform/release-please-action ([0d5a997](https://github.com/chanzuckerberg/github-actions/commit/0d5a997cb3be0bc74e3834727a5c0fb66c3d3a7f))
* try cleaning manifest ([0b9a98c](https://github.com/chanzuckerberg/github-actions/commit/0b9a98c635f712ae22e2e296a4b9892ad663a250))
* Use the secrets.GITHUB_TOKEN for release action ([171fe89](https://github.com/chanzuckerberg/github-actions/commit/171fe89cafef26d0253f3dfe75eaf0d6c1927439))
