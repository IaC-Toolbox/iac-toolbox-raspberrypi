
## Short-cut vault password in the file

To use a custom password file with `ansible-vault` instead of being prompted interactively (`--ask-vault-pass`), you can use the `--vault-password-file` option.

```bash
ansible-playbook -i inventory/all.yml playbooks/playbook.yml --vault-password-file .vault_pass.txt
```

E voilá, your Raspberry pi is ready to run your apps, the infrastructure part is finished here.

## Description of playbooks

This section outlines detailed description of what each playbook does. You can skip and browse the code yourself and use this section as a handy complementary document describing what happens in details and so pre-requisites for running ansible

### Prepare Ansible on Your Mac

The Ansible works in a way that the "master" machine installs connects remotely to hosts and executes ansible on them. The ansible runs on the master machine. In this example, we are using Mac laptop to run infra, so lets install ansible on mac

```bash
brew install ansible
```

### Code overview

We need to create `inventory` and `playbook`. Inventory describes hosts where to install software/configurations. In this case, it is a single raspberry-pi with SSH connection. An inventory file (e.g., `inventory.yml`):

```yml
# inventory.yml
all:
  hosts:
    raspberrypi:
      ansible_host: raspberrypi.local
      ansible_user: vvasylkovskyi
      ansible_ssh_private_key_file: ~/.ssh/<your-key-file>
```

The Playbooks describe steps to run on hosts. 

```yml
# playbook.yml
- name: Setup Raspberry Pi 
  hosts: all
  become: true
  vars_files:
    - ../secrets.yml

  vars:
    datadog_api_key: "{{ datadog_api_key }}"
    datadog_site: "datadoghq.eu"

  roles:
    - setup
    - datadog
    - docker
    - cloudflare
    - reboot
```

Note, that playbooks only describes high-level roles (aka steps) and variables to use from `secrets.yml` file which creation and management is described in [this section](#create-vault-secrets).


### **Write Roles**: 

We have several roles to: 

  - Install base software: python 
  - Install docker to run apps
  - Install Datadog to monitor device health
  - Install Cloudflare to expose device to web securely and allow remote ssh access (from internet)

### Write a role: (e.g. `setup.yml`)

```yml
# setup.yml 

- name: Update package list
  command: apt update

- name: Upgrade all packages
  command: apt upgrade -y

- name: Install Python 3 and pip
  apt:
    name:
      - python3
      - python3-pip
    state: latest
    update_cache: yes
```

4. Run the playbook:

```bash
ansible-playbook -i inventory.ini setup.yml
```

Verify on the Rpi that python was installed by running: 

```bash
python -v
```

### Adding Datadog Agent via Ansible 

Install the Datadog Ansible Collection from Ansible Galaxy on your Ansible Server: 

```bash
ansible-galaxy collection install datadog.dd
```

Add datadog rule: 

```yml
- hosts: servers
  tasks:
    - name: Import the Datadog Agent role from the Datadog collection
      import_role:
        name: datadog.dd.agent
  vars:
    datadog_api_key: "{{ datadog_api_key }}"
    datadog_site: "datadoghq.eu"
```

### Check the Datadog process is working

```bash
sudo datadog-agent status
sudo systemctl status datadog-agent
sudo tail -n 100 /var/log/datadog/agent.log
```

### Confirm on the Datadog UI
Go to your [Datadog infrastructure dashboard](https://app.datadoghq.eu/infrastructure) (or the appropriate site for your region) and check:

  - Your Raspberry Pi shows up as a host.
  - Metrics are being collected.
  - The host has the correct hostname (matching your RPi).



