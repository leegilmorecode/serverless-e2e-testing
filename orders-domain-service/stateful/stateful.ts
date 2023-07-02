import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as targets from 'aws-cdk-lib/aws-events-targets';

import { Construct } from 'constructs';

interface OrdersDomainServiceStatefulStackProps extends cdk.StackProps {
  stageName: string;
}

export class OrdersDomainServiceStatefulStack extends cdk.Stack {
  public table: dynamodb.Table;
  public bus: events.EventBus;
  public queue: sqs.Queue;

  constructor(
    scope: Construct,
    id: string,
    props: OrdersDomainServiceStatefulStackProps
  ) {
    super(scope, id, props);
    // create the domain event bus for orders
    this.bus = new events.EventBus(this, 'InternalOrdersDomainEventBus', {
      eventBusName: `orders-domain-event-bus-${props.stageName}`,
    });
    this.bus.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // create a log group so we send all events to this
    const ordersEventLogs: logs.LogGroup = new logs.LogGroup(
      this,
      'OrdersEventLogs',
      {
        logGroupName: `orders-internal-event-logs-${props.stageName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
      }
    );

    // log all of the orders events to cloudwatch
    new events.Rule(this, 'LogAllOrderEventsToCloudwatch', {
      eventBus: this.bus,
      ruleName: `orders-internal-log-all-rule-${props.stageName}`,
      description: 'log all shared ESB events',
      eventPattern: {
        source: [{ prefix: '' }] as any[], // match all events
      },
      targets: [new targets.CloudWatchLogGroup(ordersEventLogs)],
    });

    // create the orders dynamodb table
    this.table = new dynamodb.Table(this, 'InternalOrdersTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false,
      tableName: `orders-internal-domain-table-${props.stageName}`,
      contributorInsightsEnabled: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      stream: dynamodb.StreamViewType.NEW_IMAGE, // this enables the stream
    });

    // create the sqs queue for the orders
    this.queue = new sqs.Queue(this, 'InternalOrdersQueue', {
      queueName: `orders-internal-queue-${props.stageName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // create a rule so sqs is a target of the orders event bus for all events
    // which match the source of the shared event bus and with the detailtype of
    // '3rdPartyOrderRaised'
    const queueRule = new events.Rule(this, 'OrdersSQSQueueRule', {
      ruleName: `orders-internal-bus-to-queue-rule-${props.stageName}`,
      eventBus: this.bus,
      eventPattern: {
        source: ['com.shared.bus'],
        detailType: ['3rdPartyOrderRaised'],
      },
    });
    queueRule.addTarget(new targets.SqsQueue(this.queue));
  }
}
