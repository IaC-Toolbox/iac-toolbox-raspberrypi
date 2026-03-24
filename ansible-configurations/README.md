# Raspberry Pi Ansible Cookbook
A curated Ansible cookbook for provisioning and configuring Raspberry Pi devices. In this guide, we assume that you already have a Ubuntu 22.04 installed on your raspberry pi and validated SSH access. If not, please try to do these steps first: [Operating system installation and SSH access](../os-setup/README.md).

## Setting up raspberry pi. 

You don't need to be inside of raspberry pi to run these commands. On the contrary, `Ansible` - our configuration tool works by installing the software from the host machine (your computer) onto the target machine (raspberry pi). The scripts in this folder contain all the necessary boilerplate to ensure that it is possible, and it is because of SSH keys. 

Next, we are going to do the following steps to ensure all software is installed and raspberry pi is ready to run our apps. Follow the steps below:


### Required Ansbile Collections

Install the **datadog** collection prior to running

```bash
ansible-galaxy collection install datadog.dd
```

### Create Vault Secrets

Ansible relies on secret values such as third-party APIs to install all the software. Make sure that those secrets exist in your `secrets.yml` in encrypted form. To Create a secrets file run: 

```bash
ansible-vault create secrets.yml
```

Ensure that you have all the necessary secrets in `.env`, then set them into the ansible vault by running `sh update-secrets.sh` from this filder.

```sh
sh update-secrets.sh
```

### Ensure that you have device AWS IoT Certificates

The device communicates with AWS IoT Core so it expects security certificates. Ansible should install them on the device, but you need to have them on the machine in folder `rpi-camera/infra/aws_iot_ssl_credentials_raspberry_pi`. Make sure you have them before going into the next steps. 

If you do not have them, then you should get them possibly via `terraform` script.

### Execute Ansible

Finally, lets install the software by executing `Ansible`. We have a convencience script for that: 

```bash
sh run-playbook.sh ./playbooks/bootstrap_device.yml
```

### Conclusion

This usually takes a while, so grab a coffee and wait for scripts to install. Once everything is installed and finished, follow the app installation steps: [Installing App dependencies and running app](../../rpi-camera-software/README.md)

