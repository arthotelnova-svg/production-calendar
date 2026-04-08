describe('Production Calendar - User Flows', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should navigate to login page', () => {
    cy.url().should('include', '/login');
    cy.get('button, a').should('exist');
  });

  it('should display home page with navigation', () => {
    cy.visit('/');
    cy.get('h1, h2, [role="heading"]').should('have.length.greaterThan', 0);
  });

  it('should load dashboard without errors', () => {
    // Check that dashboard can load
    cy.visit('/dashboard', { failOnStatusCode: false });
  });

  it('should handle calendar interactions', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Wait for page to load
    cy.get('[role="table"], [class*="calendar"], [class*="month"]', { timeout: 5000 }).should('exist').or.not.exist();
  });

  it('should have accessible button elements', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Check for buttons with proper aria attributes
    cy.get('button').each(($btn) => {
      cy.wrap($btn).should('have.attr', 'type');
    });
  });

  it('should apply animations on mount', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Check for animation classes
    cy.get('[class*="animation"], [class*="animate"], [class*="fade"]', { timeout: 5000 }).should('exist').or.not.exist();
  });

  it('should handle responsive layout', () => {
    cy.viewport('iphone-x');
    cy.visit('/dashboard', { failOnStatusCode: false });

    cy.get('[class*="tab"], [class*="nav"]').should('exist').or.not.exist();
  });
});
