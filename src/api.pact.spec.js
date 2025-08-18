import { PactV3 } from '@pact-foundation/pact';
import { API } from './api';
import { MatchersV3 } from '@pact-foundation/pact';
import { Product } from './product';
const { eachLike, like } = MatchersV3;
const Pact = PactV3;

const mockProvider = new Pact({
  consumer: 'pactflow-example-consumer',
  provider: process.env.PACT_PROVIDER
    ? process.env.PACT_PROVIDER
    : 'pactflow-example-provider'
});

describe('API Pact test', () => {
  describe('retrieving a product', () => {
    test('ID 10 exists', async () => {
      // Arrange
      const expectedProduct = {
        id: '10',
        type: 'CREDIT_CARD',
        name: '28 Degrees',
        quantity: 1
      };

      // Uncomment to see this fail
      // const expectedProduct = { id: '10', type: 'CREDIT_CARD', name: '28 Degrees', price: 30.0, newField: 22}

      mockProvider
        .given('a product with ID 10 exists')
        .uponReceiving('a request to get a product')
        .withRequest({
          method: 'GET',
          path: '/product/10',
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z')
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: like(expectedProduct)
        });
      return mockProvider.executeTest(async (mockserver) => {
        // Act
        const api = new API(mockserver.url);
        const product = await api.getProduct('10');

        // Assert - did we get the expected response
        expect(product).toStrictEqual(new Product(expectedProduct));
        return;
      });
    });

    test('product does not exist', async () => {
      // set up Pact interactions

      mockProvider
        .given('a product with ID 11 does not exist')
        .uponReceiving('a request to get a product')
        .withRequest({
          method: 'GET',
          path: '/product/11',
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z')
          }
        })
        .willRespondWith({
          status: 404
        });
      return mockProvider.executeTest(async (mockserver) => {
        const api = new API(mockserver.url);

        // make request to Pact mock server
        await expect(api.getProduct('11')).rejects.toThrow(
          'Request failed with status code 404'
        );
        return;
      });
    });
  });
  describe('retrieving products', () => {
    test('products exists', async () => {
      // set up Pact interactions
      const expectedProduct = {
        id: '10',
        type: 'CREDIT_CARD',
        name: '28 Degrees'
      };

      mockProvider
        .given('products exist')
        .uponReceiving('a request to get all products')
        .withRequest({
          method: 'GET',
          path: '/products',
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z')
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: eachLike(expectedProduct)
        });
      return mockProvider.executeTest(async (mockserver) => {
        const api = new API(mockserver.url);

        // make request to Pact mock server
        const products = await api.getAllProducts();

        // assert that we got the expected response
        expect(products).toStrictEqual([new Product(expectedProduct)]);
        return;
      });
    });
  });

  describe('changing user password', () => {
    test('successful password change', async () => {
      // Arrange
      const userData = {
        username: 'test@example.com',
        userResourceGuid: '123e4567-e89b-12d3-a456-426614174000'
      };

      const changePasswordRequest = {
        oldPassword: 'oldPassword123',
        newPassword: 'newPassword456'
      };

      mockProvider
        .given('a user exists with valid credentials')
        .uponReceiving('a request to change user password')
        .withRequest({
          method: 'POST',
          path: '/user/change-password',
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z'),
            'Content-Type': 'application/json'
          },
          body: {
            emailAddress: like('test@example.com'),
            userResourceGuid: like('123e4567-e89b-12d3-a456-426614174000'),
            oldPassword: like('oldPassword123'),
            newPassword: like('newPassword456')
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            success: like(true),
            message: like('Password changed successfully')
          }
        });

      return mockProvider.executeTest(async (mockserver) => {
        // Act
        const api = new API(mockserver.url);
        const result = await api.changeUserPassword(userData, changePasswordRequest);

        // Assert
        expect(result.success).toBe(true);
        expect(result.message).toBe('Password changed successfully');
        return;
      });
    });

    test('password change with invalid old password', async () => {
      // Arrange
      const userData = {
        username: 'test@example.com',
        userResourceGuid: '123e4567-e89b-12d3-a456-426614174000'
      };

      const changePasswordRequest = {
        oldPassword: 'wrongPassword',
        newPassword: 'newPassword456'
      };

      mockProvider
        .given('a user exists but old password is incorrect')
        .uponReceiving('a request to change user password with wrong old password')
        .withRequest({
          method: 'POST',
          path: '/user/change-password',
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z'),
            'Content-Type': 'application/json'
          },
          body: {
            emailAddress: like('test@example.com'),
            userResourceGuid: like('123e4567-e89b-12d3-a456-426614174000'),
            oldPassword: like('wrongPassword'),
            newPassword: like('newPassword456')
          }
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: {
            error: like('Invalid old password'),
            code: like('INVALID_OLD_PASSWORD')
          }
        });

      return mockProvider.executeTest(async (mockserver) => {
        // Act & Assert
        const api = new API(mockserver.url);
        await expect(api.changeUserPassword(userData, changePasswordRequest))
          .rejects.toThrow('Request failed with status code 400');
        return;
      });
    });

    test('password change for non-existent user', async () => {
      // Arrange
      const userData = {
        username: 'nonexistent@example.com',
        userResourceGuid: '999e4567-e89b-12d3-a456-426614174999'
      };

      const changePasswordRequest = {
        oldPassword: 'anyPassword',
        newPassword: 'newPassword456'
      };

      mockProvider
        .given('a user does not exist')
        .uponReceiving('a request to change password for non-existent user')
        .withRequest({
          method: 'POST',
          path: '/user/change-password',
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z'),
            'Content-Type': 'application/json'
          },
          body: {
            emailAddress: like('nonexistent@example.com'),
            userResourceGuid: like('999e4567-e89b-12d3-a456-426614174999'),
            oldPassword: like('anyPassword'),
            newPassword: like('newPassword456')
          }
        })
        .willRespondWith({
          status: 404,
          headers: {
            'Content-Type': 'application/text; charset=utf-8'
          },
          body: {
            error: like('User not found'),
            code: like('USER_NOT_FOUND')
          }
        });

      return mockProvider.executeTest(async (mockserver) => {
        // Act & Assert
        const api = new API(mockserver.url);
        await expect(api.changeUserPassword(userData, changePasswordRequest))
          .rejects.toThrow('Request failed with status code 404');
        return;
      });
    });
  });
});
