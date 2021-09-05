import * as cdk from "@aws-cdk/core";
import * as lambda from "@aws-cdk/aws-lambda";
import * as ecr from "@aws-cdk/aws-ecr";

type ContainerLambdaProps = cdk.StackProps & {
  functionProps: Omit<
    lambda.FunctionProps,
    "code" | "runtime" | "handler" | "environment"
  >;
  containerRepository: ecr.IRepository;
  ecrImageCodeProps: lambda.EcrImageCodeProps;
  environment?: { [key: string]: string };
};

export class ContainerLambda extends cdk.Stack {
  readonly function: lambda.Function;

  constructor(scope: cdk.App, id: string, props: ContainerLambdaProps) {
    super(scope, id, props);

    const {
      functionProps,
      containerRepository,
      ecrImageCodeProps,
      environment = {},
    } = props;

    const functionCommonProps = {
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
    };

    const commonEnvironment = {};

    this.function = new lambda.Function(this, id, {
      code: lambda.Code.fromEcrImage(containerRepository, ecrImageCodeProps),
      handler: lambda.Handler.FROM_IMAGE,
      runtime: lambda.Runtime.FROM_IMAGE,
      ...functionCommonProps,
      ...functionProps,
      environment: {
        ...commonEnvironment,
        ...environment,
      },
    });

    if (!this.function.role) {
      throw new Error(`lambda role must exist: ${this.function.functionName}`);
    }

    new lambda.Alias(this, `${id}-dev-alias`, {
      aliasName: "dev",
      version: this.function.latestVersion,
    });

    new lambda.Alias(this, `${id}-prod-alias`, {
      aliasName: "prod",
      version: this.function.latestVersion,
    });
  }
}
