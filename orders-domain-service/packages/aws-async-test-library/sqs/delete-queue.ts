import {
  DeleteQueueCommand,
  GetQueueUrlCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

export async function deleteQueue(
  region: string,
  queueName: string
): Promise<void> {
  const sqsClient = new SQSClient({ region });

  const getQueueUrlCommand = new GetQueueUrlCommand({
    QueueName: queueName,
  });

  const { QueueUrl } = await sqsClient.send(getQueueUrlCommand);

  const deleteQueueCommand = new DeleteQueueCommand({
    QueueUrl: QueueUrl,
  });

  await sqsClient.send(deleteQueueCommand);
}
