terraform {
  backend "http" {
    address = "https://terraform-backend.<your-account-name>.workers.dev/<project>"
    username = <your configured username>
    password = <your configured password>

    lock_address = "https://terraform-backend.<your-account-name>.workers.dev/<project>"
    unlock_address = "https://terraform-backend.<your-account-name>.workers.dev/<project>"
  }
}
