# github-actions
The purpose of this repo is to host a collection of re-usable actions for usage across CZI.
See the [official docs](https://docs.github.com/en/actions/using-workflows/reusing-workflows) for more information.

Each workflow will be released with a distinct tag following semver and conventional commits.


NOTE:

GitHub has an undocumented limitation with reusable Actions -- they must all live under `.github/workflows/`

## Installation

For some actions you will need to have a helper Github
Application configured to act on behalf of Actions.
Please [register an app](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app)
and set these organization level
[Github action secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

* GH_ACTIONS_HELPER_APP_ID - app id of the github app you created
* GH_ACTIONS_HELPER_PK - you need to generate a private key in the app settings and set the value of this secret to the private key

## Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](https://github.com/chanzuckerberg/.github/blob/master/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [opensource@chanzuckerberg.com](mailto:opensource@chanzuckerberg.com).
