import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from '@aws-sdk/client-dynamodb';

import { marshall } from '@aws-sdk/util-dynamodb';

export async function putItem(
  region: string,
  tableName: string,
  item: Record<string, any>
): Promise<void> {
  const client: DynamoDBClient = new DynamoDBClient({
    region,
  });

  const putItemInput: PutItemCommandInput = {
    TableName: tableName,
    Item: marshall(item),
  };

  const putItemCommand = new PutItemCommand(putItemInput);

  try {
    await client.send(putItemCommand);
  } catch (error) {
    console.error('Error putting item into DynamoDB table:', error);
    throw error;
  }
}
