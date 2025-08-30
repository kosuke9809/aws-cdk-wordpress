import * as cdk from 'aws-cdk-lib';
import { InstanceType, InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';

import * as inf from './interface';

export const Env: inf.IEnv = {
  envName: 'kubell',
  account: '856438885879',
  region: 'ap-northeast-1',
};

export const Network: inf.INetwork = {
  natGateways: 1, // not production ready
};

export const EcsService: inf.IEcsService = {
  cpu: 256,
  memoryLimitMiB: 512,
  desiredCount: 1,
  minCapacity: 1,
  maxCapacity: 3,
  autoScaleTargetCpuUtilization: 80,
  autoScaleInCooldown: cdk.Duration.seconds(60),
  autoScaleOutCooldown: cdk.Duration.seconds(180),
};

export const RdsMysql: inf.IRdsMysql = {
  databaseName: 'wordpress',
  multiAz: false, // not production ready
  instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
  removalPolicy: cdk.RemovalPolicy.DESTROY, // not production ready
};

export const Efs: inf.IEfs = {
  efsVolumePath: '/bitnami/wordpress',
  efsVolumeName: 'efs-volume',
};

export const Config: inf.ISettings = {
  Env: Env,
  Network: Network,
  EcsService: EcsService,
  RdsMysql: RdsMysql,
  Efs: Efs,
};
