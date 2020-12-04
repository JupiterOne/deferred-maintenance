const JupiterOneClient = require("@jupiterone/jupiterone-client-nodejs");


const j1Client = await new JupiterOneClient({
  account: process.env.J1_ACCOUNT,
  accessToken: process.env.J1_API_TOKEN,
  dev: true
  }).init();
