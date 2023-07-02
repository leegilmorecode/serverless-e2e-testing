import {
  checkTableExists,
  clearTable,
  createTable,
  deleteTable,
  getItem,
} from '@packages/aws-async-test-library/dynamo-db';

import { OrderDto } from '@dto/order-dto';
import { config } from '@config/config';
import { generateRandomId } from '@packages/aws-async-test-library';

// we ensure that the table name never clashes with other ephemeral envs
const tableName = `database-adapter-${generateRandomId(7)}-table`;

// set up our constants
const region = config.get('region');

describe('database-adapter-integration-tests', () => {
  beforeAll(async () => {
    jest.retryTimes(2, { logErrorsBeforeRetry: true });

    // create the table if it doesn't already exist
    const tableExists = await checkTableExists(region, tableName);
    if (!tableExists) {
      await createTable(
        region,
        tableName,
        [{ AttributeName: 'id', KeyType: 'HASH' }],
        [{ AttributeName: 'id', AttributeType: 'S' }]
      );
    }
  }, 12000);

  afterEach(async () => {
    // after each test clear the table down to ensure we have a clean start
    await clearTable(region, tableName);
  }, 12000);

  afterAll(async () => {
    // after all tests delete the table if it exists
    const tableExists = await checkTableExists(region, tableName);
    if (tableExists) {
      await deleteTable(region, tableName);
    }
  }, 12000);

  describe('create order successfully', () => {
    it('should write the record to the table successfully', async () => {
      // arrange
      const record: OrderDto = {
        quantity: 3,
        productId: 'test-123',
        id: '4f9a8a09-b2c1-49a1-bc20-7bbc0811c0dc',
        created: '2023-07-04T09:12:30.138Z',
        price: 3.98,
      };

      // act
      const { createOrder } = await import('./database-adapter');
      await createOrder(record, tableName);

      // assert
      const item = await getItem(
        region,
        tableName,
        '4f9a8a09-b2c1-49a1-bc20-7bbc0811c0dc'
      );

      expect(item).toEqual(record);
    }, 30000);
  });
});
