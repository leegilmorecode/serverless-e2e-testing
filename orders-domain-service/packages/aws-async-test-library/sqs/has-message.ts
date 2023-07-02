import {
  ReceiveMessageCommand,
  ReceiveMessageCommandOutput,
  SQSClient,
} from '@aws-sdk/client-sqs';

import { delay } from '@packages/aws-async-test-library';

export async function hasMessage(
  region: string,
  queueUrl: string,
  timeoutInSeconds: number = 2,
  maxIterations: number = 20,
  property?: string,
  propertyValue?: string | number
): Promise<string | null> {
  const client = new SQSClient({ region });

  let iteration = 1;

  while (iteration <= maxIterations) {
    const receiveMessageCommand = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 2,
    });

    try {
      const response: ReceiveMessageCommandOutput = await client.send(
        receiveMessageCommand
      );

      const messages = response.Messages;

      if (messages && messages.length > 0) {
        const message = messages[0];

        if (!message.Body) {
          throw new Error('message has no body');
        }

        // if the optional property value is provided then filter the message
        if (property && propertyValue) {
          const parsedMessage = JSON.parse(message.Body);

          const properties = property.split('.');
          let value = parsedMessage;

          for (const property of properties) {
            if (value && value.hasOwnProperty(property)) {
              value = value[property];
            } else {
              return null;
            }
          }

          if (value === propertyValue) {
            return message.Body;
          }
        } else {
          // if not then just return the first message found
          return message.Body;
        }
      }
    } catch (error) {
      console.error('Error receiving message:', error);
      throw error;
    }

    await delay(timeoutInSeconds);

    iteration++;
  }

  return null;
}
