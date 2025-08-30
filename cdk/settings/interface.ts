import * as cdk from 'aws-cdk-lib';
import { InstanceType } from 'aws-cdk-lib/aws-ec2';

export interface IEnv {
  envName: string;
  account?: string;
  region?: string;
}

export interface INetwork {
  natGateways: number;
}

export interface IEcsService {
  cpu: number;
  memoryLimitMiB: number;
  desiredCount: number;
  minCapacity: number;
  maxCapacity: number;
  autoScaleTargetCpuUtilization: number;
  autoScaleInCooldown: cdk.Duration;
  autoScaleOutCooldown: cdk.Duration;
}

export interface IRdsMysql {
  databaseName: string;
  multiAz: boolean;
  instanceType: InstanceType;
  removalPolicy: cdk.RemovalPolicy;
}

export interface IEfs {
  efsVolumePath: string;
  efsVolumeName: string;
}

export interface ISettings {
  Env: IEnv;
  Network: INetwork;
  EcsService: IEcsService;
  RdsMysql: IRdsMysql;
  Efs: IEfs;
}
