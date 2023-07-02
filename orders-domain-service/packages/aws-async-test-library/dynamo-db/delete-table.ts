import {
  DeleteTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';

import { delay } from '@packages/aws-async-test-library';

export async function deleteTable(
  region: string,
  tableName: string,
  timeoutInSeconds: number = 1,
  maxIterations: number = 10
): Promise<void> {
  const client: DynamoDBClient = new DynamoDBClient({
    region,
  });

  // start deletion of the table
  const command = new DeleteTableCommand({
    TableName: tableName,
  });
  await client.send(command);

  // ensure that it has been fully deleted before continuing
  const describeTableCommand = new DescribeTableCommand({
    TableName: tableName,
  });

  let isTableDeleted = false;
  let iteration = 1;

  while (!isTableDeleted && iteration <= maxIterations) {
    try {
      const describeTableResponse = await client.send(describeTableCommand);

      if (!describeTableResponse.Table) {
        isTableDeleted = true;
      }
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        isTableDeleted = true;
      } else {
        console.error('Error describing table:', error);
        throw error;
      }
    }

    await delay(timeoutInSeconds);

    iteration++;
  }
}
