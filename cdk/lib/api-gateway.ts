import * as cdk from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as lambda from "@aws-cdk/aws-lambda";

type LambdaRestApiGatewayProps = cdk.StackProps & {
  env: cdk.Environment;
  restApiName: string;
  lambdaFunction: lambda.IFunction;
};

export class LambdaRestApiGateway extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: LambdaRestApiGatewayProps) {
    super(scope, id, props);

    const {
      env: { region },
      restApiName,
      lambdaFunction,
    } = props;

    const defaultIntegration = new apigateway.Integration({
      type: apigateway.IntegrationType.AWS_PROXY,
      uri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${lambdaFunction.functionArn}:\${stageVariables.alias}/invocations`,
      integrationHttpMethod: "ANY", // 統合メソッド名が必要なため、”ANY”を指定
    });

    const api = new apigateway.RestApi(this, id, {
      restApiName,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      defaultIntegration, // 指定しない場合、MOCK統合になってしまうため
      deployOptions: {
        stageName: "prod",
        variables: { alias: "prod" },
      },
    });

    api.root.addProxy({
      anyMethod: true,
      defaultIntegration,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
      },
    });

    /**
     * staging用のステージを作成
     */

    const deployment = new apigateway.Deployment(this, `${id}-deployment`, {
      api,
    });

    new apigateway.Stage(this, `${id}-deployment-stg-stage`, {
      deployment,
      stageName: "stg",
      variables: { alias: "stg" },
    });
  }
}
