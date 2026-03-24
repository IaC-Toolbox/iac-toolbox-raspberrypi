export $(grep -v '^#' .env | xargs)
ansible-playbook ./playbooks/seed_vault.yml