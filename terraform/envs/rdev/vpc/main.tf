terraform {
  cloud {
    hostname     = "si.prod.tfe.czi.technology"
    organization = "shared-infra"

    workspaces {
      name = "jheath-test-acction"
    }
  }
}

resource "random_id" "server" {
  byte_length = 8
}