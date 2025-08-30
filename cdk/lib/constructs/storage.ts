import * as cdk from 'aws-cdk-lib';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Compression, DeliveryStream, S3Bucket } from 'aws-cdk-lib/aws-kinesisfirehose';
import { BlockPublicAccess, Bucket, BucketEncryption } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

interface StorageConstructProps {
  prefix: string;
}
export class StorageConstruct extends Construct {
  public readonly appLogBucket: Bucket;
  private genS3Bucket(id: string) {
    const bucket = new Bucket(this, `${id}Bucket`, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(90),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    return bucket;
  }

  private genFirehose(bucket: Bucket, props: StorageConstructProps) { // eslint-disable-line
    const firehoseRole = new Role(this, 'FirehoseRole', {
      assumedBy: new ServicePrincipal('firehose.amazonaws.com'),
    });
    bucket.grantReadWrite(firehoseRole);

    const destination = new S3Bucket(bucket, {
      role: firehoseRole,
      bufferingInterval: cdk.Duration.seconds(60),
      bufferingSize: cdk.Size.mebibytes(5),
      compression: Compression.GZIP,
    });

    const firehose = new DeliveryStream(this, 'Firehose', {
      deliveryStreamName: 'log-delivery-stream', //fluent-bit.confと合わせる
      destination: destination,
    });
    return firehose;
  }

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);
    this.appLogBucket = this.genS3Bucket('AppLog');
    this.genFirehose(this.appLogBucket, props);
  }
}
