import { DescribeTableCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';

export async function checkTableExists(
  region: string,
  tableName: string
): Promise<boolean> {
  try {
    const client: DynamoDBClient = new DynamoDBClient({
      region,
    });

    const describeTableCommand = new DescribeTableCommand({
      TableName: tableName,
    });

    await client.send(describeTableCommand);
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw new Error('unknown error');
  }
}
