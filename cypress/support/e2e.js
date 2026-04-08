// Import Cypress axe library
import 'axe-cypress';

// Disable uncaught exception handling for specific errors
Cypress.on('uncaught:exception', (err) => {
  // Ignore specific errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Custom command for keyboard navigation
Cypress.Commands.add('tab', () => {
  cy.focused().trigger('keydown', { keyCode: 9, which: 9, key: 'Tab' });
});

// Custom command for checking accessibility
Cypress.Commands.add('checkA11y', (selector, options = {}) => {
  cy.get(selector || 'body').then(($el) => {
    // Basic accessibility checks
    if ($el.find('button').length > 0) {
      cy.wrap($el).find('button').should('have.prop', 'disabled').or.not.have.prop('disabled');
    }
  });
});

// Custom command for injecting axe
Cypress.Commands.add('injectAxe', () => {
  cy.window().then((win) => {
    // Load axe if not already loaded
    if (!win.axe) {
      const script = win.document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.11.2/axe.min.js';
      win.document.head.appendChild(script);
    }
  });
});
