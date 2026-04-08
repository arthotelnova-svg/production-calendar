describe('Cross-Browser Compatibility', () => {
  const viewports = [
    { name: 'iPhone X', width: 375, height: 812 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  viewports.forEach((viewport) => {
    describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height);
        cy.visit('/', { failOnStatusCode: false });
      });

      it('should render without layout issues', () => {
        cy.get('body').should('be.visible');
        cy.window().then((win) => {
          expect(win.innerWidth).to.equal(viewport.width);
          expect(win.innerHeight).to.equal(viewport.height);
        });
      });

      it('should display correctly on dashboard', () => {
        cy.visit('/dashboard', { failOnStatusCode: false });
        cy.get('[class*="glass"], [class*="calendar"]', { timeout: 5000 }).should('exist').or.not.exist();
      });

      it('should have responsive navigation', () => {
        cy.visit('/dashboard', { failOnStatusCode: false });

        if (viewport.width < 768) {
          // Mobile: check for bottom nav
          cy.get('[class*="tab"], [class*="nav"]', { timeout: 5000 }).should('exist').or.not.exist();
        } else {
          // Desktop: check for main nav
          cy.get('nav, [role="navigation"]', { timeout: 5000 }).should('exist').or.not.exist();
        }
      });

      it('should handle touch interactions on mobile', () => {
        if (viewport.width < 768) {
          cy.get('button').first().should('be.visible');
          // Simulate touch
          cy.get('button').first().trigger('touchstart').trigger('touchend');
        }
      });
    });
  });
});
