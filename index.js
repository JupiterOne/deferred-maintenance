#!/usr/bin/env node

/**
 * deferred-maintenance
 * Manage maintenance Findings in JupiterOne for one or more CodeRepos.
 *
 * @author Erich Smith <https://github.com/erichs>
 */

const init = require("./utils/init");
const cli = require("./utils/cli");
const log = require("./utils/log");
const { validateEnv } = require("./utils/validation");
const MaintenanceClient = require("./maintenance");
const prompts = require("prompts");
const validUrl = require("valid-url");

const input = cli.input;
const flags = cli.flags;
const { clear, debug } = flags;

async function handleOpen(client) {
  validateEnv();
  const { j1ql } = await prompts({
    type: "text",
    name: "j1ql",
    message: "Enter a valid J1QL query (HIGHLY recommended to do this first from the landing console!):",
    initial: "FIND CodeRepo with name = ('foo' or 'bar')"
  });
  const entities = await client.gatherEntities(j1ql);
  if (!entities.length) {
    console.error("invalid query, or no results");
    process.exit(2);
  }
  const { yesno } = await prompts({
    type: "confirm",
    name: "yesno",
    message: `Looks like this will impact ${entities.length} entities. OK to proceed?`,
    initial: true
  });
  if (!yesno) {
    console.log("skipping...");
    process.exit(0);
  }

  const maintenance = await prompts([
    {
      type: "text",
      name: "shortDescription",
      message: "Enter a *very* short description of the maintenance needed:",
      validate: str => str.length <= 50 ? true : "Must be 50 chars or less (visible in the graph)"
    },
    {
      type: "text",
      name: "description",
      message: "Enter a fuller description of the maintenance:"
    },
    {
      type: "text",
      name: "webLink",
      message: "Enter a URL weblink (issue, Slack comment, etc):",
      validate: url => validUrl.isWebUri(url) ? true : 'Must enter a valid web URL.'
    },
    {
      type: "select",
      name: "dueDate",
      message: "Pick a realistic due date for this maintenance:",
      choices: [
        { title: "7d", description: "7 days from now.", value: Date.now() + (7 * 24 * 60 * 60 * 1000) },
        { title: "30d", description: "30 days from now.", value: Date.now() + (30 * 24 * 60 * 60 * 1000) },
        { title: "60d", description: "60 days from now.", value: Date.now() + (60 * 24 * 60 * 60 * 1000) },
        { title: "90d", description: "90 days from now.", value: Date.now() + (90 * 24 * 60 * 60 * 1000) },
      ],
      initial: 0
    }
  ]);

  await client.applyDeferredMaintenanceToEntities(entities, maintenance)
  console.log("assign OK");
}

async function handleClose(client) {
  validateEnv();
  const { j1ql } = await prompts({
    type: "text",
    name: "j1ql",
    message: "Enter a J1QL query that returns maintenance entities:",
    initial: "FIND deferred_maintenance with maintenanceId='decafbad012345"
  });
  const entities = await client.gatherEntities(j1ql);
  if (!entities.length) {
    console.error("invalid query, or no results");
    process.exit(2);
  }
  const { yesno } = await prompts({
    type: "confirm",
    name: "yesno",
    message: `Looks like this will impact ${entities.length} entities. OK to proceed?`,
    initial: true
  });
  if (!yesno) {
    console.log("skipping...");
    process.exit(0);
  }
  const { link } = await prompts({
    type: "text",
    name: "link",
    message: "Enter a URL linking to maintenance performed (issue, pull request, etc):",
    validate: url => validUrl.isWebUri(url) ? true : 'Must enter a valid web URL.'
  })
  await client.closeMaintenanceEntities(entities, link);
  console.log("close OK");
}

(async () => {
  init({ clear });

  const client = new MaintenanceClient();
  await client.init();

  switch(true) {
    case input.includes("help"):
      cli.showHelp(0);
      process.exit(0);
      break;
    case input.includes("open"):
     await handleOpen(client);
     break;
    case input.includes("close"):
     await handleClose(client);
      break;
    default:
      console.error("unrecognized command");
      cli.showHelp(1);
      process.exit(2);
  }
})();
