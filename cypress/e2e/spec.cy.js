describe('Test if the website behaves as expected', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('Check if it is running in production mode', () => {
    cy.get('[name="robots"]')
      .should('have.attr','content','index, follow')
  })
})