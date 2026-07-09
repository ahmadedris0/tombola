#!/usr/bin/env bash
set -euo pipefail
STAGE="${1:-dev}"
export AWS_PROFILE=sutoor
cd "$(git rev-parse --show-toplevel)"

output() {
  aws cloudformation describe-stacks --stack-name tombola-hosting-${STAGE} \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text --region eu-west-1
}

publish() {
  local app="$1" bucket="$2" dist="$3"
  pnpm --filter @tombola/${app} build
  aws s3 sync apps/${app}/dist "s3://${bucket}" --delete --region eu-west-1
  aws cloudfront create-invalidation --distribution-id "${dist}" --paths '/*' --region eu-west-1
  echo "Deployed apps/${app} to s3://${bucket} (distribution ${dist})"
}

publish web "$(output WebBucketName)" "$(output WebDistributionId)"
publish admin "$(output AdminBucketName)" "$(output AdminDistributionId)"
