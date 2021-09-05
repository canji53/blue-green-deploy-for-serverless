import * as cdk from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";

type ContainerRegistryProps = cdk.StackProps & {
  repositoryName: string;
};

export class ContainerRepository extends cdk.Stack {
  readonly repository: ecr.Repository;

  constructor(scope: cdk.App, id: string, props: ContainerRegistryProps) {
    super(scope, id, props);

    const { repositoryName } = props;

    this.repository = new ecr.Repository(this, id, {
      repositoryName,
    });
  }
}
