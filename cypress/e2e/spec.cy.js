describe('Test if the website behaves as expected', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('URL'))
  })

  it('Check if it is running in production mode', () => {
    if(Cypress.env('URL') == "http://localhost:1313/") {
      cy.get('[name="robots"]')
        .should('have.attr','content','noindex, nofollow')
    } else {
      cy.get('[name="robots"]')
        .should('have.attr','content','index, follow')
    }
  })

  it('Check if main page title is rendered', () => {
    cy.get('a').contains('Time-to-Geek') 
  })

  it('Check if About,articles,Contact sections are visible', () => {
    cy.get('ul.pl0.mr3').children().should('have.length', 3) 
  })

  it('Check if the title when the website starts is Time to Geek | Time-to-Geek', () => {
    cy.title().should('eq', 'Time to Geek | Time-to-Geek')
  })

  it('Check if Github link is rendered', () => {
    console.log(cy.get('div.ananke-socials').first())
    cy.get('div.ananke-socials').find('a').should('have.attr','href','https://github.com/yvesDenis')
  })

  it('Check if The number of artcles is correct', () => {
    cy.get('[title="Articles page"]').click()

    cy.get('h1').contains('Articles')

    cy.get('aside').children().should('have.length', 3) 

  })
})