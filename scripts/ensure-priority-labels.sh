#!/bin/bash

# Script to ensure P0-P3 priority labels exist in the repository
# If a label doesn't exist, it will be created with a standard color

set -e

echo "Ensuring P0-P3 priority labels exist..."

# Define priority labels with their standard colors
# P0 (Critical): Red - highest priority, needs immediate attention
# P1 (High): Light red/orange - high priority
# P2 (Medium): Yellow - medium priority
# P3 (Low): Blue - low priority

declare -A LABELS
LABELS["P0"]="d73a4a"
LABELS["P1"]="e99695"
LABELS["P2"]="fbca04"
LABELS["P3"]="0075ca"

# Get all existing labels
EXISTING_LABELS=$(gh label list --json name --jq '.[].name')

# Check and create each priority label if it doesn't exist
for LABEL_NAME in "${!LABELS[@]}"; do
  COLOR="${LABELS[$LABEL_NAME]}"

  if echo "$EXISTING_LABELS" | grep -q "^${LABEL_NAME}$"; then
    echo "✓ Label '$LABEL_NAME' already exists"
  else
    echo "Creating label '$LABEL_NAME' with color #${COLOR}..."
    gh label create "$LABEL_NAME" --color "$COLOR" --description "Priority ${LABEL_NAME: -1}"
    echo "✓ Created label '$LABEL_NAME'"
  fi
done

echo ""
echo "All priority labels are now available:"
gh label list | grep -E "^P[0-3]" || echo "No priority labels found (this shouldn't happen)"
