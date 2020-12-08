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
  }
};

const commands = {
  help: { desc: `Print help info` },
  assign: { desc: `Assign a maintenance Finding to one or more CodeRepos` },
  update: { desc: `Update a maintenance Finding for one or more CodeRepos` }
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
