// Builds the static site and publishes it to the gh-pages branch, which
// GitHub Pages serves at https://satwikkkkk.github.io/expense-tracker/.
// Usage: npm run deploy
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import ghpages from "gh-pages";

// A project site lives under /<repo-name>/, so every asset URL needs that prefix.
process.env.PAGES_BASE_PATH = "/expense-tracker";

execSync("npx next build", { stdio: "inherit", env: process.env });

// Without this file GitHub runs Jekyll, which drops folders starting with "_",
// including _next/ where all the app's code lives.
writeFileSync("out/.nojekyll", "");

await ghpages.publish("out", {
  branch: "gh-pages",
  dotfiles: true,
  message: "Deploy static site",
});

console.log("Published: https://satwikkkkk.github.io/expense-tracker/");
