# Auto-generated by fogg. Do not edit
# Make improvements in fogg, so that everyone can benefit.
provider "aws" {

  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::626314663667:role/tfe-si"
  }

  allowed_account_ids = ["626314663667"]
}
# Aliased Providers (for doing things in every region).


provider "aws" {
  alias  = "czi-sci-general"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::977655849919:role/tfe-si"
  }

  allowed_account_ids = ["977655849919"]
}


provider "aws" {
  alias  = "summitps-us-west-2"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::950587841421:role/tfe-si"
  }

  allowed_account_ids = ["950587841421"]
}


provider "aws" {
  alias  = "summitps"
  region = "us-east-1"


  assume_role {
    role_arn = "arn:aws:iam::950587841421:role/tfe-si"
  }

  allowed_account_ids = ["950587841421"]
}


provider "aws" {
  alias  = "idseq-prod"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::745463180746:role/tfe-si"
  }

  allowed_account_ids = ["745463180746"]
}


provider "aws" {
  alias  = "idseq-dev"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::732052188396:role/tfe-si"
  }

  allowed_account_ids = ["732052188396"]
}


provider "aws" {
  alias  = "single-cell-dev"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::699936264352:role/tfe-si"
  }

  allowed_account_ids = ["699936264352"]
}


provider "aws" {
  alias  = "czi-si"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::626314663667:role/tfe-si"
  }

  allowed_account_ids = ["626314663667"]
}


provider "aws" {
  alias  = "meta-2"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::607813682535:role/tfe-si"
  }

  allowed_account_ids = ["607813682535"]
}


provider "aws" {
  alias  = "czi-connections"
  region = "us-east-1"


  assume_role {
    role_arn = "arn:aws:iam::591406941557:role/tfe-si"
  }

  allowed_account_ids = ["591406941557"]
}


provider "aws" {
  alias  = "sci-imaging"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::516466186502:role/tfe-si"
  }

  allowed_account_ids = ["516466186502"]
}


provider "aws" {
  alias  = "genepi-dev"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::473004499091:role/tfe-si"
  }

  allowed_account_ids = ["473004499091"]
}


provider "aws" {
  alias  = "czi-splunk"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::409755032321:role/tfe-si"
  }

  allowed_account_ids = ["409755032321"]
}


provider "aws" {
  alias  = "czi-playground"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::401986845158:role/tfe-si"
  }

  allowed_account_ids = ["401986845158"]
}


provider "aws" {
  alias  = "czi-connections-prod"
  region = "us-east-1"


  assume_role {
    role_arn = "arn:aws:iam::340591210379:role/tfe-si"
  }

  allowed_account_ids = ["340591210379"]
}


provider "aws" {
  alias  = "single-cell-prod"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::231426846575:role/tfe-si"
  }

  allowed_account_ids = ["231426846575"]
}


provider "aws" {
  alias  = "czi-shasta-prod"
  region = "us-west-2"


  assume_role {
    role_arn = "arn:aws:iam::009273135997:role/tfe-si"
  }

  allowed_account_ids = ["009273135997"]
}


