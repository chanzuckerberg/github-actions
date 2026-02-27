terraform {
  backend "remote" {
    hostname     = "si.prod.tfe.czi.technology"
    organization = "shared-infra"

    workspaces {
      name = "accounts-czi-playground"
    }
  }

  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
    kubernetes = {
      source = "hashicorp/kubernetes"
    }
  }
}

resource "random_id" "server" {
  byte_length = 8
}