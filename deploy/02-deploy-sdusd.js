const { network } = require("hardhat");
const { developmentChains, networkConfigInfo, DEGREDATION_THRESHOLD, COLLATERAL_RATIO, SDUSD_NAME, SDUSD_SYMBOL } = require("../utils/helper-hardhat-config");
const { verify } = require("../utils/verify");
const { getContractAt } = require("ethers");

module.exports = async ({ getNamedAccounts, deployments }) => {

  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;


  let ethUsdPriceFeedAddress;
  if (chainId == 31337) {
    const ethUsdAggregator = await get("MockV3Aggregator");
    ethUsdPriceFeedAddress = ethUsdAggregator.address;
  } else {
    ethUsdPriceFeedAddress = networkConfigInfo[chainId]["ethUsdPriceFeed"]
  }


  const timelock = await get("TimeLock");

  log("----------------------------------------------------");
  log("Deploying SDUSD and waiting for confirmations...");

  const arguments = [ethUsdPriceFeedAddress, COLLATERAL_RATIO, DEGREDATION_THRESHOLD, SDUSD_NAME, SDUSD_SYMBOL];


  const sdusdTokenDeployment = await deploy("SDUSD", {
    from: deployer,
    args: arguments,
    log: true,
    // we need to wait if on a live network so we can verify properly
    waitConfirmations: networkConfigInfo[chainId].blockConfirmations || 1,
  });

  log(`SDUSD at ${sdusdTokenDeployment.address}`);
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    await verify(sdusdTokenDeployment.address, arguments);
  }

  const sdusd = await ethers.getContract("SDUSD");

  // const sdusdToken = await ethers.getContractAt("SDUSD", sdusdTokenDeployment.address);
  // log("Available functions on SDUSD contract:");
  // log(sdusdToken.interface);  // Logs all functions accessible in the SDUSD contract

  // log(`Delegating to ${deployer}`);
  // await delegate(sdusdToken, deployer);
  // log("Delegated!");

  // transfering ownership to the Timelock contract
  const transferTx = await sdusd.transferOwnership(timelock.address);
  await transferTx.wait(1);
}

const delegate = async (sdusdToken, delegatedAccount) => {
  const transactionResponse = await sdusdToken.delegate(delegatedAccount);
  await transactionResponse.wait(1);
  console.log(`Checkpoints: ${await sdusdToken.numCheckpoints(delegatedAccount)}`);
}

module.exports.tags = ["all", "mocks", "main"];