provider "okta" {
  org_name = "czi-prod"
}
terraform {
  required_version = "=0.13.5"

  backend "remote" {

    hostname     = "si.prod.tfe.czi.technology"
    organization = "shared-infra"
    workspaces {
      name = "accounts-okta-czi-prod"
    }

  }
  required_providers {

    archive = {
      source = "hashicorp/archive"

      version = "~> 2.0"

    }

    assert = {
      source = "bwoznicki/assert"

      version = "~> 0.0.1"

    }

    aws = {
      source = "hashicorp/aws"

      version = "3.63.0"

    }

    local = {
      source = "hashicorp/local"

      version = "~> 2.0"

    }

    null = {
      source = "hashicorp/null"

      version = "~> 3.0"

    }

    okta = {
      source = "chanzuckerberg/okta"

      version = "3.10.3"

    }

    okta-head = {
      source = "okta/okta"

      version = "~> 3.30"

    }

    random = {
      source = "hashicorp/random"

      version = "~> 2.2"

    }

    template = {
      source = "hashicorp/template"

      version = "~> 2.2"

    }

    tls = {
      source = "hashicorp/tls"

      version = "~> 3.0"

    }

  }
}
variable "env" {
  type    = string
  default = "accounts"
}
variable "project" {
  type    = string
  default = "shared-infra"
}
variable "region" {
  type    = string
  default = "us-west-2"
}
variable "component" {
  type    = string
  default = "okta-czi-prod"
}
variable "account" {
  type    = string
  default = "okta-czi-prod"
}
variable "owner" {
  type    = string
  default = "infra-eng@chanzuckerberg.com"
}
variable "tags" {
  type = object({ project : string, env : string, service : string, owner : string, managedBy : string })
  default = {
    project   = "shared-infra"
    env       = "accounts"
    service   = "okta-czi-prod"
    owner     = "infra-eng@chanzuckerberg.com"
    managedBy = "terraform"
  }
}
variable "aws_cloudtrail_bucket_name" {
  type    = string
  default = "czi-logs-cloudtrail"
}
variable "aws_cloudtrail_s3_encryption_key_arn" {
  type    = string
  default = "arn:aws:kms:us-west-2:724328632434:key/5e9e938a-441e-4ffd-96b3-8e38b951301e"
}
variable "aws_config_bucket_name" {
  type    = string
  default = "czi-aws-config"
}
variable "aws_github_bucket_name" {
  type    = string
  default = "shared-infra-logs-github-webhooks-archiver"
}
variable "aws_org_id" {
  type    = string
  default = "o-56v5gp5fcu"
}
variable "ie_pd_default_escalation" {
  type    = string
  default = "[Infra] Core Infra Eng"
}
variable "ie_pd_team" {
  type    = string
  default = "Infra Eng"
}
variable "learning_platform_aws_org_id" {
  type    = string
  default = "o-iqjigxi1d8"
}
variable "okta_tenant" {
  type    = string
  default = "czi-prod"
}
data "terraform_remote_state" "global" {
  backend = "remote"
  config = {


    hostname     = "si.prod.tfe.czi.technology"
    organization = "shared-infra"
    workspaces = {
      name = "global"
    }

  }
}
variable "aws_accounts" {
  type = map(string)
  default = {

    covidmodeling = "810061268089"

    czi-comp-bio = "984830177581"

    czi-connections = "591406941557"

    czi-connections-prod = "340591210379"

    czi-corp = "252147947505"

    czi-corp-data = "118553289051"

    czi-corp-slack = "173047378543"

    czi-databricks = "581588399613"

    czi-id = "416703108729"

    czi-images = "723754913286"

    czi-investments = "828946955132"

    czi-joi = "419182566251"

    czi-legacy = "787588439240"

    czi-logs = "724328632434"

    czi-physec = "728896018347"

    czi-playground = "401986845158"

    czi-protocolsio = "248448116955"

    czi-sci-general = "977655849919"

    czi-sec = "871040364337"

    czi-si = "626314663667"

    czi-splunk = "409755032321"

    czi-ssh = "648573913056"

    czi-stp = "333578046542"

    czi-tfe = "612168857605"

    cztack-ci-1 = "119435350371"

    cztack-ci-2 = "254044266527"

    genepi-dev = "473004499091"

    genepi-prod = "829407189049"

    hca-id = "634134578715"

    hca-prod = "109067257620"

    idseq-dev = "732052188396"

    idseq-prod = "745463180746"

    lp-databricks = "893455824143"

    mccloud-dev = "383859279202"

    mccloud-prod = "381995712961"

    meta-2 = "607813682535"

    meta-databricks-staging = "501412765515"

    meta-images = "182066011887"

    meta-images-ci = "497543281455"

    rao-dev = "917126549613"

    rao-prod = "941037323260"

    sci-imaging = "516466186502"

    sciencescape = "464320806260"

    shasta-prod = "009273135997"

    single-cell-dev = "699936264352"

    single-cell-prod = "231426846575"

    spacetx = "422553907334"

    summitps = "950587841421"

  }
}
