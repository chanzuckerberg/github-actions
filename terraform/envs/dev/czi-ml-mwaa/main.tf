# Auto-generated by fogg. Do not edit
# Make improvements in fogg, so that everyone can benefit.

module "aws-mwaa" {
  source                        = "../../../modules/aws-mwaa"
  airflow_configuration_options = local.airflow_configuration_options
  airflow_version               = local.airflow_version
  availability_zones            = local.availability_zones
  cloud-env                     = local.cloud-env
  dag_processing_logs_level     = local.dag_processing_logs_level
  dag_s3_path                   = local.dag_s3_path
  environment_class             = local.environment_class
  max_workers                   = local.max_workers
  min_workers                   = local.min_workers
  name                          = local.name
  plugins_s3_path               = local.plugins_s3_path
  region                        = local.region
  requirements_s3_path          = local.requirements_s3_path
  scheduler_logs_level          = local.scheduler_logs_level
  tags                          = local.tags
  task_logs_level               = local.task_logs_level
  webserver_logs_level          = local.webserver_logs_level
  worker_logs_level             = local.worker_logs_level

}
