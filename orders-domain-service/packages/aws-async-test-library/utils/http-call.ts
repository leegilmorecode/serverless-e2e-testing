import axios, { AxiosResponse } from 'axios';

export async function httpCall(
  endpoint: string,
  resource: string,
  method: string,
  payload?: Record<string, any>
): Promise<Record<string, any>> {
  const url = `${endpoint}${resource}`;

  try {
    const response: AxiosResponse = await axios({
      url,
      method,
      data: payload,
    });

    return response.data;
  } catch (error) {
    console.error('Error performing HTTP call:', error);
    throw error;
  }
}
