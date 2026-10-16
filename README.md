# github-actions
The purpose of this repo is to host a collection of re-usable actions for usage across CZI.
See the [official docs](https://docs.github.com/en/actions/using-workflows/reusing-workflows) for more information.

See the [repository documentation](docs/index.md) for guides to these actions and workflows.

Each workflow will be released with a distinct tag following semver and conventional commits.


NOTE:

GitHub has an undocumented limitation with reusable Actions -- they must all live under `.github/workflows/`

## Documentation publishing

The documentation uses GitHub Pages' built-in Jekyll publishing and the supported Minimal theme, configured in [docs/_config.yml](docs/_config.yml).
A repository administrator must open **Settings → Pages → Build and deployment**, select **Deploy from a branch**, and choose **main** and **/docs**.
GitHub then builds and publishes the site when documentation changes merge into `main`; this repository does not need a custom documentation workflow.
Once deployed, the site is available at [chanzuckerberg.github.io/github-actions](https://chanzuckerberg.github.io/github-actions/).

Edit the Markdown files under `docs/` and use relative `.md` links so navigation works both on GitHub and on the published site.
Keep the HTML-commented Liquid `raw` markers around workflow examples containing GitHub Actions expressions; they prevent Jekyll from interpreting those expressions while keeping the markers hidden when reading the Markdown on GitHub.

## Installation

For some actions you will need to have a helper Github Application configured to act on behalf of Actions.
Please [register an app](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app) and set these organization level [Github action secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions).

* GH_ACTIONS_HELPER_APP_ID - app id of the github app you created
* GH_ACTIONS_HELPER_PK - you need to generate a private key in the app settings and set the value of this secret to the private key

## Code of Conduct

This project adheres to the Contributor Covenant [code of conduct](https://github.com/chanzuckerberg/.github/blob/master/CODE_OF_CONDUCT.md).
By participating, you are expected to uphold this code.
Please report unacceptable behavior to [opensource@chanzuckerberg.com](mailto:opensource@chanzuckerberg.com).
