#!/bin/bash

# Usage: ./run-playbook.sh path/to/playbook.yml

# Check if playbook parameter is provided
if [ -z "$1" ]; then
  echo "Usage: $0 path/to/playbook.yml"
  exit 1
fi

PLAYBOOK_PATH="$1"

# Run the ansible-playbook command with the provided playbook
ansible-playbook -i inventory/all.yml "$PLAYBOOK_PATH" --vault-password-file .vault_pass.txt