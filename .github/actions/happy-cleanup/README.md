# Happy Cleanup
This action is meant to assist with the cleanup of stale happy stacks. It should be used with a 
Github Cron job action, which regularly scans for stacks that have not been updated in a period
of time and deletes them. This should probably only be utilized in non-production environments.

# Usage

You are required to configure AWS Access that is authorized make all the actions happy needs.

## example
```yaml
name: Clean up stale happy stacks every hour

on:
  schedule:
    # Runs "at minute 55 past every hour" (see https://crontab.guru)
    - cron: '55 * * * *'
jobs:
  build:
    name: Clean happy stacks
    runs-on: ubuntu-20.04  
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-region: us-west-2
          role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
          role-duration-seconds: 1200
          role-session-name: HappyCleanup
      - name: Clean up stale happy stacks
        uses: chanzuckerberg/github-actions/.github/actions/happy-cleanup@happy-cleanup-v1.0.0
        with:
          tfe_token: ${{secrets.TFE_TOKEN}}
```
