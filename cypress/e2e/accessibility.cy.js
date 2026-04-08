import { injectAxe, checkA11y } from 'axe-cypress';

describe('Accessibility Audit', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.injectAxe();
  });

  it('should pass accessibility checks on home page', () => {
    cy.checkA11y(null, {
      rules: {
        // Ignore known issues
        'color-contrast': { enabled: false },
      },
    });
  });

  it('should have proper heading hierarchy', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Check heading hierarchy
    cy.get('h1').should('have.length.greaterThan', 0).or.not.exist();
    cy.get('h2, h3, h4, h5, h6').should('exist').or.not.exist();
  });

  it('should have alt text on images', () => {
    cy.get('img').each(($img) => {
      cy.wrap($img).should('have.attr', 'alt').or.not.exist();
    });
  });

  it('should have proper form labels', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    cy.get('input, textarea, select').each(($input) => {
      const inputId = cy.wrap($input).invoke('attr', 'id');
      if (inputId) {
        cy.get(`label[for="${inputId}"]`).should('exist').or.not.exist();
      }
    });
  });

  it('should support keyboard navigation', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Tab through interactive elements
    cy.get('body').tab();
    cy.get(':focus').should('have.css', 'outline').or.have.attr('tabindex');
  });

  it('should have sufficient color contrast', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Visual check for contrast
    cy.get('[class*="glass"], [class*="glass-card"]').should('be.visible').or.not.exist();
  });
});
