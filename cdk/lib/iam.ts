import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";

type IamRoleProps = cdk.StackProps & {
  roleProps: iam.RoleProps;
};

export class IamRole extends cdk.Stack {
  public readonly role: iam.Role;

  constructor(scope: cdk.App, id: string, props: IamRoleProps) {
    super(scope, id, props);

    const { roleProps } = props;

    this.role = new iam.Role(this, id, {
      ...roleProps,
    });
  }
}
