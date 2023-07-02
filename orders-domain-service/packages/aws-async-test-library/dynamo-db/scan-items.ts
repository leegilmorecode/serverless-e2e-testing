import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';

import { delay } from '@packages/aws-async-test-library';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export async function scanItems(
  region: string,
  tableName: string,
  startDelayInSeconds?: number,
  id?: string
): Promise<Record<string, any>[]> {
  if (startDelayInSeconds) {
    await delay(startDelayInSeconds);
  }

  const client: DynamoDBClient = new DynamoDBClient({
    region,
  });

  const scanCommandInput = {
    TableName: tableName,
  };

  const scanCommand = new ScanCommand(scanCommandInput);
  const response: ScanCommandOutput = await client.send(scanCommand);
  const { Items: items } = response;

  if (items?.length && id) {
    const unmarshalledItems = items.map((item) => unmarshall(item));

    return unmarshalledItems.filter((item) => item.id === id);
  }

  return items?.length ? items.map((item) => unmarshall(item)) : [];
}
