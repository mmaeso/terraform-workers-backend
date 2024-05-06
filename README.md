# Disclaimer
This project uses Workers KV to store state and lock information, an eventually consistent Key-Value store. This means there's no guarantee that two simultaneous reads will yield the same result, especially if the requests hit different Cloudflare edge locations. Don't use in production unless you want the thrill of potentially losing your projects' states.

# Terraform HTTP Backend on Cloudflare Workers
This is a proof of concept for a serverless Terraform HTTP backend that leverages Cloudflare Workers to store your state information remotely, allowing you to share your Terraform projects' states without having to store them in a shared folder. The backend supports state locks/unlocks, and storing state for multiple projects by simply configuring a different path for each project. This is a fork of https://github.com/louy/terraform-backend-cloudflare-worker that has been migrated to the ES Worker format.


## Getting started
You'll need to install both [Cloudflare Wrangler CLI](https://github.com/cloudflare/wrangler#installation) and [Terraform CLI](https://learn.hashicorp.com/terraform/getting-started/install.html).

You can optionally deploy your worker through the Cloudflare dashboard, including creating the enviroment variables/secrets, creating the KV namespace and binding the worker to the namespace, instead of using wrangler.

Make sure your wrangler cli is set up correctly by running the following (you might need to generate an api token):

```sh
wrangler config
```

Then, update the username in the `wrangler.toml` file. **IMPORTANT**

To create the password env variable as a secret, use the following command:
```sh
wrangler secret put PASSWORD
Enter a secret value: ***
🌀 Creating the secret for script worker-app
✨ Success! Uploaded secret PASSWORD
```
Now, you'll need to create a KV namespace. Just run the following:
```sh
wrangler kv:namespace create TERRAFORM
```

Lastly, to deploy your worker, update `wrangler.toml` file with your account id, kv namespace id, and optionally a different project name, then run the following:
```sh
wrangler publish
```
You should get back a message similar to the following:
```
💁  JavaScript project found. Skipping unnecessary build!
✨  Successfully published your script to https://terraform-backend.<your-account-name>.workers.dev
```

Now that you've deployed your worker, you need to configure your new backend in the Terraform config files:
```hcl
terraform {
  backend "http" {
    address = "https://terraform-backend.<your-account-name>.workers.dev/<project>"
    username = <your configured username>
    password = <your configured password>

    lock_address = "https://terraform-backend.<your-account-name>.workers.dev/<project>"
    unlock_address = "https://terraform-backend.<your-account-name>.workers.dev/<project>"
  }
}
```
You can now manually push your state file using the following command:
```sh
terraform state push state-backup.tfstate
```
Terraform might complain about needing to reinitialize the project using this command:
```sh
terraform init -reconfigure
```
