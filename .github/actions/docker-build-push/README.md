# Docker Build And Push
This action is meant to help building and pushing images to an ECR registry.
Note that for now, we only support ECR registries but open to adding functionality as needed.

We build a standard set of tags as:
- branch-{name of your branch}
- pr-{your pr number}
- semver: (if derived from a tag)
- semver: {major}.{minor} (if derived from a tag)
- sha-{long sha}
- sha-{short sha}

# Usage

You are required to configure AWS Access that is authorized to interact with the ECR registry prior to using this action.

We will release versions of this action following SEMVER convetions using the tag as `docker-build-push-vX.Y.Z`.

## example
```yaml
name: Build Docker images

on:
  pull_request:

env:
jobs:
  build-push-images:
    runs-on: ubuntu-20.04
    strategy:
      matrix:
        # An example building multiple docker images in parallel
        image:
          - dockerfile: src/backend/Dockerfile
            context: ./src/backend/
            name: backend
          - dockerfile: src/frontend/Dockerfile
            context: ./src/frontend/
            name: frontend
    steps:
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          role-duration-seconds: 900
      - name: Build And Push
        uses: chanzuckerberg/github-actions/.github/actions/docker-build-push@docker-build-push-v1.3.0
        with:
          dockerfile: ${{ matrix.image.dockerfile }}
          context: ${{ matrix.image.context }}
          name: ${{ matrix.image.name }}
          registry: ${{ secrets.ECR_REPO }}

```
