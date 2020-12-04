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
const { execSync } = require("child_process");

const input = cli.input;
const flags = cli.flags;
const { clear, debug } = flags;

(async () => {
  init({ clear });
  switch(true) {
    case input.includes("help"):
      cli.showHelp(0);
      process.exit(0);
      break;
    case input.includes("assign"):
      console.log("assign called");
      require("subprocess").command("ls -l | less");
      validateEnv();
      console.log("assign OK");
      break;
    case input.includes("update"):
      console.log("update called");
      validateEnv();
      break;
    default:
      console.error("unrecognized command");
      cli.showHelp(1);
      process.exit(2);
  }
})();
