terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.aws-us]
    }
  }
}

variable "project_name" {
  type        = string
  description = "Project name for resource naming"
}

# DynamoDB Table
resource "aws_dynamodb_table" "Adverts" {
  name         = "${var.project_name}-Adverts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "serverId"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  global_secondary_index {
    name            = "serverId-id"
    hash_key        = "serverId"
    range_key       = "id"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "userId-id"
    hash_key        = "userId"
    range_key       = "id"
    projection_type = "ALL"
  }

  tags = {
    Name    = "${var.project_name}-Adverts"
    Project = var.project_name
  }
}

# Api Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"
  description   = "${var.project_name} API Gateway"

  cors_configuration {
    allow_headers = ["content-type", "x-amz-date", "authorization", "x-api-key", "x-amz-security-token"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    allow_origins = ["*"] # In production, you should restrict this to specific origins
  }

  tags = {
    Name    = "${var.project_name}-api"
    Project = var.project_name
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name    = "${var.project_name}-api-stage"
    Project = var.project_name
  }
}

# Lambda Function
resource "null_resource" "bundle" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = path.module
  }
}

data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/dist/api"
  output_path = "${path.module}/dist/api.zip"
  depends_on  = [null_resource.bundle]
}

resource "aws_iam_role" "default" {
  name = "${var.project_name}-APILambdaRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })

  inline_policy {
    name = "${var.project_name}-APILambdaPolicy"
    policy = jsonencode({
      Version = "2012-10-17",
      Statement = [
        {
          Effect = "Allow",
          Action = [
            "logs:CreateLogStream",
            "logs:CreateLogGroup",
            "logs:PutLogEvents",
            "dynamodb:*",
            "cognito-idp:*",
            "s3:*",
          ],
          Resource = "*"
        }
      ]
    })
  }

  tags = {
    Name    = "${var.project_name}-lambda-role"
    Project = var.project_name
  }
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.default.arn
  handler       = "index.handler"

  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  runtime     = "nodejs18.x"
  timeout     = 300
  memory_size = 1024

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.Adverts.name
      PROJECT_NAME        = var.project_name
    }
  }

  tags = {
    Name    = "${var.project_name}-api"
    Project = var.project_name
  }
}

resource "aws_lambda_permission" "permission" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*"
}

# Api Gateway Integration
resource "aws_apigatewayv2_integration" "default" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  connection_type        = "INTERNET"
  description            = "Lambda integration for ${var.project_name}"
  integration_method     = "POST"
  integration_uri        = aws_lambda_function.api.invoke_arn
  passthrough_behavior   = "WHEN_NO_MATCH"
  payload_format_version = "2.0"
}

variable "routes" {
  type    = set(string)
  default = ["/", "/v1/{proxy+}", "/api/{proxy+}"]
}

resource "aws_apigatewayv2_route" "protected" {
  for_each  = var.routes
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY ${each.key}"
  target    = "integrations/${aws_apigatewayv2_integration.default.id}"
}

# Outputs
output "api_url" {
  value       = aws_apigatewayv2_api.main.api_endpoint
  description = "API Gateway endpoint URL"
}

output "api_id" {
  value = aws_apigatewayv2_api.main.id
}

output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.Adverts.name
}
