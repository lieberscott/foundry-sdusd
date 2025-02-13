const { network } = require("hardhat");
const { developmentChains, networkConfigInfo, MIN_DELAY, ADDRESS_ZERO } = require("../utils/helper-hardhat-config");
const { verify } = require("../utils/verify");
const { getContractAt } = require("ethers");

module.exports = async ({ getNamedAccounts, deployments }) => {

  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  log("----------------------------------------------------");
  log("Deploying Timelock and waiting for confirmations...");

  const arguments = [MIN_DELAY, [], [], deployer]; // minDelay, proposers, executors, admin (optional)

  const timelockDeployment = await deploy("TimeLock", {
    from: deployer,
    args: arguments,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfigInfo[chainId].blockConfirmations || 1,
  });

  log(`TimeLock at ${timelockDeployment.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(timelockDeployment.address, arguments);
  }

}

module.exports.tags = ["all", "mocks", "main"];