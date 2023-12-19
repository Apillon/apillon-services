#!/bin/bash

# List all Lambda functions
FUNCTION_NAMES=$(aws lambda list-functions | jq -r '.Functions[].FunctionName')

# Loop through each function
for FUNCTION_NAME in $FUNCTION_NAMES; do
    echo "Processing $FUNCTION_NAME"

    # Get all versions except the latest ($LATEST)
    VERSIONS_TO_DELETE=$(aws lambda list-versions-by-function --function-name $FUNCTION_NAME | jq -r '.Versions[] | select(.Version != "$LATEST") | .Version')

    # Loop through and delete each old version
    for VERSION in $VERSIONS_TO_DELETE; do
        echo "Deleting version $VERSION of $FUNCTION_NAME"
        aws lambda delete-function --function-name $FUNCTION_NAME --qualifier $VERSION
    done
done

echo "Old versions deletion for all functions completed."
