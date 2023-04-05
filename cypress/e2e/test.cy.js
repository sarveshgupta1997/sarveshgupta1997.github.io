import data from "../../submissionData.json"; // do not create this file

describe("Test", function () {
  Cypress.Screenshot.defaults({
    scale: true,
    onBeforeScreenshot(el) {
      const nav = el.find(".position-sticky");
      const prof = el.find(".js-user-profile-sticky-bar");

      if (nav) {
        nav.attr("style", "position:static !important");
        prof.attr("style", "position:static !important");
      }
    },
    onAfterScreenshot(el) {
      const nav = el.find(".position-sticky");
      const prof = el.find(".js-user-profile-sticky-bar");

      if (nav) {
        nav.attr("style", "position:sticky !important");
        prof.attr("style", "position:sticky !important");
      }
    },
  });
  let acc_score = 0;
  let user_data;
  let pinned_repo;
  let user;

  data.map(({ submission_link: url, id }) => {
    user = url.split("=")[1].split("&")[0];
    if (url && url.length) {
      this.beforeAll(() => {
        cy.request(`https://api.github.com/users/${user}`).should((d) => {
          user_data = d;
        });

        cy.request(
          `https://gh-pinned-repos.egoist.dev/?username=${user}`
        ).should((d) => {
          pinned_repo = d;
        });

        cy.visit(url);
        cy.get('[id="user_search_results"]').within(($list) => {
          cy.wrap($list).get(`a[href="/${user}"]`).eq(0).click();
          cy.then(() => {
            acc_score += 1;
          });
        });
      });

      it(`Linkedin to be present in ReadMe`, () => {
        cy.get('article[itemprop="text"]').within(($div) => {
          cy.wrap($div)
            .get("a")
            .each((el) => {
              let href = el.attr("href");
              if (href.search("https://linkedin.com/in/") != -1)
                cy.request({ url: href, failOnStatusCode: false });
            });
        });
        cy.then(() => {
          acc_score += 1;
        });
      });

      it(`All Links in readme are updated and working`, () => {
        cy.get('article[itemprop="text"]').within(($div) => {
          cy.wrap($div)
            .get("a")
            .each((el) => {
              let href = el.attr("href");

              let x = href.includes("linkedin"); // for linkedin
              let y = href.includes("@"); // for gmail
              let z = href.includes("visitcount"); // for visit count

              if (!x & !y & !z) {
                cy.request({ url: href, failOnStatusCode: false }).then(
                  (req) => {
                    let res = false;
                    if (req.status == 200 || req.status == 429) res = true;
                    if (req.status == 429)
                      cy.log(`${href} giving 429 Error : Too Many Request`);
                    cy.expect(res, `${href} link not working`).equal(true);
                  }
                );
              }
            });
        });
        cy.then(() => {
          acc_score += 1;
        });
      });

      it(`Profile description should be present`, () => {
        cy.expect(user_data.body.bio).not.to.be.empty;
        cy.then(() => {
          acc_score += 1;
        });
      });
      
      it(`Address should be present`, () => {
        expect(user_data.body.location).not.to.be.empty;
        cy.then(() => {
          acc_score += 1;
        });
      });
      it(`Portfolio link should be present in Profile Section(deployed on github.io)`, () => {
        cy.expect(user_data.body.blog).contains("github.io");
        cy.request(user_data.body.blog).its("status").should("eq", 200);
        cy.then(() => {
          acc_score += 1;
        });
      });

      it(`Minimum 3 Pinned Repositories to be present`, () => {
        cy.get('h2[class="f4 mb-2 text-normal"]').contains("Pinned");
        cy.expect(pinned_repo.body.length).to.be.gte(3);
        cy.then(() => {
          acc_score += 1;
        });
      });

      it("Pinned Repos have description", () => {
        cy.get('h2[class="f4 mb-2 text-normal"]').contains("Pinned");
        cy.get(pinned_repo.body)
          .each(($repo) => {
            cy.expect(
              $repo.description,
              `For ${$repo.repo}- Description is missing`
            ).not.to.be.empty;
          })
          .then(() => {
            acc_score += 1;
          });
      });

      it("Pinned Repos have deployed link", () => {
        cy.get('h2[class="f4 mb-2 text-normal"]').contains("Pinned");
        cy.get(pinned_repo.body)
          .each((repo) => {
            if (repo.language != "Java") {
              cy.request(repo.website, `${repo.repo} deployed link not working`)
                .its("status")
                .should("eq", 200);
            }
          })
          .then(() => {
            acc_score += 1;
          });
      });

      it("Should have atleast 10 starred repos", () => {
        cy.request(`https://api.github.com/users/${user}/starred`).should(
          ($d) => {
            console.log("d.body", $d.body);
            console.log("d", $d);

            cy.expect($d.body.length).be.gte(10);
            cy.then(() => {
              acc_score += 1;
            });
          }
        );
      });

      it("Portfolio link is present in ReadMe & is the same as the deployed link in the Profile Section", () => {
        cy.get('article[itemprop="text"]').within(($div) => {
          cy.wrap($div)
            .get("a[href*='.github.io/']")
            .should("have.attr", "href")
            .then((href) => {
              cy.request(href).its("status").should("eq", 200);
              expect(
                href,
                `Portfolio link in ReadMe not the same as the one in Profile Section`
              ).to.equal(user_data.body.blog);
              acc_score += 1;
            });
        });
      });
      
      it(`At least 50 followers should be present - optional`, () => {
        expect(user_data.body.followers).to.be.gte(50)
      });

      it("Screenshot of the Page", () => {
        cy.wait(2000);
        cy.screenshot("Screenshot -- Profile_Page", {
          capture: "fullPage",
        });
      });

      it(`generate score`, () => {
        console.log(acc_score);
        let result = {
          id,
          marks: Math.floor(acc_score),
        };
        result = JSON.stringify(result);
        cy.writeFile("results.json", `\n${result},`, { flag: "a+" }, (err) => {
          if (err) {
            console.error(err);
          }
        });
      });
    }
  });
});
