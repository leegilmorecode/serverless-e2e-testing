#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { SharedInfraStatefulStack } from '../stateful/stateful';

const stageName = process.env.STAGE || 'prod';

const app = new cdk.App();
new SharedInfraStatefulStack(app, 'SharedInfraStatefulStack', {
  stageName,
  ordersEventBusName: `orders-domain-event-bus-${stageName}`,
});
