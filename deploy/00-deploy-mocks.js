const { network } = require("hardhat");
const { DECIMALS, INITIAL_PRICE } = require("../utils/helper-hardhat-config");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  // If we are on a local development network, we need to deploy mocks!
  if (chainId == 31337) {
    log("Local network detected! Deploying mock price feed...");

    await deploy("MockV3Aggregator", {
        from: deployer,
        log: true,
        args: [DECIMALS, INITIAL_PRICE],
    })

    log("Mock price feed Deployed!");
    log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    log("You are deploying to a local network, you'll need a local network running to interact");
    log(
        "Please run `yarn hardhat console --network localhost` to interact with the deployed smart contracts!"
    );
    log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  }
}
module.exports.tags = ["all", "mocks", "main"]