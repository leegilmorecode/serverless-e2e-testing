export const schema = {
  type: 'object',
  required: ['id', 'quantity', 'price', 'productId', 'created'],
  properties: {
    id: { type: 'string' },
    created: { type: 'string' },
    quantity: { type: 'number' },
    price: { type: 'number' },
    productId: { type: 'string' },
  },
  additionalProperties: false,
};
