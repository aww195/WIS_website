#!/usr/bin/env bash
# Build and deploy the contact-form Lambda. Nothing is hard-coded: the
# function name and region come from the environment, so this file carries
# no account-specific value (NFR-9).
#
#   CONTACT_FUNCTION_NAME=wis-contact-v2 AWS_REGION=us-east-1 bash scripts/deploy-contact.sh
set -euo pipefail
cd "$(dirname "$0")/../infra/contact"

: "${CONTACT_FUNCTION_NAME:?set CONTACT_FUNCTION_NAME (e.g. wis-contact-v2)}"
: "${AWS_REGION:?set AWS_REGION (e.g. us-east-1)}"

npm ci --no-audit --no-fund
npm run build

aws lambda update-function-code \
  --region "$AWS_REGION" \
  --function-name "$CONTACT_FUNCTION_NAME" \
  --zip-file fileb://function.zip \
  --output text --query 'LastUpdateStatus'

aws lambda wait function-updated-v2 --region "$AWS_REGION" --function-name "$CONTACT_FUNCTION_NAME"
echo "deployed $CONTACT_FUNCTION_NAME ($AWS_REGION)"
