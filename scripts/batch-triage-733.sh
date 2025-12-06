#!/bin/bash
set -e

echo "Starting batch triage execution for issue #733..."

# Close duplicates
echo ""
echo "Closing duplicate issues..."

echo "Closing #709 as duplicate of #708..."
gh issue close 709 --comment "Closing as duplicate of #708. Consolidating packaging discussion under #710." --reason "not planned"

echo "Closing #681 as duplicate of #683..."
gh issue close 681 --comment "Closing as duplicate of #683." --reason "not planned"

echo "Closing #682 as duplicate of #683..."
gh issue close 682 --comment "Closing as duplicate of #683." --reason "not planned"

# Apply priority labels
echo ""
echo "Applying priority labels..."

echo "Applying P0 labels..."
gh issue edit 714 --add-label "P0"
gh issue edit 711 --add-label "P0"
gh issue edit 710 --add-label "P0"
gh issue edit 693 --add-label "P0"

echo "Applying P1 labels..."
gh issue edit 690 --add-label "P1"
gh issue edit 683 --add-label "P1"

echo "Applying P2 labels..."
gh issue edit 695 --add-label "P2"
gh issue edit 692 --add-label "P2"
gh issue edit 676 --add-label "P2"

echo "Applying P3 labels..."
gh issue edit 649 --add-label "P3"

# Close triage task
echo ""
echo "Closing triage task #712..."
gh issue close 712 --comment "Deduplication complete. All triage tasks executed." --reason "completed"

# Close this execution log
echo ""
echo "Closing execution log #733..."
gh issue close 733 --comment "Batch triage execution completed successfully." --reason "completed"

echo ""
echo "Batch triage execution completed!"
