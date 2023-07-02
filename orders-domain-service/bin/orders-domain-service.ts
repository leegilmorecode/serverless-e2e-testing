#!/usr/bin/env node

import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';

import { OrdersDomainServiceStatefulStack } from '../stateful/stateful';
import { OrdersDomainServiceStatelessStack } from '../stateless/stateless';

const stageName = process.env.STAGE || 'prod';

const app = new cdk.App();
const statelessStack = new OrdersDomainServiceStatefulStack(
  app,
  'OrdersDomainServiceStatefulStack',
  {
    stageName: 'prod',
  }
);
new OrdersDomainServiceStatelessStack(
  app,
  'OrdersDomainServiceStatelessStack',
  {
    stageName,
    ordersInternalQueue: statelessStack.queue,
    ordersInternalTable: statelessStack.table,
    // note: this would be a lookup on config
    sharedEventBusName: `shared-domains-event-bus-${stageName}`,
  }
);
