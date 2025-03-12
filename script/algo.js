const { network, ethers } = require("hardhat");
const { developmentChains, VOTING_DELAY, proposalsFile, FUNC, PROPOSAL_DESCRIPTION, NEW_COLLATERAL_RATIO } = require("../utils/helper-hardhat-config.js");
const fs = require("fs");
const { moveBlocks } = require("../utils/move-blocks.js");


const seeArt = async () => {
  const algo = await ethers.getContract("SDNFT");

  const accounts = await ethers.getSigners();
  const adam = accounts[1];

  const algoFromAdam = await ethers.getContract("SDNFT", adam.address);
  const randNum = Math.floor((Math.random() * 10000));

  const adamNftTx = await algoFromAdam.callStatic.tokenURI(randNum);
  // const adamReceipt = await adamNftTx.wait(1);

  console.log("NFT :\n",adamNftTx);
  // console.log("NFT receipt: ", adamReceipt);

}


seeArt()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })