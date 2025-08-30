import * as cdk from 'aws-cdk-lib';
import { Vpc, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint, FileSystem } from 'aws-cdk-lib/aws-efs';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

import { DatastoreConstruct } from './constructs/datastore';
import { ISettings } from '../settings/interface';
import { StorageConstruct } from './constructs/storage';

interface PersistenceStackProps extends cdk.StackProps {
  prefix: string;
  settings: ISettings;
  vpc: Vpc;
  securityGroupForEfs: SecurityGroup;
  securityGroupForRds: SecurityGroup;
}

export class PersistenceStack extends cdk.Stack {
  public readonly efs: FileSystem;
  public readonly efsAccessPoint: AccessPoint;
  public readonly rds: DatabaseInstance;
  constructor(scope: Construct, id: string, props: PersistenceStackProps) {
    super(scope, id, props);

    const { RdsMysql, Efs } = props.settings;

    const datastore = new DatastoreConstruct(this, 'Datastore', {
      prefix: props.prefix,
      vpc: props.vpc,
      securityGroupForEfs: props.securityGroupForEfs,
      securityGroupForRds: props.securityGroupForRds,
      rdsProps: {
        ...RdsMysql,
      },
      efsProps: {
        efsVolumePath: Efs.efsVolumePath,
      },
    });

    new StorageConstruct(this, 'Storage', {
      prefix: props.prefix
    });

    this.efs = datastore.efs;
    this.efsAccessPoint = datastore.efsAccessPoint;
    this.rds = datastore.rds;
  }
}
