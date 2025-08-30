import * as path from 'path';

import * as cdk from 'aws-cdk-lib';
import { SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import {
  Cluster,
  ContainerImage,
  FargateService,
  FargateTaskDefinition,
  FirelensConfigFileType,
  FirelensLogRouterType,
  LogDrivers,
  Secret,
} from 'aws-cdk-lib/aws-ecs';
import { FileSystem } from 'aws-cdk-lib/aws-efs';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { DatabaseInstance } from 'aws-cdk-lib/aws-rds';
import { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface EcsServiceProps {
  cpu: number;
  memoryLimitMiB: number;
  desiredCount: number;
  minCapacity: number;
  maxCapacity: number;
  autoScaleTargetCpuUtilization: number;
  autoScaleInCooldown: cdk.Duration;
  autoScaleOutCooldown: cdk.Duration;
}

interface EfsProps {
  efs: FileSystem;
  efsAccessPointId: string;
  efsVolumePath: string;
  efsVolumeName: string;
}

interface ComputeConstructProps {
  prefix: string;
  vpc: Vpc;
  efsProps: EfsProps;
  rds: DatabaseInstance;
  ecsServiceProps: EcsServiceProps;
  securityGroupForAlb: SecurityGroup;
  securityGroupForEcsService: SecurityGroup;
  secretWordPress: ISecret;
}

export class ComputeConstruct extends Construct {
  public readonly alb: ApplicationLoadBalancer;
  private genEcsCluster(props: ComputeConstructProps): Cluster {
    const cluster = new Cluster(this, 'EcsCluster', {
      vpc: props.vpc,
      clusterName: `${props.prefix}-cluster`,
    });
    return cluster;
  }
  private genEcsService(
    cluster: Cluster,
    taskDefinition: FargateTaskDefinition,
    props: ComputeConstructProps,
  ): FargateService {
    const service = new FargateService(this, 'FargateService', {
      cluster: cluster,
      serviceName: `${props.prefix}-service`,
      taskDefinition: taskDefinition,
      securityGroups: [props.securityGroupForEcsService],
      desiredCount: props.ecsServiceProps.desiredCount,
      enableExecuteCommand: true,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      vpcSubnets: props.vpc.selectSubnets({ subnetGroupName: 'private-egress' }),
      circuitBreaker: {
        rollback: true,
      },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
    });

    const autoScaling = service.autoScaleTaskCount({
      minCapacity: props.ecsServiceProps.minCapacity,
      maxCapacity: props.ecsServiceProps.maxCapacity,
    });

    autoScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: props.ecsServiceProps.autoScaleTargetCpuUtilization,
      scaleInCooldown: props.ecsServiceProps.autoScaleInCooldown,
      scaleOutCooldown: props.ecsServiceProps.autoScaleOutCooldown,
    });

    return service;
  }
  private genTaskDefinition(props: ComputeConstructProps): FargateTaskDefinition {
    const taskDefinition = new FargateTaskDefinition(this, 'FargateTaskDefinition');

    taskDefinition.taskRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'elasticfilesystem:ClientMount',
          'elasticfilesystem:ClientWrite',
          'elasticfilesystem:DescribeMountTargets',
        ],
        resources: [props.efsProps.efs.fileSystemArn],
      }),
    );

    taskDefinition.taskRole.addToPrincipalPolicy(
      new PolicyStatement({
        actions: [
          'logs:CreateLogStream',
          'logs:PutLogEvents',
          'logs:CreateLogGroup',
          'logs:DescribeLogStreams',
         'firehose:PutRecord',
         'firehose:PutRecordBatch',
         'firehose:DescribeDeliveryStream'
        ],
        resources: [
         '*'
        ],
      }),
    );


    // Bitnami版: https://gallery.ecr.aws/bitnami/wordpress
    const wpImage = ContainerImage.fromRegistry('public.ecr.aws/bitnami/wordpress:latest');
    const dbSecret = props.rds.secret!;
    const container = taskDefinition.addContainer('WordPressContainer', {
      cpu: props.ecsServiceProps.cpu,
      memoryLimitMiB: props.ecsServiceProps.memoryLimitMiB,
      image: wpImage,
      logging: LogDrivers.firelens({}),
      secrets: {
        WORDPRESS_DATABASE_HOST: Secret.fromSecretsManager(dbSecret, 'host'),
        WORDPRESS_DATABASE_USER: Secret.fromSecretsManager(dbSecret, 'username'),
        WORDPRESS_DATABASE_PASSWORD: Secret.fromSecretsManager(dbSecret, 'password'),
        WORDPRESS_DATABASE_NAME: Secret.fromSecretsManager(dbSecret, 'dbname'),
        WORDPRESS_USERNAME: Secret.fromSecretsManager(props.secretWordPress, 'username'),
        WORDPRESS_PASSWORD: Secret.fromSecretsManager(props.secretWordPress, 'password'),
        WORDPRESS_EMAIL: Secret.fromSecretsManager(props.secretWordPress, 'email'),
        WORDPRESS_FIRST_NAME: Secret.fromSecretsManager(props.secretWordPress, 'first_name'),
        WORDPRESS_LAST_NAME: Secret.fromSecretsManager(props.secretWordPress, 'last_name'),
      },
      environment: {
        WORDPRESS_TABLE_PREFIX: 'wp_',
      },
      healthCheck: {
        command: [
          'CMD-SHELL',
          'curl -fL http://localhost:8080/wp-includes/images/blank.gif || pgrep -f apache2 || exit 1',
        ],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 2,
        startPeriod: cdk.Duration.seconds(180),
      },
    });

    container.addPortMappings({
      containerPort: 8080,
    });

    //  EFSのマウント設定
    taskDefinition.addVolume({
      name: props.efsProps.efsVolumeName,
      efsVolumeConfiguration: {
        fileSystemId: props.efsProps.efs.fileSystemId,
        transitEncryption: 'ENABLED',
        authorizationConfig: {
          accessPointId: props.efsProps.efsAccessPointId,
          iam: 'ENABLED',
        },
        rootDirectory: '/',
      },
    });

    container.addMountPoints({
      sourceVolume: props.efsProps.efsVolumeName,
      containerPath: props.efsProps.efsVolumePath,
      readOnly: false,
    });

    const fluentBitAsset = new DockerImageAsset(this, 'FluentBitImage', {
      directory: path.join(__dirname, '../../firelens'),
    });

    taskDefinition.addFirelensLogRouter('FirelensLogRouter', {
      image: ContainerImage.fromDockerImageAsset(fluentBitAsset),
      firelensConfig: {
        type: FirelensLogRouterType.FLUENTBIT,
        options: {
          enableECSLogMetadata: true,
          configFileType: FirelensConfigFileType.FILE,
          configFileValue: '/fluent-bit/config/fluent-bit.conf',
        },
      },
      logging: LogDrivers.awsLogs({ streamPrefix: 'firelens' }),
      memoryLimitMiB: 50,
    });

    return taskDefinition;
  }
  private genApplicationLoadBalancer(
    service: FargateService,
    props: ComputeConstructProps,
  ): ApplicationLoadBalancer {
    const alb = new ApplicationLoadBalancer(this, 'Alb', {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: props.securityGroupForAlb,
      vpcSubnets: {
        subnetType: SubnetType.PUBLIC,
      },
    });

    const listener = alb.addListener('Listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      open: true,
    });

    listener.addTargets('Target', {
      port: 8080,
      protocol: ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: '200-399',
      },
    });

    return alb;
  }
  constructor(scope: Construct, id: string, props: ComputeConstructProps) {
    super(scope, id);

    const cluster = this.genEcsCluster(props);
    const taskDefinition = this.genTaskDefinition(props);
    const service = this.genEcsService(cluster, taskDefinition, props);
    this.alb = this.genApplicationLoadBalancer(service, props);

    new cdk.CfnOutput(this, 'WpEndPoint', {
      exportName: 'WordPressURL',
      value: `http://${this.alb.loadBalancerDnsName}`,
    });
  }
}
