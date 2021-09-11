import * as cdk from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";

type LambdaRestApiGatewayProps = cdk.StackProps & {
  restApiName: string;
  lambdaFunction: lambda.IFunction;
  deploy: boolean;
};

export class LambdaRestApiGateway extends cdk.Stack {
  readonly restApi: apigateway.RestApi;
  readonly deployment: apigateway.Deployment;

  constructor(scope: cdk.App, id: string, props: LambdaRestApiGatewayProps) {
    super(scope, id, props);

    const { restApiName, lambdaFunction, deploy } = props;

    const lambdaAlias = lambda.Function.fromFunctionArn(
      this,
      `${id}-lambda-stage`,
      `${lambdaFunction.functionArn}:\${stageVariables.alias}`
    );

    // https://github.com/aws/aws-cdk/issues/6143#issuecomment-796408877
    const defaultIntegration = new apigateway.AwsIntegration({
      proxy: true,
      service: "lambda",
      path: `2015-03-31/functions/${lambdaAlias.functionArn}/invocations`,
    });

    // const defaultIntegration = new apigateway.LambdaIntegration(lambdaFunction);

    this.restApi = new apigateway.RestApi(this, id, {
      restApiName,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultIntegration, // 指定しない場合、MOCK統合になってしまうため
      deploy,
    });

    this.restApi.root.addProxy({
      anyMethod: true,
      defaultIntegration,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    this.restApi.root.addResource("pets").addMethod("GET");

    this.deployment = new apigateway.Deployment(this, `${id}-deployment`, {
      api: this.restApi,
      retainDeployments: true,
    });
  }
}

type ApiGatewayStageProps = cdk.StackProps & {
  restApi: apigateway.RestApi;
  deployment: apigateway.Deployment;
  stageName: string;
  lambdaFunction: lambda.IFunction;
  variables?: { [key: string]: string };
};

export class ApiGatewayStage extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ApiGatewayStageProps) {
    super(scope, id, props);

    const { restApi, deployment, lambdaFunction, stageName, variables } = props;

    new apigateway.Stage(this, id, {
      deployment,
      stageName,
      variables: {
        ...variables,
        alias: stageName,
      },
    });

    /**
     * 追加stageがlambdaをinvokeできるように権限を追加
     */
    new lambda.CfnPermission(this, `${id}-invoke-root-function`, {
      action: "lambda:InvokeFunction",
      functionName: `${lambdaFunction.functionName}:${stageName}`,
      principal: "apigateway.amazonaws.com",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${restApi.restApiId}/${stageName}/*/`,
    });
    new lambda.CfnPermission(this, `${id}-invoke-proxy-function`, {
      action: "lambda:InvokeFunction",
      functionName: `${lambdaFunction.functionName}:${stageName}`,
      principal: "apigateway.amazonaws.com",
      sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${restApi.restApiId}/${stageName}/*/*`,
    });
  }
}
