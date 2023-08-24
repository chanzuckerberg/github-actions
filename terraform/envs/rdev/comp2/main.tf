terraform {
  backend "remote" {
    hostname     = "si.prod.tfe.czi.technology"
    organization = "shared-infra"

    workspaces {
      name = "jheath-test-acction"
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

module "name" {
  source = "git@github.com:chanzuckerberg/shared-infra//terraform/modules/k8s-core?ref=k8s-core-v4.10.1"

}