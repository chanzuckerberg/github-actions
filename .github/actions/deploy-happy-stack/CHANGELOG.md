# Changelog

## [2.2.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v2.2.0...deploy-happy-stack-v2.2.1) (2025-04-30)


### Misc

* CCIE-3986 use persist-credentials: false in checkout ([#343](https://github.com/chanzuckerberg/github-actions/issues/343)) ([48b680f](https://github.com/chanzuckerberg/github-actions/commit/48b680fc469d837c851ea74d70c1842c42f6a3d1))

## [2.2.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v2.1.0...deploy-happy-stack-v2.2.0) (2024-11-26)


### Features

* allow skipping checking if tag exists ([f7a1cf7](https://github.com/chanzuckerberg/github-actions/commit/f7a1cf72543ac0b7e676959d4ffb046d09796ab3))

## [2.1.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v2.0.0...deploy-happy-stack-v2.1.0) (2024-04-19)


### Features

* always log in to core platform prod ECR ([#256](https://github.com/chanzuckerberg/github-actions/issues/256)) ([f0d73b9](https://github.com/chanzuckerberg/github-actions/commit/f0d73b9361e12fb38e554f4d5f1e578f656d2623))

## [2.0.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.17.1...deploy-happy-stack-v2.0.0) (2024-01-17)


### ⚠ BREAKING CHANGES

* don't checkout ref every time (#243)

### Bug Fixes

* don't checkout ref every time ([#243](https://github.com/chanzuckerberg/github-actions/issues/243)) ([94a4c59](https://github.com/chanzuckerberg/github-actions/commit/94a4c59a6e5c779a51deb42a042aea6c04c460ec))

### [1.17.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.17.0...deploy-happy-stack-v1.17.1) (2024-01-05)


### Bug Fixes

* only use slice flags when slice is set ([b10aa97](https://github.com/chanzuckerberg/github-actions/commit/b10aa97de100f0726e77015a1f7a492795dd645c))

## [1.17.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.16.0...deploy-happy-stack-v1.17.0) (2024-01-04)


### Features

* add slice to happy deploy stack action ([#236](https://github.com/chanzuckerberg/github-actions/issues/236)) ([04dbac6](https://github.com/chanzuckerberg/github-actions/commit/04dbac6485f7644dd3c0fe189d0b9aa11cb7c77e))

## [1.16.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.15.0...deploy-happy-stack-v1.16.0) (2023-10-27)


### Features

* include image-source-role-arn input for deploy happy ([#228](https://github.com/chanzuckerberg/github-actions/issues/228)) ([4168f8c](https://github.com/chanzuckerberg/github-actions/commit/4168f8c33d6d85d68c847da7a443969ed1cb5061))

## [1.15.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.14.0...deploy-happy-stack-v1.15.0) (2023-10-13)


### Features

* pass along args to allow a happy deploy from a diff repo ([#227](https://github.com/chanzuckerberg/github-actions/issues/227)) ([b358d74](https://github.com/chanzuckerberg/github-actions/commit/b358d74b04a30a1f5b0751d4859eeb97e50a56f0))

## [1.14.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.13.0...deploy-happy-stack-v1.14.0) (2023-09-01)


### Features

* allow deploy-happy-stack to sync with lock file ([#222](https://github.com/chanzuckerberg/github-actions/issues/222)) ([5f94a46](https://github.com/chanzuckerberg/github-actions/commit/5f94a4601e9548dc20fb9d015ae332b1d314c51d))

## [1.13.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.12.1...deploy-happy-stack-v1.13.0) (2023-08-09)


### Features

* Allow the github ref specification ([#209](https://github.com/chanzuckerberg/github-actions/issues/209)) ([c7c2ad7](https://github.com/chanzuckerberg/github-actions/commit/c7c2ad7a226e51e636e888c118919ad44519cf92))

### [1.12.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.12.0...deploy-happy-stack-v1.12.1) (2023-07-26)


### Bug Fixes

* install ghcli in tmp directory ([24fcf4f](https://github.com/chanzuckerberg/github-actions/commit/24fcf4fc7a56c5e18c99fa3b3b81f13d35a16235))

## [1.12.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.11.0...deploy-happy-stack-v1.12.0) (2023-07-24)


### Features

* upgrade actions/checkout to v3 ([#196](https://github.com/chanzuckerberg/github-actions/issues/196)) ([8bd4cbe](https://github.com/chanzuckerberg/github-actions/commit/8bd4cbe77bd5d616f90bf539bb11b97109cfa510))

## [1.11.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.10.0...deploy-happy-stack-v1.11.0) (2023-06-07)


### Features

* allow to promote images from stack and env ([#182](https://github.com/chanzuckerberg/github-actions/issues/182)) ([c5147b3](https://github.com/chanzuckerberg/github-actions/commit/c5147b340be6c0ce75df2ae472c860e69d16ee61))

## [1.10.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.9.1...deploy-happy-stack-v1.10.0) (2023-05-30)


### Features

* pin install-happy to main ([#181](https://github.com/chanzuckerberg/github-actions/issues/181)) ([371fc16](https://github.com/chanzuckerberg/github-actions/commit/371fc16845bfb8dd4b1b13b5ec9a56e14e81203c))

### [1.9.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.9.0...deploy-happy-stack-v1.9.1) (2023-05-11)


### Bug Fixes

* bump version of deploy-happy-stack ([8d0a0b3](https://github.com/chanzuckerberg/github-actions/commit/8d0a0b3f20059fbc70cd1beaaa9eab79e7cca569))

## [1.9.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.8.0...deploy-happy-stack-v1.9.0) (2023-05-11)


### Features

* add happy dependencies to the install happy script ([#175](https://github.com/chanzuckerberg/github-actions/issues/175)) ([0c33d3c](https://github.com/chanzuckerberg/github-actions/commit/0c33d3c782cb6475fe9e8fbca4046ced74789e4a))

## [1.8.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.7.2...deploy-happy-stack-v1.8.0) (2023-05-09)


### Features

* enable optional docker-compose-path argument ([#170](https://github.com/chanzuckerberg/github-actions/issues/170)) ([984f1dc](https://github.com/chanzuckerberg/github-actions/commit/984f1dcc78369c05f073af0887c94030cd36f21d))

### [1.7.2](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.7.1...deploy-happy-stack-v1.7.2) (2023-02-06)


### Bug Fixes

* update to use patched install-happy version ([#167](https://github.com/chanzuckerberg/github-actions/issues/167)) ([60c8231](https://github.com/chanzuckerberg/github-actions/commit/60c82314b1b6b416fb6a688e08bae47247bc640b))

### [1.7.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.7.0...deploy-happy-stack-v1.7.1) (2023-01-26)


### Bug Fixes

* upgrade to use fixed version of install-happy ([#162](https://github.com/chanzuckerberg/github-actions/issues/162)) ([057a65d](https://github.com/chanzuckerberg/github-actions/commit/057a65d3cd2ce807a34c4663d65a70ed69f680f7))

## [1.7.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.6.0...deploy-happy-stack-v1.7.0) (2022-11-14)


### Features

* allow specifying working direcory in happy stack deploy ([#153](https://github.com/chanzuckerberg/github-actions/issues/153)) ([2d0836c](https://github.com/chanzuckerberg/github-actions/commit/2d0836ce2f7a99ad36e16226743032326ca938c0))

## [1.6.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.5.4...deploy-happy-stack-v1.6.0) (2022-10-27)


### Features

* use new install-happy action ([#151](https://github.com/chanzuckerberg/github-actions/issues/151)) ([2b8d97a](https://github.com/chanzuckerberg/github-actions/commit/2b8d97a02357ccfd0252a40b686ef67021ec3f32))

### [1.5.4](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.5.3...deploy-happy-stack-v1.5.4) (2022-09-23)


### Bug Fixes

* **ONCALL-229:** Fix Create-or-update behavior of the deploy-happy-stack ([#147](https://github.com/chanzuckerberg/github-actions/issues/147)) ([c1dc456](https://github.com/chanzuckerberg/github-actions/commit/c1dc45631bcfb206d01ebc52f6ca815f92669f12))

### [1.5.3](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.5.2...deploy-happy-stack-v1.5.3) (2022-07-13)


### Bug Fixes

* When happy list errors out for whatever reason, treat it as a failure, not as an update ([#137](https://github.com/chanzuckerberg/github-actions/issues/137)) ([27fd165](https://github.com/chanzuckerberg/github-actions/commit/27fd1654aa10c5ecdada98b5a860ff78bf2a151e))

### [1.5.2](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.5.1...deploy-happy-stack-v1.5.2) (2022-07-01)


### Bug Fixes

* Stack update fails as grep doesn't pick up the output ([#130](https://github.com/chanzuckerberg/github-actions/issues/130)) ([a2db87d](https://github.com/chanzuckerberg/github-actions/commit/a2db87dc97959f5f43e68763b90378818910b9f6))

### [1.5.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.5.0...deploy-happy-stack-v1.5.1) (2022-06-28)


### Bug Fixes

* Incorrectly passed env-file argument ([#127](https://github.com/chanzuckerberg/github-actions/issues/127)) ([6a0ec96](https://github.com/chanzuckerberg/github-actions/commit/6a0ec963273ff32fd86f816c9b8517e070330458))

## [1.5.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.4.0...deploy-happy-stack-v1.5.0) (2022-06-22)


### Features

* add env-file option to happy stack deploy ([#116](https://github.com/chanzuckerberg/github-actions/issues/116)) ([3f9a5cd](https://github.com/chanzuckerberg/github-actions/commit/3f9a5cdaf50fafd6ced794a56e46177d216d149d))

## [1.4.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.3.2...deploy-happy-stack-v1.4.0) (2022-06-13)


### Features

* add delete functionality to deploy-happy-stack ([#115](https://github.com/chanzuckerberg/github-actions/issues/115)) ([512e55e](https://github.com/chanzuckerberg/github-actions/commit/512e55ede634ec6cc221063535daa1d0824932ce))

### [1.3.2](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.3.1...deploy-happy-stack-v1.3.2) (2022-06-02)


### Bug Fixes

* bump version ([#111](https://github.com/chanzuckerberg/github-actions/issues/111)) ([ed47eb4](https://github.com/chanzuckerberg/github-actions/commit/ed47eb41bd286fa7fda5cc15d4ff865dc0352f88))

### [1.3.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.3.0...deploy-happy-stack-v1.3.1) (2022-06-01)


### Bug Fixes

* update version of install happy ([#105](https://github.com/chanzuckerberg/github-actions/issues/105)) ([59cd968](https://github.com/chanzuckerberg/github-actions/commit/59cd968312f3bd7fd1e2c9a8df7fea1d3d9b2e6d))

## [1.2.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.1.0...deploy-happy-stack-v1.2.0) (2022-06-01)


### Features

* Add the ability to pass arbitrary tag into deploy-happy-stack action ([#98](https://github.com/chanzuckerberg/github-actions/issues/98)) ([5c2ab58](https://github.com/chanzuckerberg/github-actions/commit/5c2ab58d3a49b66295954382b405e7fd52ec70a6))


### Bug Fixes

* Typo in a tag parameter description ([#99](https://github.com/chanzuckerberg/github-actions/issues/99)) ([ad477a1](https://github.com/chanzuckerberg/github-actions/commit/ad477a1c7cb46ea8ea73879c6080fd2f462e6ef5))

## [1.1.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.0.4...deploy-happy-stack-v1.1.0) (2022-05-26)


### Features

* Add the ability to pass arbitrary tag into deploy-happy-stack action ([#98](https://github.com/chanzuckerberg/github-actions/issues/98)) ([5c2ab58](https://github.com/chanzuckerberg/github-actions/commit/5c2ab58d3a49b66295954382b405e7fd52ec70a6))


### Bug Fixes

* Typo in a tag parameter description ([#99](https://github.com/chanzuckerberg/github-actions/issues/99)) ([ad477a1](https://github.com/chanzuckerberg/github-actions/commit/ad477a1c7cb46ea8ea73879c6080fd2f462e6ef5))

### [1.0.4](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.0.3...deploy-happy-stack-v1.0.4) (2022-04-26)


### Bug Fixes

* deploy-happy-stack: fix bug introduced by new ENV parameter ([#82](https://github.com/chanzuckerberg/github-actions/issues/82)) ([17414e4](https://github.com/chanzuckerberg/github-actions/commit/17414e497606b2a5f6336e3db54ac6845422d848))

### [1.0.3](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.0.2...deploy-happy-stack-v1.0.3) (2022-04-23)


### Bug Fixes

* version bump ([931198a](https://github.com/chanzuckerberg/github-actions/commit/931198a3d01023001ce41326dcd4c460a9a00d06))
* version bump ([c908b5b](https://github.com/chanzuckerberg/github-actions/commit/c908b5b232fa5e57b5a2ec15405e69b2ed1c9e3c))
* version bump2 ([1a27700](https://github.com/chanzuckerberg/github-actions/commit/1a277004ac7451cc40a85ea9efcbdfe782087fbb))

### [1.0.2](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.0.1...deploy-happy-stack-v1.0.2) (2022-04-23)


### Bug Fixes

* delete version.txt ([7b20373](https://github.com/chanzuckerberg/github-actions/commit/7b203735ce07ff062a4489126d5b8f6fc3084e8a))
* revert comment ([9d7f8de](https://github.com/chanzuckerberg/github-actions/commit/9d7f8dee196875f1378acb12ffe0898148db5c09))
* test ([a1f42eb](https://github.com/chanzuckerberg/github-actions/commit/a1f42ebdd7b8ec064e4a9b9c0a87d13f1f0f91c5))
* test ([343ae2c](https://github.com/chanzuckerberg/github-actions/commit/343ae2c1311a684dd449a57e724db5a570940142))

### [1.0.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.0.0...deploy-happy-stack-v1.0.1) (2022-04-23)


### Bug Fixes

* revert comment ([9d7f8de](https://github.com/chanzuckerberg/github-actions/commit/9d7f8dee196875f1378acb12ffe0898148db5c09))

## 1.0.0 (2022-04-23)


### Bug Fixes

* test ([343ae2c](https://github.com/chanzuckerberg/github-actions/commit/343ae2c1311a684dd449a57e724db5a570940142))

### [1.8.8](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.8.7...deploy-happy-stack-v1.8.8) (2022-04-22)


### Bug Fixes

* adding env to list check ([#63](https://github.com/chanzuckerberg/github-actions/issues/63)) ([72114b7](https://github.com/chanzuckerberg/github-actions/commit/72114b738e257cbc77281a5abd9f1e58bb303cd7))

### [1.8.6](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.8.5...deploy-happy-stack-v1.8.6) (2022-04-21)


### Bug Fixes

* version.txt ([#57](https://github.com/chanzuckerberg/github-actions/issues/57)) ([6aa749b](https://github.com/chanzuckerberg/github-actions/commit/6aa749b3aeed3f48b4be13783b1e1bbec4136cfa))

### [1.8.5](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.8.4...deploy-happy-stack-v1.8.5) (2022-04-21)


### Bug Fixes

* version.txt ([#57](https://github.com/chanzuckerberg/github-actions/issues/57)) ([6aa749b](https://github.com/chanzuckerberg/github-actions/commit/6aa749b3aeed3f48b4be13783b1e1bbec4136cfa))

### [1.8.2](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.8.1...deploy-happy-stack-v1.8.2) (2022-04-21)


### Bug Fixes

* the test code so that PRs are back to where they were ([#43](https://github.com/chanzuckerberg/github-actions/issues/43)) ([4c53d19](https://github.com/chanzuckerberg/github-actions/commit/4c53d1923a16b14174efc4a749c63ff4cf06004c))

### [1.8.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.8.0...deploy-happy-stack-v1.8.1) (2022-04-20)


### Bug Fixes

* the test code so that PRs are back to where they were ([#43](https://github.com/chanzuckerberg/github-actions/issues/43)) ([4c53d19](https://github.com/chanzuckerberg/github-actions/commit/4c53d1923a16b14174efc4a749c63ff4cf06004c))

## [1.8.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.7.0...deploy-happy-stack-v1.8.0) (2022-04-20)


### Features

* adding env input to create/update stack ([#32](https://github.com/chanzuckerberg/github-actions/issues/32)) ([3d50d97](https://github.com/chanzuckerberg/github-actions/commit/3d50d9785aaa8e3cac51a280b3420360c2198f58))

## [1.7.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.6.0...deploy-happy-stack-v1.7.0) (2022-04-20)


### Features

* adding env input to create/update stack ([#32](https://github.com/chanzuckerberg/github-actions/issues/32)) ([3d50d97](https://github.com/chanzuckerberg/github-actions/commit/3d50d9785aaa8e3cac51a280b3420360c2198f58))

## [1.6.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.5.1...deploy-happy-stack-v1.6.0) (2022-04-19)


### Features

* adding env input to create/update stack ([#32](https://github.com/chanzuckerberg/github-actions/issues/32)) ([3d50d97](https://github.com/chanzuckerberg/github-actions/commit/3d50d9785aaa8e3cac51a280b3420360c2198f58))

### [1.5.1](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.5.0...deploy-happy-stack-v1.5.1) (2022-04-15)


### Bug Fixes

* Update internal versions to latest ([#25](https://github.com/chanzuckerberg/github-actions/issues/25)) ([c4b5600](https://github.com/chanzuckerberg/github-actions/commit/c4b5600b452b6a52f89e6e668b3a1acf1dcac63d))

## [1.5.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.4.0...deploy-happy-stack-v1.5.0) (2022-04-15)


### Features

* Enable dependabot to keep GHA versions up to date; pin latest; happy-deploy-stack allows setting happy cli version ([#23](https://github.com/chanzuckerberg/github-actions/issues/23)) ([abb2f43](https://github.com/chanzuckerberg/github-actions/commit/abb2f43aa173caa13b3602415d482ca9bbf6d395))


### Bug Fixes

* Update internal versions to latest ([#25](https://github.com/chanzuckerberg/github-actions/issues/25)) ([c4b5600](https://github.com/chanzuckerberg/github-actions/commit/c4b5600b452b6a52f89e6e668b3a1acf1dcac63d))

## [1.4.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.3.0...deploy-happy-stack-v1.4.0) (2022-04-06)


### Features

* Docker Build + Push; Get Github Ref Names ([#22](https://github.com/chanzuckerberg/github-actions/issues/22)) ([09a79d8](https://github.com/chanzuckerberg/github-actions/commit/09a79d869f781d2069e81965d570c1ff1bc5b1b1))
* Enable dependabot to keep GHA versions up to date; pin latest; happy-deploy-stack allows setting happy cli version ([#23](https://github.com/chanzuckerberg/github-actions/issues/23)) ([abb2f43](https://github.com/chanzuckerberg/github-actions/commit/abb2f43aa173caa13b3602415d482ca9bbf6d395))


### Bug Fixes

* Update internal versions to latest ([#25](https://github.com/chanzuckerberg/github-actions/issues/25)) ([c4b5600](https://github.com/chanzuckerberg/github-actions/commit/c4b5600b452b6a52f89e6e668b3a1acf1dcac63d))

## [1.3.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.2.0...deploy-happy-stack-v1.3.0) (2022-04-06)


### Features

* Docker Build + Push; Get Github Ref Names ([#22](https://github.com/chanzuckerberg/github-actions/issues/22)) ([09a79d8](https://github.com/chanzuckerberg/github-actions/commit/09a79d869f781d2069e81965d570c1ff1bc5b1b1))
* Enable dependabot to keep GHA versions up to date; pin latest; happy-deploy-stack allows setting happy cli version ([#23](https://github.com/chanzuckerberg/github-actions/issues/23)) ([abb2f43](https://github.com/chanzuckerberg/github-actions/commit/abb2f43aa173caa13b3602415d482ca9bbf6d395))
* happy push, docker build+push, install happy ([#17](https://github.com/chanzuckerberg/github-actions/issues/17)) ([62ea2cb](https://github.com/chanzuckerberg/github-actions/commit/62ea2cb4247fd65ae7dec27ffadf58696abd3c29))

## [1.2.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.1.0...deploy-happy-stack-v1.2.0) (2022-04-06)


### Features

* Docker Build + Push; Get Github Ref Names ([#22](https://github.com/chanzuckerberg/github-actions/issues/22)) ([09a79d8](https://github.com/chanzuckerberg/github-actions/commit/09a79d869f781d2069e81965d570c1ff1bc5b1b1))
* happy push, docker build+push, install happy ([#17](https://github.com/chanzuckerberg/github-actions/issues/17)) ([62ea2cb](https://github.com/chanzuckerberg/github-actions/commit/62ea2cb4247fd65ae7dec27ffadf58696abd3c29))

## [1.1.0](https://github.com/chanzuckerberg/github-actions/compare/deploy-happy-stack-v1.0.0...deploy-happy-stack-v1.1.0) (2022-03-10)


### Features

* happy push, docker build+push, install happy ([#17](https://github.com/chanzuckerberg/github-actions/issues/17)) ([62ea2cb](https://github.com/chanzuckerberg/github-actions/commit/62ea2cb4247fd65ae7dec27ffadf58696abd3c29))

## 1.0.0 (2022-03-02)


### Features

* Shared action to create or update a happy stack ([#15](https://github.com/chanzuckerberg/github-actions/issues/15)) ([e3eec6a](https://github.com/chanzuckerberg/github-actions/commit/e3eec6a2bc334818c2991b2e28771a87e4ca8844))
