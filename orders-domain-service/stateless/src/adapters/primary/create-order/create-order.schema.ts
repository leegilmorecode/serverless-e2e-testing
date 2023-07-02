export const schema = {
  type: 'object',
  required: ['quantity', 'price', 'productId'],
  properties: {
    quantity: { type: 'number' },
    price: { type: 'number' },
    productId: { type: 'string' },
  },
  additionalProperties: false,
};
