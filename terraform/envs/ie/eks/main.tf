# Auto-generated by fogg. Do not edit
# Make improvements in fogg, so that everyone can benefit.

module "eks-cluster" {
  source                                   = "git@github.com:chanzuckerberg/shared-infra//terraform/modules/eks-cluster?ref=eks-cluster-v2.0.0"
  additional_worker_groups_launch_template = local.additional_worker_groups_launch_template
  ami                                      = local.ami
  bastion_security_group_id                = local.bastion_security_group_id
  cloudwatch_destination                   = local.cloudwatch_destination
  cluster_enabled_log_types                = local.cluster_enabled_log_types
  cluster_name                             = local.cluster_name
  cluster_version                          = local.cluster_version
  datadog_api_key                          = local.datadog_api_key
  desired_servers                          = local.desired_servers
  docker_storage_size                      = local.docker_storage_size
  env                                      = local.env
  instance_type                            = local.instance_type
  logs_retention_days                      = local.logs_retention_days
  map_accounts                             = local.map_accounts
  map_roles                                = local.map_roles
  map_users                                = local.map_users
  max_servers                              = local.max_servers
  min_servers                              = local.min_servers
  owner                                    = local.owner
  project                                  = local.project
  service                                  = local.service
  ssh_key_name                             = local.ssh_key_name
  ssh_users                                = local.ssh_users
  storage_size                             = local.storage_size
  subnet_ids                               = local.subnet_ids
  vpc_id                                   = local.vpc_id

}
