import {
  AttributeValue,
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

export async function clearTable(
  region: string,
  tableName: string
): Promise<void> {
  const client: DynamoDBClient = new DynamoDBClient({
    region,
  });

  const scanCommand = new ScanCommand({
    TableName: tableName,
  });

  const scanResponse: ScanCommandOutput = await client.send(scanCommand);
  const items: Record<string, AttributeValue>[] = scanResponse.Items || [];

  for (const item of items) {
    const order = unmarshall(item);

    const key = marshall({
      id: order.id,
    }) as Record<string, AttributeValue>;

    const deleteCommand = new DeleteItemCommand({
      TableName: tableName,
      Key: key,
    });
    await client.send(deleteCommand);
  }
}
