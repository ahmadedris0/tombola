#!/usr/bin/env bash
set -euo pipefail
STAGE="${1:-dev}"
export AWS_PROFILE=sutoor

pnpm --filter @tombola/web build
BUCKET=$(aws cloudformation describe-stacks --stack-name tombola-hosting-${STAGE} \
  --query "Stacks[0].Outputs[?OutputKey=='WebBucketName'].OutputValue" --output text --region eu-west-1)
DIST=$(aws cloudformation describe-stacks --stack-name tombola-hosting-${STAGE} \
  --query "Stacks[0].Outputs[?OutputKey=='WebDistributionId'].OutputValue" --output text --region eu-west-1)

aws s3 sync apps/web/dist "s3://${BUCKET}" --delete --region eu-west-1
aws cloudfront create-invalidation --distribution-id "${DIST}" --paths '/*' --region eu-west-1
echo "Deployed apps/web to s3://${BUCKET} (distribution ${DIST})"
