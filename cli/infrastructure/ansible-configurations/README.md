# Raspberry Pi Ansible Cookbook
A curated Ansible cookbook for provisioning and configuring Raspberry Pi devices. In this guide, we assume that you already have a Ubuntu 22.04 installed on your raspberry pi and validated SSH access. If not, please try to do these steps first: [Operating system installation and SSH access](../os-setup/README.md).

## Setting up raspberry pi. 

You don't need to be inside of raspberry pi to run these commands. On the contrary, `Ansible` - our configuration tool works by installing the software from the host machine (your computer) onto the target machine (raspberry pi). The scripts in this folder contain all the necessary boilerplate to ensure that it is possible, and it is because of SSH keys. 

Next, we are going to do the following steps to ensure all software is installed and raspberry pi is ready to run our apps. Follow the steps below:


### Environment Variables

Secrets (API keys, passwords) are injected as environment variables by the CLI from `~/.iac-toolbox/credentials`. Advanced users running scripts directly should export the required variables before invoking `install.sh`. See `.env.example` for a reference of available variables.

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

