import {
  clearTable,
  getItem,
  httpCall,
} from '@packages/aws-async-test-library';

import { config } from '@config/config';

// set up our constants
const region = config.get('region');
const stageName = config.get('stageName');
const endpoint = config.get('apiEndpoint');

const tableName = `orders-internal-domain-table-${stageName}`;

//               _____________    _____________    _____________
//               |   Orders  |    |   handler  |   |  Table    |
// --> post http |   (API)   | -->|  (Lambda)  |-->| (DynamoDB)|--> Check item exists ✔️
//               _____________    _____________    _____________

describe('create-order-api-to-dynamodb', () => {
  beforeAll(() => {
    jest.retryTimes(2, { logErrorsBeforeRetry: false });
  });

  beforeEach(async () => {
    await clearTable(region, tableName);
  }, 20000);

  afterEach(async () => {
    await clearTable(region, tableName);
  }, 20000);

  it('should create the record successfully in the table', async () => {
    // arrange
    const payload = {
      quantity: 199,
      price: 1.99,
      productId: 'PROD-123',
    };

    const resource = 'orders';
    const method = 'POST';

    // act - call the api endpoint to create a new order
    const { id } = await httpCall(endpoint, resource, method, payload);

    // assert - get the item from the db based on the auto generated id from the api call
    const tableItem = await getItem(region, tableName, id, 10, 2);
    expect(tableItem).toMatchObject(payload);
  }, 60000);
});
