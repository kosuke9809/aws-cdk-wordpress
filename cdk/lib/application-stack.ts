import * as cdk from 'aws-cdk-lib';
import { Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint, FileSystem } from 'aws-cdk-lib/aws-efs';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import { ComputeConstruct } from './constructs/compute';
import { ISettings } from '../settings/interface';

export interface ApplicationStackProps extends cdk.StackProps {
  prefix: string;
  vpc: Vpc;
  securityGroupForAlb: SecurityGroup;
  securityGroupForEcsService: SecurityGroup;
  secretWordPress: Secret;
  efs: FileSystem;
  efsAccessPoint: AccessPoint;
  rds: DatabaseInstance;
  settings: ISettings;
}

export class ApplicationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    const { EcsService, Efs } = props.settings;
    new ComputeConstruct(this, 'Compute', {
      prefix: props.prefix,
      vpc: props.vpc,
      efsProps: {
        efs: props.efs,
        efsAccessPointId: props.efsAccessPoint.accessPointId,
        efsVolumePath: Efs.efsVolumePath,
        efsVolumeName: Efs.efsVolumeName,
      },
      rds: props.rds,
      ecsServiceProps: EcsService,
      securityGroupForAlb: props.securityGroupForAlb,
      securityGroupForEcsService: props.securityGroupForEcsService,
      secretWordPress: props.secretWordPress,
    });
  }
}
