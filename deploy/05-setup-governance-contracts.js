const { network, ethers } = require("hardhat");
const { developmentChains, networkConfigInfo, ADDRESS_ZERO } = require("../utils/helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {

  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  log("----------------------------------------------------");
  log("Setting up governor roles (decentralizing DAO)...");

  const timelock = await ethers.getContract("TimeLock", deployer);
  const sdusdao = await ethers.getContract("SDUSDAO", deployer);

  // console.log("ABI of TimelockController:", timelock.interface.format());


  // log("Setting up roles...");

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  // const adminRole = await timelock.TIMELOCK_ADMIN_ROLE();

  const proposerTx = await timelock.grantRole(proposerRole, sdusdao.address);
  await proposerTx.wait(1);
  const executorTx = await timelock.grantRole(executorRole, ADDRESS_ZERO);
  await executorTx.wait(1);
  // const revokeTx = await timelock.revokeRole(adminRole, deployer);
  // await revokeTx.wait(1);

}

module.exports.tags = ["all", "mocks", "main"];