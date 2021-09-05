#!/usr/bin/env node
import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

import { IamRole } from "../lib/iam";
import { ContainerRepository } from "../lib/ecr";
import { ContainerLambda } from "../lib/lambda";
import { LambdaRestApiGateway } from "../lib/api-gateway";

const app = new cdk.App();

/**
 *　設定
 */
const commonName = "blue-green-deploy" as const;

const defaultRegion = "ap-northeast-1" as const;
const env: cdk.Environment = {
  region: defaultRegion,
};

/**
 * サーバーレススタック
 */
const blueGreenDeployRepository = new ContainerRepository(
  app,
  `${commonName}-container-repository`,
  {
    env,
    repositoryName: commonName,
  }
);

const blueGreenDeployLambdaRole = new IamRole(
  app,
  `${commonName}-lambda-role`,
  {
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
  }
);

const blueGreenDeployLambda = new ContainerLambda(app, `${commonName}-lambda`, {
  env,
  functionProps: {
    functionName: commonName,
    role: blueGreenDeployLambdaRole.role,
  },
  containerRepository: blueGreenDeployRepository.repository,
  ecrImageCodeProps: {
    cmd: ["dist/index.handler"],
    tag: process.env.BACKEND_IMAGE_TAG || "latest",
    entrypoint: ["/lambda-entrypoint.sh"],
  },
});

new LambdaRestApiGateway(app, `${commonName}-apigateway`, {
  env,
  restApiName: commonName,
  lambdaFunction: blueGreenDeployLambda.function,
});
