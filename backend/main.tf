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

# DynamoDB Tables for Crypto Dashboard

# 1. CryptoCoins Table
resource "aws_dynamodb_table" "crypto_coins" {
  name         = "${var.project_name}-CryptoCoins"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "coin_id"

  attribute {
    name = "coin_id"
    type = "S"
  }

  tags = {
    Name    = "${var.project_name}-CryptoCoins"
    Project = var.project_name
  }
}

# 2. SupportedCurrencies Table
resource "aws_dynamodb_table" "supported_currencies" {
  name         = "${var.project_name}-SupportedCurrencies"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "currency_code"

  attribute {
    name = "currency_code"
    type = "S"
  }

  tags = {
    Name    = "${var.project_name}-SupportedCurrencies"
    Project = var.project_name
  }
}

# 3. PriceData Table (Main table for price history)
resource "aws_dynamodb_table" "price_data" {
  name         = "${var.project_name}-PriceData"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "coin_id"
  range_key    = "timestamp_currency"

  attribute {
    name = "coin_id"
    type = "S"
  }

  attribute {
    name = "timestamp_currency"
    type = "S"
  }

  attribute {
    name = "currency"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  # GSI for querying by currency
  global_secondary_index {
    name            = "currency-timestamp_currency-index"
    hash_key        = "currency"
    range_key       = "timestamp_currency"
    projection_type = "ALL"
  }

  # GSI for querying by timestamp across all coins
  global_secondary_index {
    name            = "timestamp-coin_id-index"
    hash_key        = "timestamp"
    range_key       = "coin_id"
    projection_type = "ALL"
  }

  tags = {
    Name    = "${var.project_name}-PriceData"
    Project = var.project_name
  }
}

# Api Gateway
resource "aws_apigatewayv2_api" "main" {
  name          = "${var.project_name}-crypto-api"
  protocol_type = "HTTP"
  description   = "${var.project_name} Crypto Dashboard API"

  cors_configuration {
    allow_headers = ["content-type", "x-amz-date", "authorization", "x-api-key", "x-amz-security-token"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
    allow_origins = ["*"] # In production, you should restrict this to specific origins
  }

  tags = {
    Name    = "${var.project_name}-crypto-api"
    Project = var.project_name
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name    = "${var.project_name}-crypto-api-stage"
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
  name = "${var.project_name}-CryptoAPILambdaRole"

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
    name = "${var.project_name}-CryptoAPILambdaPolicy"
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
          ],
          Resource = "*"
        }
      ]
    })
  }

  tags = {
    Name    = "${var.project_name}-crypto-lambda-role"
    Project = var.project_name
  }
}

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-crypto-api"
  role          = aws_iam_role.default.arn
  handler       = "index.handler"

  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  runtime     = "nodejs18.x"
  timeout     = 300
  memory_size = 1024

  environment {
    variables = {
      # DynamoDB Table Names
      CRYPTO_COINS_TABLE = aws_dynamodb_table.crypto_coins.name
      CURRENCIES_TABLE   = aws_dynamodb_table.supported_currencies.name
      PRICE_DATA_TABLE   = aws_dynamodb_table.price_data.name
      PROJECT_NAME       = var.project_name
      # CoinGecko Configuration
      SUPPORTED_COINS      = "bitcoin,ethereum,tether,ripple,binancecoin,solana,dogecoin,tron,cardano"
      SUPPORTED_CURRENCIES = "usd,eur,try"
    }
  }

  tags = {
    Name    = "${var.project_name}-crypto-api"
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
  description            = "Lambda integration for ${var.project_name} crypto API"
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

output "crypto_tables" {
  value = {
    coins      = aws_dynamodb_table.crypto_coins.name
    currencies = aws_dynamodb_table.supported_currencies.name
    price_data = aws_dynamodb_table.price_data.name
  }
  description = "DynamoDB table names for crypto data"
}
