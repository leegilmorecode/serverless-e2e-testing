import { clearTable, putEvent } from '@packages/aws-async-test-library';

import { config } from '@config/config';
import { scanItems } from '@packages/aws-async-test-library/dynamo-db/scan-items';

// set up our constants
const region = config.get('region');
const stageName = config.get('stageName');

const tableName = `orders-internal-domain-table-${stageName}`;
const busName = `orders-domain-event-bus-${stageName}`;

//               _________________    _________   ____________   ______________
//               |   Orders Bus  |    | Queue |   |  Handler |   |   Table    |
// --> put event | (EventBridge) | -->| (SQS) |-->| (Lambda) |-->| (DynamoDB) |--> Check item exists ✔️
//               -----------------    ----------  ------------   ---------------

describe('3rd-party-orders-bus-to-dynamodb', () => {
  beforeAll(() => {
    jest.retryTimes(2, { logErrorsBeforeRetry: false });
  });

  beforeEach(async () => {
    await clearTable(region, tableName);
  }, 20000);

  afterEach(async () => {
    await clearTable(region, tableName);
  }, 20000);

  it('should create the 3rd party order successfully in the table', async () => {
    // arrange
    const event = {
      quantity: 9811,
      price: 2,
      productId: '3RD_PARTY_ORDER',
    };

    // act
    await putEvent(
      region,
      busName,
      'com.shared.bus',
      '3rdPartyOrderRaised',
      event
    );

    // assert - get the item from the db based on the auto generated id from the api call
    const tableItems = await scanItems(region, tableName, 7);

    expect(tableItems[0]).toMatchObject({
      quantity: 9811,
      price: 2,
      productId: '3RD_PARTY_ORDER',
    });
  }, 60000);
});
