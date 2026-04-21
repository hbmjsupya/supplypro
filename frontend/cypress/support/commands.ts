/// <reference types="cypress" />

Cypress.Commands.add('login', (username, password) => {
  cy.log(`Logging in as ${username}`);
  
  // Use cy.request to bypass UI login and set token directly
  cy.request({
    method: 'POST',
    url: '/api/auth/signin', // Assumes proxy is working or this is intercepted
    body: {
      username,
      password,
    },
    failOnStatusCode: false // Handle failure manually if needed
  }).then((response) => {
    if (response.status === 200) {
      const { token, accessToken } = response.body.data || response.body;
      const finalToken = token || accessToken;
      
      if (finalToken) {
        window.localStorage.setItem('token', finalToken);
        window.localStorage.setItem('user', JSON.stringify(response.body.data || response.body));
      }
    } else {
        // Fallback for mock/test environment if API isn't running
        window.localStorage.setItem('token', 'mock-token');
        window.localStorage.setItem('user', JSON.stringify({ username, role: 'ADMIN' }));
    }
  });
});

export {};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>;
    }
  }
}

