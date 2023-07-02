import * as cdk from 'aws-cdk-lib';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { SharedInfraStatefulStack } from './stateful';

let template: Template;

describe('SharedInfraStatefulStack', () => {
  beforeEach(() => {
    const app = new cdk.App();

    // Create the stateful stack.
    const sharedInfraStatefulStack = new SharedInfraStatefulStack(
      app,
      'SharedInfraStatefulStack',
      {
        stageName: 'prod',
        ordersEventBusName: 'orders-event-bus-prod',
      }
    );

    // Prepare the stack for assertions.
    template = Template.fromStack(sharedInfraStatefulStack);
  });

  test('we have a shared event bus created with the correct props', () => {
    template.hasResource('AWS::Events::EventBus', {
      DeletionPolicy: 'Delete',
      Properties: {
        Name: 'shared-domains-event-bus-prod',
      },
    });
  });

  test('we have an event rule with the correct event pattern for logging all to cloudwatch', () => {
    template.hasResource('AWS::Events::Rule', {
      Properties: {
        Name: 'shared-bus-log-all-rule-prod',
        Description: 'log all shared ESB events',
        EventBusName: { Ref: Match.stringLikeRegexp('SharedEventBus') },
        EventPattern: { source: [{ prefix: '' }] },
        Targets: [
          {
            Arn: {
              'Fn::Join': [
                '',
                Match.arrayWith([
                  {
                    Ref: Match.stringLikeRegexp('SharedEventLogs'),
                  },
                ]),
              ],
            },
            Id: 'Target0',
          },
        ],
      },
    });
  });

  test('we have an event rule with the correct event pattern targeting the orders bus', () => {
    template.hasResource('AWS::Events::Rule', {
      Properties: {
        Name: 'shared-bus-to-orders-bus-rule-prod',
        EventBusName: { Ref: Match.stringLikeRegexp('SharedEventBus') },
        EventPattern: {
          source: ['com.shared.bus'],
          'detail-type': ['3rdPartyOrderRaised'],
        },
        Targets: [
          {
            Arn: {
              'Fn::Join': [
                '',
                Match.arrayWith([
                  Match.stringLikeRegexp(':event-bus/orders-event-bus'),
                ]),
              ],
            },
            Id: 'Target0',
            RoleArn: {
              'Fn::GetAtt': [
                Match.stringLikeRegexp('OrdersEventSourceRuleEventsRole'),
                'Arn',
              ],
            },
          },
        ],
      },
    });
  });
});
