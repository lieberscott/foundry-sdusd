// const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../utils/helper-hardhat-config");
const { DEGREDATION_THRESHOLD, SDNFT_NAME, SDNFT_SYMBOL, INITIAL_PRICE } = require("../../utils/helper-hardhat-config");
const { calculateRedemption, calculateMaxMintable } = require("../utils");

!developmentChains.includes(network.name)
	? describe.skip
	: describe("SDNFT", function () {

    let deployer;
    let adam;
    let bob;
    let cathy;
    let dana;
    let eric;
		let sdnftFromDeployer;
    let sdnftFromAdam;
    let sdnftFromBob;
    let sdnftFromCathy;
    let sdnftFromDana;
    let sdnftContract;
		let mockV3Aggregator;
		const sendValue = "100000000000000000"; // 0.1 ETH with 18 zeros
    const initialAmt = "4000000000000000000"; // 4 ETH with 18 zeros
    const maxMintableValue = "1333333333333333333"; // 1.333... ETH, when there is 4 ETH in the contract and 0 SDUSD minted
    const startingBalances = ethers.BigNumber.from("10000").mul(sendValue);

    const multipleBig = "250";

    const initialAmtBig = ethers.BigNumber.from(initialAmt).mul(multipleBig).toString(); // Should be 1,000 ETH
    const sendValueBig_0 = "200000000000000000000"; // 200 ETH with 18 zeros
    const sendValueBig_1 = "100000000000000000000"; // 100 ETH with 18 zeros
    const sendValueBig_2 = "25000000000000000000"; // 25 ETH with 18 zeros
    const sendValueBig_3 = "8333333333333333333"; // 8.3 ETH with 18 zeros
    const dividedByValue = "1000000000000000000"; // 1 with 18 zeroes

		before(async () => {
			const chai = await import('chai');
      // chai.use(await import("@nomicfoundation/hardhat-chai-matchers"));
			global.expect = chai.expect; // Make `expect` available globally if needed
			global.assert = chai.assert; // Make `assert` available globally if needed
		});



		beforeEach(async () => {
			const accounts = await ethers.getSigners()
			// deployer = accounts[0]
			deployer = (await getNamedAccounts()).deployer;
      adam = accounts[1];
      bob = accounts[2];
      cathy = accounts[3];
      dana = accounts[4];
      eric = accounts[5];

			await deployments.fixture(["all"]);
			sdnftFromDeployer = await ethers.getContract("SDNFT", deployer);
      sdnftFromAdam = await ethers.getContract("SDNFT", adam.address);
      sdnftFromBob = await ethers.getContract("SDNFT", bob.address);
      sdnftFromCathy = await ethers.getContract("SDNFT", cathy.address);
      sdnftFromDana = await ethers.getContract("SDNFT", dana.address);
      sdnftFromEric = await ethers.getContract("SDNFT", eric.address);
      sdnftContract = await ethers.getContract("SDNFT");
			mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
      // console.log("mockV3Aggregator : ", mockV3Aggregator);
		})

		describe("constructor", function () {
			it("deploys SDUSD token address", async () => {
				const response = await sdnftFromDeployer.getSdusdTokenAddress();
        const sdusdAddress = await ethers.getContract("SDUSD", deployer);
				assert.equal(response.toString(), sdusdAddress.address.toString());
			});

      it("sets SDNFT symbol", async () => {
				const response = await sdnftFromDeployer.symbol();
				assert.equal(response.toString(), SDNFT_SYMBOL);
			});

      it("sets SDNFT name", async () => {
				const response = await sdnftFromDeployer.name();
				assert.equal(response.toString(), SDNFT_NAME);
			});

      it("retrieves maxSupply", async () => {
				const response = await sdnftFromDeployer.getMaxSupply();
				assert.equal(response.toString(), "10000");
			});

		})

		describe("buyNft", function () {
			// https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
			// could also do assert.fail
			it("Fails to mint an NFT if there's no ETH sent", async () => {
				await expect(sdnftFromDeployer.buyNft()).to.be.revertedWith("SDNFT__NotEnoughETH");
			})

      it("should reject minting after 10,000 NFTs have been minted", async function () {
        // Simulate minting 10,000 tokens.
        for (let i = 0; i < 10000; i++) {
          // Adjust the mint function call to match your contract's interface.
          await sdnftFromAdam.buyNft({ value: sendValue });
        }
    
        // Now, the 10,001st mint should revert.
        await expect(sdnftFromAdam.buyNft({ value: sendValue })).to.be.revertedWith("SDNFT__SoldOut");
      });

      it("Emits an event upon minting", async () => {
        await expect(sdnftFromAdam.buyNft({ value: sendValue })).to.emit(sdnftFromAdam, "Transfer").withArgs(ethers.constants.AddressZero, adam.address, 0);
			});

      it.only("Retrieves the NFT art", async() => {
        await sdnftFromAdam.buyNft({ value: sendValue });

        const response1 = await sdnftFromAdam.tokenURI(0);
        const response2 = await sdnftFromAdam.tokenURI(0);
        console.log("response : ", response.toString());
        assert.equal(response1.toString(), response2.toString());
      });

    })

  })