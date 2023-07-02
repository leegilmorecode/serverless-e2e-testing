import {
  CloudWatchEventsClient,
  PutRuleCommand,
  PutTargetsCommand,
} from '@aws-sdk/client-cloudwatch-events';
import {
  CreateQueueCommand,
  SQSClient,
  SetQueueAttributesCommand,
} from '@aws-sdk/client-sqs';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

export async function createQueueForBus(
  busName: string,
  queueName: string,
  region: string,
  source: string,
  detailType: string,
  ruleName: string
): Promise<string> {
  const cloudWatchEventsClient = new CloudWatchEventsClient({ region });
  const sqsClient = new SQSClient({ region });

  // get the AWS account ID
  const accountId = await getAccountId();

  // create the queue
  const createQueueCommand = new CreateQueueCommand({
    QueueName: queueName,
  });

  const createQueueResult = await sqsClient.send(createQueueCommand);
  const { QueueUrl } = createQueueResult;

  // create the permissions for the target rule allowing the eventbridge target rule to send messages to the queue
  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Service: 'events.amazonaws.com' },
        Action: [
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl',
          'sqs:SendMessage',
        ],
        Resource: `arn:aws:sqs:${region}:${accountId}:${queueName}`,
        Condition: {
          ArnEquals: {
            'aws:SourceArn': `arn:aws:events:${region}:${accountId}:rule/${busName}/${ruleName}`,
          },
        },
      },
    ],
  };

  const setQueueAttributesCommand = new SetQueueAttributesCommand({
    QueueUrl,
    Attributes: {
      Policy: JSON.stringify(policyDocument),
    },
  });

  await sqsClient.send(setQueueAttributesCommand);

  // create the rule
  const putRuleCommand = new PutRuleCommand({
    Name: ruleName,
    EventPattern: JSON.stringify({
      'detail-type': [detailType],
      source: [source],
    }),
    EventBusName: busName,
    State: 'ENABLED',
  });

  await cloudWatchEventsClient.send(putRuleCommand);

  // create the target based on the rule
  const putTargetsCommand = new PutTargetsCommand({
    Rule: ruleName,
    EventBusName: `${busName}`,
    Targets: [
      {
        Arn: `arn:aws:sqs:${region}:${accountId}:${queueName}`,
        Id: ruleName,
      },
    ],
  });
  await cloudWatchEventsClient.send(putTargetsCommand);

  return QueueUrl as string;
}

async function getAccountId(): Promise<string> {
  const stsClient = new STSClient({});
  const { Account } = await stsClient.send(new GetCallerIdentityCommand({}));
  return Account!;
}
