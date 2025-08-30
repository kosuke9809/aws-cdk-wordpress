import * as cdk from 'aws-cdk-lib';
import { Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { NetworkConstruct } from './constructs/network';
import { SecurityConstruct } from './constructs/security';
import { ISettings } from '../settings/interface';

interface SharedStackProps extends cdk.StackProps {
  prefix: string;
  settings: ISettings;
}

export class SharedStack extends cdk.Stack {
  public readonly vpc: Vpc;
  public readonly securityGroupForAlb: SecurityGroup;
  public readonly securityGroupForEcsService: SecurityGroup;
  public readonly securityGroupForEfs: SecurityGroup;
  public readonly securityGroupForRds: SecurityGroup;
  public readonly secretWordPress: Secret;
  constructor(scope: Construct, id: string, props: SharedStackProps) {
    super(scope, id, props);
    const { Network } = props.settings;
    const network = new NetworkConstruct(this, 'Network', {
      natGateways: Network.natGateways,
    });
    this.vpc = network.vpc;

    const security = new SecurityConstruct(this, 'Security', {
      prefix: props.prefix,
      vpc: network.vpc,
    });
    this.securityGroupForAlb = security.securityGroupForAlb;
    this.securityGroupForEcsService = security.securityGroupForEcsService;
    this.securityGroupForEfs = security.securityGroupForEfs;
    this.securityGroupForRds = security.securityGroupForRds;
    this.secretWordPress = security.secretWordPress;
  }
}
