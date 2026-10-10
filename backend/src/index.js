const app = require("./app");
const config = require("./config");

app.listen(config.port, () => {
  console.log(`psycBridge backend Phase 1 on http://localhost:${config.port}`);
  console.log(`health: http://localhost:${config.port}/api/v1/health`);
});
