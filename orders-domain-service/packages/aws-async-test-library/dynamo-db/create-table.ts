import {
  AttributeDefinition,
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  DescribeTableCommandInput,
  DynamoDBClient,
  KeySchemaElement,
} from '@aws-sdk/client-dynamodb';

import { delay } from '@packages/aws-async-test-library';

export async function createTable(
  region: string,
  tableName: string,
  keySchema: KeySchemaElement[],
  attributeDefinitions: AttributeDefinition[],
  timeoutInSeconds: number = 2,
  maxIterations: number = 10
): Promise<void> {
  const client: DynamoDBClient = new DynamoDBClient({
    region,
  });

  const createTableCommandInput: CreateTableCommandInput = {
    TableName: tableName,
    KeySchema: keySchema,
    AttributeDefinitions: attributeDefinitions,
    BillingMode: 'PAY_PER_REQUEST',
  };

  const createTableCommand = new CreateTableCommand(createTableCommandInput);
  await client.send(createTableCommand);

  const describeTableCommandInput: DescribeTableCommandInput = {
    TableName: tableName,
  };

  // ensure that the table has been fully provisioned
  let iteration = 1;
  while (iteration <= maxIterations) {
    try {
      const describeTableCommand = new DescribeTableCommand(
        describeTableCommandInput
      );
      const describeTableResponse = await client.send(describeTableCommand);
      const tableStatus = describeTableResponse.Table?.TableStatus;

      if (tableStatus === 'ACTIVE') {
        return;
      }
    } catch (error) {
      console.error(error);
      throw error;
    }

    await delay(timeoutInSeconds);

    iteration++;
  }
}
