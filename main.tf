terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.67"
    }

    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0.5"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "2.4.2"
    }
  }

  backend "s3" {
    key    = "main.tfstate"
    region = "eu-west-1"
  }
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "project_name" {
  type        = string
  default     = "case-study"
  description = "Project name for resource naming"
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  region = "us-east-1"
  alias  = "aws-us"
}

provider "tls" {}

module "console" {
  source       = "./console"
  project_name = var.project_name

  providers = {
    aws.aws-us = aws.aws-us
  }
}

module "backend" {
  source       = "./backend"
  project_name = var.project_name

  providers = {
    aws.aws-us = aws.aws-us
  }
}

output "console_url" {
  value = module.console.console_url
}

output "api_url" {
  value = module.backend.api_url
}
