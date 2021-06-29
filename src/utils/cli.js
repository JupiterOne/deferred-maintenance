const meow = require('meow');
const meowHelp = require('cli-meow-help');

const flags = {
  clear: {
    type: `boolean`,
    default: true,
    alias: `c`,
    desc: `Clear the console`
  },
  'no-clear': {
    type: `boolean`,
    default: false,
    desc: `Don't clear the console`
  },
  debug: {
    type: `boolean`,
    default: false,
    alias: `d`,
    desc: `Print debug info`
  },
  version: {
    type: `boolean`,
    alias: `v`,
    desc: `Print CLI version`
  },
  dueDate: {
    type: `string`,
    desc: `The due date of the maintenance in the format: MM-DD-YYYY`
  }
};

const commands = {
  help: { desc: `Print help info` },
  open: { desc: `Open a maintenance Finding for one or more CodeRepos` },
  close: { desc: `Close a maintenance Finding for one or more CodeRepos` }
};

const helpText = meowHelp({
  name: `deferred-maintenance`,
  flags,
  commands
});

const options = {
  inferType: true,
  description: false,
  hardRejection: false,
  flags
};

module.exports = meow(helpText, options);
