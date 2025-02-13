// const { network } = require("hardhat");
// const { developmentChains, networkConfigInfo, VOTING_DELAY, VOTING_PERIOD, VOTING_POWER_THRESHOLD, QUORUM_PERCENTAGE } = require("../utils/helper-hardhat-config");
// const { verify } = require("../utils/verify");
// const { getContractAt } = require("ethers");

// module.exports = async ({ getNamedAccounts, deployments }) => {

//   const { deploy, log, get } = deployments;
//   const { deployer } = await getNamedAccounts();
//   const chainId = network.config.chainId;

//   log("----------------------------------------------------");
//   log("Deploying Algo and waiting for confirmations...");
  
//   const arguments = [];

//   const algoDeployment = await deploy("Algo", {
//     from: deployer,
//     args: arguments,
//     log: true,
//     // gasLimit: 3000000,
//     // we need to wait if on a live network so we can verify properly
//     waitConfirmations: networkConfigInfo[chainId].blockConfirmations || 1,
//   });

//   log(`Algo at ${algoDeployment.address}`);
//   if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
//     await verify(algoDeployment.address, arguments);
//   }

// }

// module.exports.tags = ["all", "mocks", "main"];