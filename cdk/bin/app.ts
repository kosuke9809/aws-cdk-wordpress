import * as fs from 'fs';
import * as path from 'path';

import * as cdk from 'aws-cdk-lib';

import { ApplicationStack } from '../lib/application-stack';
import { PersistenceStack } from '../lib/persistence-stack';
import { SharedStack } from '../lib/shared-stack';
import { ISettings } from '../settings/interface';

const getEnv = (settings: ISettings) => {
  if (settings.Env.account && settings.Env.region) {
    return {
      account: settings.Env.account,
      region: settings.Env.region,
    };
  } else {
    return {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION,
    };
  }
};

const loadParameters = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('Parameters file not found');
  }
  return require(filePath); //eslint-disable-line
};

const paramsFilePath = path.join(__dirname, '../settings/parameters.ts');
const settings: ISettings = loadParameters(paramsFilePath);
const prefix = settings.Env.envName;

const app = new cdk.App();

const shared = new SharedStack(app, 'SharedStack', {
  env: getEnv(settings),
  prefix,
  settings: settings,
});

const persistence = new PersistenceStack(app, 'PersistenceStack', {
  env: getEnv(settings),
  prefix,
  settings: settings,
  vpc: shared.vpc,
  securityGroupForEfs: shared.securityGroupForEfs,
  securityGroupForRds: shared.securityGroupForRds,
});
persistence.addDependency(shared);

const application = new ApplicationStack(app, 'ApplicationStack', {
  env: getEnv(settings),
  prefix,
  settings: settings,
  vpc: shared.vpc,
  securityGroupForAlb: shared.securityGroupForAlb,
  securityGroupForEcsService: shared.securityGroupForEcsService,
  secretWordPress: shared.secretWordPress,
  efs: persistence.efs,
  efsAccessPoint: persistence.efsAccessPoint,
  rds: persistence.rds,
});
application.addDependency(shared);
application.addDependency(persistence);
