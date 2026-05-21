import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
     
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
    baseUrl: 'http://127.0.0.1:5173',
  },
});
