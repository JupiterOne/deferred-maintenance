#!/usr/bin/env node

/**
 * deferred-maintenance
 * Manage maintenance Findings in JupiterOne for one or more CodeRepos.
 *
 * @author JupiterOne <https://github.com/jupiterone>
 */

const init = require("./utils/init");
const cli = require("./utils/cli");
const log = require("./utils/log");
const { validateEnv } = require("./utils/validation");
const MaintenanceClient = require("./maintenance");
const prompts = require("prompts");
const validUrl = require("valid-url");
const Table = require("cli-table3");
const moment = require("moment");
const tbg = require("terminal-bigtext-generator");
const fs = require('fs');

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
  console.log("Looks like this will impact:");
  tbg.print(`${entities.length}  entities`);
  const { yesno } = await prompts({
    type: "confirm",
    name: "yesno",
    message: "OK to proceed?",
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
        { title: "180d", description: "180 days from now.", value: Date.now() + (180 * 24 * 60 * 60 * 1000) },
        { title: "365d", description: "1 year from now.", value: Date.now() + (365 * 24 * 60 * 60 * 1000) },
      ],
      initial: 0
    }
  ]);

  const email = discoverUserEmail();
  if (email) {
    maintenance.createdBy = email;
  }
  await client.applyDeferredMaintenanceToEntities(entities, maintenance)
  console.log("Open OK");
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
  console.log("Looks like this will impact:");
  tbg.print(`${entities.length}  entities`);
  const { yesno } = await prompts({
    type: "confirm",
    name: "yesno",
    message: "OK to proceed?",
    initial: true
  });
  if (!yesno) {
    console.log("skipping...");
    process.exit(0);
  }
  const closeProperties = await prompts([
    {
      type: "select",
      name: "closeReason",
      message: "Why are you closing this maintenance?",
      choices: [
        { title: "COMPLETE", description: "Work has been performed.", value: "COMPLETE" },
        { title: "ERROR", description: "Maintenance was opened in error.", value: "ERROR" },
        { title: "RISK_ACCEPTED", description: "Business accepts maintenance risk.", value: "RISK_ACCEPTED" },
      ]
    },
    {
      type: prev => prev != "ERROR" ? "text" : null,
      name: "maintenanceLink",
      message: "Enter a URL linking to maintenance performed (issue, pull request, etc):",
      validate: url => validUrl.isWebUri(url) ? true : 'Must enter a valid web URL.'
    }
  ]);
  closeProperties.closedBy = discoverUserEmail();

  await client.closeMaintenanceEntities(entities, closeProperties);
  console.log("Close OK");
}

function discoverUserEmail() {
  if (process.env.J1_EMAIL) {
    return process.env.J1_EMAIL;
  }
  try {
    const conf = JSON.parse(fs.readFileSync('/var/j1endpointagent/agent.conf', 'utf8'));
    return conf.email;
  } catch (err) {
    return undefined;
  }
}

function discoverCodeRepo() {
  if (fs.existsSync('.git')) {
    const pwd = process.env.OUTERPWD || process.env.PWD;
    return pwd.split('/').pop();
  }
}

async function userMaintenanceReport(client) {
  validateEnv();
  console.log("Gathering maintenance report...")
  const codeRepo = discoverCodeRepo();
  const email = discoverUserEmail();
  let query;
  const tableFormatOptions = {
   chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
      , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
      , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
      , 'right': '' , 'right-mid': '' , 'middle': ' ' },
      style: { 'padding-left': 0, 'padding-right': 0 },
  };
  if (codeRepo) {
    const repoTable = new Table({
      head: ['maintenanceId', 'due', 'description', 'link'],
      ...tableFormatOptions
    });
    query = `Find deferred_maintenance with closed=false as m that HAS CodeRepo with name = "${codeRepo}" return m.maintenanceId as maintenanceId, m.shortDescription as description, m.dueDate as dueDate, m.webLink as webLink ORDER by m.dueDate ASC`;
    const repoMaint = await client.gatherEntities(query);
    if (repoMaint.length) {
      console.log(`${codeRepo} maintenance needed:`)
      for (const { maintenanceId, description, dueDate, webLink } of repoMaint) {
        const dateStr = moment(new Date(dueDate).getTime()).fromNow();
        repoTable.push([maintenanceId, dateStr, description, webLink]);
      }
      console.log(repoTable.toString());
      console.log('\n');
    }
  }
  if (email && flags.debug) {
    const emailTable = new Table({
      head: ['maintenanceId', 'due', 'description', 'link'],
      ...tableFormatOptions
    });

    query = `Find UNIQUE deferred_maintenance with closed=false and createdBy = '${email}' as m return m.maintenanceId as maintenanceId, m.shortDescription as description, m.dueDate as dueDate, m.webLink as webLink ORDER BY m.dueDate ASC`;
    const createdMaint = await client.gatherEntities(query);
    if (createdMaint.length) {
      console.log(`${email} created open maintenance items:`)
      for (const { maintenanceId, description, dueDate, webLink } of createdMaint) {
        const dateStr = moment(new Date(dueDate).getTime()).fromNow();
        emailTable.push([maintenanceId, dateStr, description, webLink]);
      }
      console.log(emailTable.toString());
    }
  }
  console.log("OK");
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
      await userMaintenanceReport(client);
  }
})();
