import * as cdk from 'aws-cdk-lib';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { OrdersDomainServiceStatefulStack } from './stateful';

let template: Template;

describe('OrdersDomainServiceStatefulStack', () => {
  beforeEach(() => {
    const app = new cdk.App();

    const ordersDomainServiceStatefulStack =
      new OrdersDomainServiceStatefulStack(
        app,
        'OrdersDomainServiceStatefulStack',
        {
          stageName: 'prod',
        }
      );

    template = Template.fromStack(ordersDomainServiceStatefulStack);
  });

  test('should have an orders event bus created with the correct props', () => {
    template.hasResource('AWS::Events::EventBus', {
      DeletionPolicy: 'Delete',
      Properties: {
        Name: 'orders-domain-event-bus-prod',
      },
    });
  });

  test('should have an event rule with the correct event pattern for logging all to cloudwatch', () => {
    template.hasResource('AWS::Events::Rule', {
      Properties: {
        Name: 'orders-internal-log-all-rule-prod',
        Description: 'log all shared ESB events',
        EventBusName: {
          Ref: Match.stringLikeRegexp('InternalOrdersDomainEventBus'),
        },
        EventPattern: { source: [{ prefix: '' }] },
        Targets: [
          {
            Arn: {
              'Fn::Join': [
                '',
                Match.arrayWith([
                  {
                    Ref: Match.stringLikeRegexp('OrdersEventLogs'),
                  },
                ]),
              ],
            },
          },
        ],
      },
    });
  });

  test('should have created a dynamodb table with streams enabled and id as the pk', () => {
    template.hasResource('AWS::DynamoDB::Table', {
      DeletionPolicy: 'Delete',
      Properties: {
        KeySchema: [
          {
            AttributeName: 'id',
            KeyType: 'HASH',
          },
        ],
        StreamSpecification: { StreamViewType: 'NEW_IMAGE' },
      },
    });
  });

  test('should have created a queue for 3rd party orders', () => {
    template.hasResource('AWS::SQS::Queue', {
      DeletionPolicy: 'Delete',
      Properties: {
        QueueName: 'orders-internal-queue-prod',
      },
    });
  });

  test('should have an event rule with the correct event pattern for sqs from the orders bus', () => {
    template.hasResource('AWS::Events::Rule', {
      Properties: {
        Name: 'orders-internal-bus-to-queue-rule-prod',
        EventBusName: {
          Ref: Match.stringLikeRegexp('InternalOrdersDomainEventBus'),
        },
        EventPattern: {
          source: ['com.shared.bus'],
          'detail-type': ['3rdPartyOrderRaised'],
        },
        Targets: [
          {
            Arn: {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('InternalOrdersQueue'),
                'Arn',
              ],
            },
          },
        ],
      },
    });
  });
});
