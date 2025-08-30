import * as cdk from 'aws-cdk-lib';
import { InstanceType, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint, FileSystem, PerformanceMode } from 'aws-cdk-lib/aws-efs';
import { PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import {
  Credentials,
  DatabaseInstance,
  DatabaseInstanceEngine,
  MysqlEngineVersion,
} from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

interface RdsProps {
  databaseName: string;
  multiAz: boolean;
  instanceType: InstanceType;
  removalPolicy: cdk.RemovalPolicy;
}

interface EfsProps {
  efsVolumePath: string;
}

interface DatastoreConstructProps {
  prefix: string;
  vpc: Vpc;
  securityGroupForEfs: SecurityGroup;
  securityGroupForRds: SecurityGroup;
  rdsProps: RdsProps;
  efsProps: EfsProps;
}

export class DatastoreConstruct extends Construct {
  public readonly efs: FileSystem;
  public readonly rds: DatabaseInstance;
  public readonly efsAccessPoint: AccessPoint;
  private genEfs(props: DatastoreConstructProps): FileSystem {
    const efs = new FileSystem(this, 'Efs', {
      vpc: props.vpc,
      enableAutomaticBackups: true,
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      securityGroup: props.securityGroupForEfs,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      vpcSubnets: props.vpc.selectSubnets({
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        availabilityZones: props.vpc.availabilityZones,
      }),
    });

    efs.addToResourcePolicy(
      new PolicyStatement({
        actions: [
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:DescribeMountTargets',
        ],
        principals: [new ServicePrincipal('ecs-tasks.amazonaws.com')],
        conditions: {
          Bool: {
            'elasticfilesystem:AccessedViaMountTarget': true,
          },
        },
      }),
    );

    return efs;
  }
  private genEfsAccessPoint(efs: FileSystem, props: DatastoreConstructProps): AccessPoint {
    const efsAccessPoint = efs.addAccessPoint('EfsAccessPoint', {
      path: props.efsProps.efsVolumePath,
      posixUser: {
        uid: '1001',
        gid: '1001',
      },
      createAcl: {
        ownerGid: '1001',
        ownerUid: '1001',
        permissions: '755',
      },
    });

    return efsAccessPoint;
  }
  private genRdsForMysql(props: DatastoreConstructProps): DatabaseInstance {
    const dbInstance = new DatabaseInstance(this, 'RdsInstance', {
      engine: DatabaseInstanceEngine.mysql({
        version: MysqlEngineVersion.VER_8_4_4,
      }),
      vpc: props.vpc,
      securityGroups: [props.securityGroupForRds],
      vpcSubnets: props.vpc.selectSubnets({ subnetGroupName: 'private-isolated' }),
      instanceType: props.rdsProps.instanceType,
      multiAz: props.rdsProps.multiAz,
      databaseName: props.rdsProps.databaseName,
      credentials: Credentials.fromGeneratedSecret('root'),
      publiclyAccessible: false,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      removalPolicy: props.rdsProps.removalPolicy,
    });

    return dbInstance;
  }
  constructor(scope: Construct, id: string, props: DatastoreConstructProps) {
    super(scope, id);
    this.rds = this.genRdsForMysql(props);
    this.efs = this.genEfs(props);
    this.efsAccessPoint = this.genEfsAccessPoint(this.efs, props);
  }
}
