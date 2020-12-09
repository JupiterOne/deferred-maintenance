function validateEnv() {
  let valid=true;
  if (!process.env.J1_ACCOUNT) {
    valid=false;
    console.warn("Missing J1_ACCOUNT ENV Var!");
  }
  if (!process.env.J1_API_TOKEN) {
    valid=false;
    console.warn("Missing J1_API_TOKEN ENV Var!");
  }
  if (!valid) {
    process.exit(2);
  }
}

module.exports = { validateEnv };
