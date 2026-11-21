#!/bin/sh
# Idempotent bucket setup for any S3-compatible storage (ADR-14):
#   - creates the media bucket if it does not exist
#   - allows anonymous GetObject only (no anonymous list or write)
#   - allows browser uploads through presigned URLs from the web origins (CORS)
set -eu

endpoint="${STORAGE_ENDPOINT:?STORAGE_ENDPOINT is required}"
bucket="${STORAGE_BUCKET:?STORAGE_BUCKET is required}"
origins="${STORAGE_CORS_ORIGINS:?STORAGE_CORS_ORIGINS is required}"

s3api() {
  aws --endpoint-url "$endpoint" s3api "$@"
}

if s3api head-bucket --bucket "$bucket" >/dev/null 2>&1; then
  echo "Bucket '$bucket' already exists"
else
  s3api create-bucket --bucket "$bucket" >/dev/null
  echo "Created bucket '$bucket'"
fi

s3api put-bucket-policy --bucket "$bucket" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicReadObjects\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": [\"s3:GetObject\"],
    \"Resource\": [\"arn:aws:s3:::$bucket/*\"]
  }]
}"
echo "Applied public-read policy (objects only)"

# "a,b" -> "\"a\",\"b\""
quoted_origins=$(printf '%s' "$origins" | sed 's/[^,][^,]*/"&"/g')
s3api put-bucket-cors --bucket "$bucket" --cors-configuration "{
  \"CORSRules\": [{
    \"AllowedOrigins\": [$quoted_origins],
    \"AllowedMethods\": [\"GET\", \"PUT\"],
    \"AllowedHeaders\": [\"*\"],
    \"MaxAgeSeconds\": 3000
  }]
}"
echo "Applied CORS for origins: $origins"
