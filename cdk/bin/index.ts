#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

import { IamRole } from "../lib/iam";
import { ContainerRepository } from "../lib/ecr";
import { ContainerLambda, LambdaAlias } from "../lib/lambda";
import { LambdaRestApiGateway, ApiGatewayStage } from "../lib/api-gateway";

const app = new cdk.App();

/**
 *　設定
 */
// blue green deployment　の略で　 bgd
const commonName = "bgd" as const;

const defaultRegion = "ap-northeast-1" as const;
const env: cdk.Environment = {
  region: defaultRegion,
};

/**
 * サーバーレススタック
 */
const containerRepository = new ContainerRepository(
  app,
  `${commonName}-container-repository`,
  {
    env,
    repositoryName: commonName,
  }
);

const lambdaRole = new IamRole(app, `${commonName}-lambda-role`, {
  env,
  roleProps: {
    roleName: commonName,
    assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      ),
    ],
  },
});

const lambda = new ContainerLambda(app, `${commonName}-lambda`, {
  env,
  functionProps: {
    functionName: commonName,
    role: lambdaRole.role,
  },
  containerRepository: containerRepository.repository,
  ecrImageCodeProps: {
    cmd: ["dist/index.handler"],
    tag: process.env.IMAGE_TAG || "latest",
    entrypoint: ["/lambda-entrypoint.sh"],
  },
});

new LambdaAlias(app, `${commonName}-lambda-blue-alias`, {
  env,
  aliasName: "blue",
  version: lambda.function.latestVersion,
});

new LambdaAlias(app, `${commonName}-lambda-green-alias`, {
  env,
  aliasName: "green",
  version: lambda.function.latestVersion,
});

const apigateway = new LambdaRestApiGateway(app, `${commonName}-apigateway`, {
  env,
  restApiName: commonName,
  lambdaFunction: lambda.function,
  deploy: false,
});

new ApiGatewayStage(app, `${commonName}-apigateway-blue-stage`, {
  env,
  restApi: apigateway.restApi,
  deployment: apigateway.deployment,
  stageName: "blue",
  lambdaFunction: lambda.function,
});

new ApiGatewayStage(app, `${commonName}-apigateway-green-stage`, {
  env,
  restApi: apigateway.restApi,
  deployment: apigateway.deployment,
  stageName: "green",
  lambdaFunction: lambda.function,
});
