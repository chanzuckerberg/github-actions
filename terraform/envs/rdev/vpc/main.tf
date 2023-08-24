terraform {
  remote {
    hostname     = "si.prod.tfe.czi.technology"
    organization = "shared-infra"

    workspaces {
      name = "jheath-test-acction"
    }
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.56.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "2.6.1"
    }
  }
}

resource "random_id" "server" {
  byte_length = 8
}