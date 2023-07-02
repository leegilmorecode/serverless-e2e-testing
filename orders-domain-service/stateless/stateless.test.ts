import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';

import { Match, Template } from 'aws-cdk-lib/assertions';

import { OrdersDomainServiceStatelessStack } from './stateless';

let template: Template;
let stageName = 'prod';

describe('OrdersDomainServiceStatelessStackProps', () => {
  beforeEach(() => {
    const app = new cdk.App();

    const statefulStack = new cdk.Stack(app, 'TestStatefulStack');

    const queue = new sqs.Queue(statefulStack, 'Queue', {
      queueName: `orders-internal-queue-${stageName}`,
    });
    const table = new dynamodb.Table(statefulStack, 'Table', {
      tableName: `orders-internal-domain-table-${stageName}`,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
    });

    const ordersDomainServiceStatelessStack =
      new OrdersDomainServiceStatelessStack(
        app,
        'OrdersDomainServiceStatelessStack',
        {
          stageName: 'prod',
          ordersInternalQueue: queue,
          ordersInternalTable: table,
          sharedEventBusName: 'shared-event-bus',
        }
      );

    template = Template.fromStack(ordersDomainServiceStatelessStack);
  });

  test('should have a lambda event source for db streams on the orders stream lambda', () => {
    template.hasResource('AWS::Lambda::Function', {
      Properties: {
        FunctionName: Match.stringLikeRegexp('orders-stream-lambda-'),
      },
    });

    template.hasResource('AWS::Lambda::EventSourceMapping', {
      Properties: {
        FunctionName: {
          Ref: Match.stringLikeRegexp('OrdersStreamLambda'),
        },
        BatchSize: 1,
        MaximumRetryAttempts: 10,
        StartingPosition: 'LATEST',
      },
    });
  });

  test('should have an iam role allowing the stream lambda to utilise the stream', () => {
    template.hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyName: Match.stringLikeRegexp('OrdersStreamLambda'),
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: 'dynamodb:ListStreams',
              Effect: 'Allow',
              Resource: '*',
            },
            {
              Action: [
                'dynamodb:DescribeStream',
                'dynamodb:GetRecords',
                'dynamodb:GetShardIterator',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::ImportValue': Match.stringLikeRegexp(
                  'TestStatefulStack:ExportsOutputFnGetAttTable'
                ),
              },
            },
          ]),
        },
      },
    });
  });

  test('should have an iam role allowing the stream lambda to publish events to the shared bus', () => {
    template.hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyName: Match.stringLikeRegexp('OrdersStreamLambda'),
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: 'events:PutEvents',
              Effect: 'Allow',
              Resource: {
                'Fn::Join': [
                  '',
                  Match.arrayWith([':event-bus/shared-event-bus']),
                ],
              },
            },
          ]),
        },
      },
    });
  });

  test('should have a lambda event source for the queue', () => {
    template.hasResource('AWS::Lambda::Function', {
      Properties: {
        FunctionName: Match.stringLikeRegexp('create-order-queue-lambda-'),
      },
    });

    template.hasResource('AWS::Lambda::EventSourceMapping', {
      Properties: {
        FunctionName: {
          Ref: Match.stringLikeRegexp('CreateOrderQueueLambda'),
        },
      },
    });
  });

  test('should have an iam role allowing the queue lambda to write to dynamodb', () => {
    template.hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyName: Match.stringLikeRegexp('CreateOrderQueueLambda'),
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: [
                'dynamodb:BatchWriteItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:DescribeTable',
              ],
              Effect: 'Allow',
              Resource: Match.arrayWith([
                {
                  'Fn::ImportValue': Match.stringLikeRegexp(
                    'TestStatefulStack:ExportsOutputFnGetAttTable'
                  ),
                },
              ]),
            },
          ]),
        },
      },
    });
  });

  test('should have an iam role allowing the queue lambda to consume from the queue', () => {
    template.hasResource('AWS::IAM::Policy', {
      Properties: {
        PolicyName: Match.stringLikeRegexp('CreateOrderQueueLambda'),
        PolicyDocument: {
          Statement: Match.arrayWith([
            {
              Action: [
                'sqs:ReceiveMessage',
                'sqs:ChangeMessageVisibility',
                'sqs:GetQueueUrl',
                'sqs:DeleteMessage',
                'sqs:GetQueueAttributes',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::ImportValue': Match.stringLikeRegexp(
                  'TestStatefulStack:ExportsOutputFnGetAttQueue'
                ),
              },
            },
          ]),
        },
      },
    });
  });
});
