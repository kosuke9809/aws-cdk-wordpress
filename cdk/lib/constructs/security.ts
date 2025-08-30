import * as cdk from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { generatePassword } from '../../utls/helper';

interface SecurityConstructProps {
  prefix: string;
  vpc: Vpc;
}

export class SecurityConstruct extends Construct {
  public readonly securityGroupForAlb: SecurityGroup;
  public readonly securityGroupForEcsService: SecurityGroup;
  public readonly securityGroupForEfs: SecurityGroup;
  public readonly securityGroupForRds: SecurityGroup;
  public readonly secretWordPress: Secret;
  private genSecurityGroup(id: string, props: SecurityConstructProps): SecurityGroup {
    const securityGroup = new SecurityGroup(this, `SecurityGroup${id}`, {
      vpc: props.vpc,
    });
    return securityGroup;
  }
  private genWpSecret(props: SecurityConstructProps) {
    const password = generatePassword();
    const secret = new Secret(this, 'WpSecret', {
      secretStringValue: cdk.SecretValue.unsafePlainText(
        JSON.stringify({
          // sample wp-user
          username: `${props.prefix}-wp-admin`,
          password: password,
          email: 'wp-admin@example.com',
          last_name: 'last_name',
          first_name: 'first_name',
        }),
      ),
    });
    return secret;
  }
  constructor(scope: Construct, id: string, props: SecurityConstructProps) {
    super(scope, id);

    this.securityGroupForAlb = this.genSecurityGroup('Alb', props);
    this.securityGroupForEcsService = this.genSecurityGroup('Ecs', props);
    this.securityGroupForEfs = this.genSecurityGroup('Efs', props);
    this.securityGroupForRds = this.genSecurityGroup('Rds', props);

    this.securityGroupForAlb.addIngressRule(Peer.anyIpv4(), Port.HTTP, 'Allow HTTP from Internet');

    this.securityGroupForEcsService.addIngressRule(
      this.securityGroupForAlb,
      Port.HTTP,
      'Allow HTTP from ALB',
    );

    this.securityGroupForEfs.addIngressRule(
      this.securityGroupForEcsService,
      Port.NFS,
      'Allow NFS from ECS Service',
    );

    this.securityGroupForRds.addIngressRule(
      this.securityGroupForEcsService,
      Port.tcp(3306),
      'Allow MySQL from ECS Service',
    );

    this.secretWordPress = this.genWpSecret(props);
  }
}
