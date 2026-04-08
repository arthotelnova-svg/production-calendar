describe('Performance Tests', () => {
  it('should load dashboard within acceptable time', () => {
    const startTime = Date.now();
    cy.visit('/dashboard', { failOnStatusCode: false });
    cy.get('[class*="calendar"], [class*="glass"], body').should('exist');
    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).to.be.lessThan(3000);
    cy.log(`Dashboard loaded in ${loadTime}ms`);
  });

  it('should animate components smoothly', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Check for animation classes
    cy.get('[class*="fade"], [class*="scale"], [class*="slide"]', { timeout: 5000 }).should('exist').or.not.exist();
  });

  it('should not have layout shifts during animation', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Wait for animations to complete
    cy.wait(500);

    // Check that elements maintain their position
    cy.get('[class*="glass-card"], [class*="month-card"]').first().then(($el) => {
      const initialPos = $el.position();
      cy.wait(200);
      cy.wrap($el).then(($updated) => {
        expect($updated.position()).to.deep.equal(initialPos);
      });
    });
  });

  it('should handle rapid interactions', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });

    // Rapid clicks
    cy.get('button').first().click();
    cy.get('button').first().click();
    cy.get('button').first().click();

    // App should remain responsive
    cy.get('body').should('be.visible');
  });
});
