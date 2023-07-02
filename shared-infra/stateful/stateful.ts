import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as targets from 'aws-cdk-lib/aws-events-targets';

import { Construct } from 'constructs';

interface SharedInfraStatefulStackProps extends cdk.StackProps {
  stageName: string;
  ordersEventBusName: string;
}

export class SharedInfraStatefulStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: SharedInfraStatefulStackProps
  ) {
    super(scope, id, props);

    // create the shared event bus for all domains
    const sharedEventBus: events.EventBus = new events.EventBus(
      this,
      'SharedEventBus',
      {
        eventBusName: `shared-domains-event-bus-${props.stageName}`,
      }
    );
    sharedEventBus.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // create a log group so we send all events to this
    const sharedEventLogs: logs.LogGroup = new logs.LogGroup(
      this,
      'SharedEventLogs',
      {
        logGroupName: `shared-event-logs-${props.stageName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
      }
    );

    // log all of the events to cloudwatch
    new events.Rule(this, 'LogAllEventsToCloudwatch', {
      eventBus: sharedEventBus,
      ruleName: `shared-bus-log-all-rule-${props.stageName}`,
      description: 'log all shared ESB events',
      eventPattern: {
        source: [{ prefix: '' }] as any[], // match all events
      },
      targets: [new targets.CloudWatchLogGroup(sharedEventLogs)],
    });

    // get a reference to the orders event bus
    const ordersEventBus = events.EventBus.fromEventBusName(
      this,
      'OrdersInternalEventBus',
      props.ordersEventBusName
    );

    // create a target rule shared bus -> orders bus where
    // the source of the event is "com.shared.bus" and detail type is "3rdPartyOrderRaised"
    const sourceRule = new events.Rule(this, 'OrdersEventSourceRule', {
      ruleName: `shared-bus-to-orders-bus-rule-${props.stageName}`,
      eventBus: sharedEventBus,
      eventPattern: {
        source: ['com.shared.bus'],
        detailType: ['3rdPartyOrderRaised'],
      },
    });

    sourceRule.addTarget(new targets.EventBus(ordersEventBus));
  }
}
