import { Vpc, SubnetType, IpAddresses } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

interface NetworkConstructProps {
  natGateways: number;
}

export class NetworkConstruct extends Construct {
  public readonly vpc: Vpc;
  constructor(scope: Construct, id: string, props: NetworkConstructProps) {
    super(scope, id);
    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 3,
      ipAddresses: IpAddresses.cidr('10.0.0.0/16'),
      natGateways: props.natGateways,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-egress',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'private-isolated',
          subnetType: SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });
    this.vpc = vpc;
  }
}
