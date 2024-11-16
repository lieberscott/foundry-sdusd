// const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../utils/helper-hardhat-config");
const { DEGREDATION_THRESHOLD, COLLATERAL_RATIO, SDUSD_NAME, SDUSD_SYMBOL } = require("../../utils/helper-hardhat-config");


!developmentChains.includes(network.name)
	? describe.skip
	: describe("SDUSD", function () {

		let sdusd;
		let mockV3Aggregator;
		let deployer;
		const sendValue = "1000000000000000000"; // 1 ETH with 18 zeros

		before(async () => {
			const chai = await import('chai');
      // chai.use(await import("@nomicfoundation/hardhat-chai-matchers"));
			global.expect = chai.expect; // Make `expect` available globally if needed
			global.assert = chai.assert; // Make `assert` available globally if needed
		});



		beforeEach(async () => {
			// const accounts = await ethers.getSigners()
			// deployer = accounts[0]
			deployer = (await getNamedAccounts()).deployer;
			await deployments.fixture(["all"]);
			sdusd = await ethers.getContract("SDUSD", deployer);
			mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
		})

		describe("constructor", function () {
			it("sets the aggregator addresses correctly", async () => {
				const response = await sdusd.getPriceFeed();
				assert.equal(response, mockV3Aggregator.target)
			})

			it("sets the degredationThreshold  correctly", async () => {
				const response = await sdusd.getDegredationThreshold();
				assert.equal(response, DEGREDATION_THRESHOLD);
			})

			it("sets the collateralRatio correctly", async () => {
				const response = await sdusd.getEthCollateralRatio();
				assert.equal(response, COLLATERAL_RATIO);
			})

      it("initializes the token with the correct name and symbol ", async () => {
        const name = (await sdusd.name()).toString()
        assert.equal(name, SDUSD_NAME)

        const symbol = (await sdusd.symbol()).toString()
        assert.equal(symbol, SDUSD_SYMBOL)
    })


		})

		// describe("mintSDUSD", function () {
		// 	// https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
		// 	// could also do assert.fail
		// 	it("Fails to mint SDUSD if there's no ETH in the contract", async () => {
		// 		await expect(sdusd.mintSDUSD({value: sendValue})).to.be.revertedWith("SDUSD__ExceedsMaxAmountMintable")
		// 	})
    // })

		// 	// we could be even more precise here by making sure exactly $50 works
		// 	// but this is good enough for now
		// 	it("Updates the amount funded data structure", async () => {
		// 		await sdusd.fund({ value: sendValue })
		// 		const response = await sdusd.getAddressToAmountFunded(
		// 			deployer
		// 		)
		// 		assert.equal(response.toString(), sendValue.toString())
		// 	})

		// 	it("Adds funder to array of funders", async () => {
		// 		await sdusd.fund({ value: sendValue })
		// 		const response = await sdusd.getFunder(0)
		// 		assert.equal(response, deployer)
		// 	})
		// })
    //       describe("withdraw", function () {
    //           beforeEach(async () => {
    //               await sdusd.fund({ value: sendValue })
    //           })
    //           it("withdraws ETH from a single funder", async () => {
    //               // Arrange
    //               const startingFundMeBalance =
    //                   await sdusd.provider.getBalance(sdusd.address)
    //               const startingDeployerBalance =
    //                   await sdusd.provider.getBalance(deployer)

    //               // Act
    //               const transactionResponse = await sdusd.withdraw()
    //               const transactionReceipt = await transactionResponse.wait()
    //               const { gasUsed, effectiveGasPrice } = transactionReceipt
    //               const gasCost = gasUsed.mul(effectiveGasPrice)

    //               const endingFundMeBalance = await sdusd.provider.getBalance(
    //                   sdusd.address
    //               )
    //               const endingDeployerBalance =
    //                   await sdusd.provider.getBalance(deployer)

    //               // Assert
    //               // Maybe clean up to understand the testing
    //               assert.equal(endingFundMeBalance, 0)
    //               assert.equal(
    //                   startingFundMeBalance
    //                       .add(startingDeployerBalance)
    //                       .toString(),
    //                   endingDeployerBalance.add(gasCost).toString()
    //               )
    //           })
    //           // this test is overloaded. Ideally we'd split it into multiple tests
    //           // but for simplicity we left it as one
    //           it("is allows us to withdraw with multiple funders", async () => {
    //               // Arrange
    //               const accounts = await ethers.getSigners()
    //               for (i = 1; i < 6; i++) {
    //                   const fundMeConnectedContract = await sdusd.connect(
    //                       accounts[i]
    //                   )
    //                   await fundMeConnectedContract.fund({ value: sendValue })
    //               }
    //               const startingFundMeBalance =
    //                   await sdusd.provider.getBalance(sdusd.address)
    //               const startingDeployerBalance =
    //                   await sdusd.provider.getBalance(deployer)

    //               // Act
    //               const transactionResponse = await sdusd.cheaperWithdraw()
    //               // Let's comapre gas costs :)
    //               // const transactionResponse = await sdusd.withdraw()
    //               const transactionReceipt = await transactionResponse.wait()
    //               const { gasUsed, effectiveGasPrice } = transactionReceipt
    //               const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
    //               console.log(`GasCost: ${withdrawGasCost}`)
    //               console.log(`GasUsed: ${gasUsed}`)
    //               console.log(`GasPrice: ${effectiveGasPrice}`)
    //               const endingFundMeBalance = await sdusd.provider.getBalance(
    //                   sdusd.address
    //               )
    //               const endingDeployerBalance =
    //                   await sdusd.provider.getBalance(deployer)
    //               // Assert
    //               assert.equal(
    //                   startingFundMeBalance
    //                       .add(startingDeployerBalance)
    //                       .toString(),
    //                   endingDeployerBalance.add(withdrawGasCost).toString()
    //               )
    //               // Make a getter for storage variables
    //               await expect(sdusd.getFunder(0)).to.be.reverted

    //               for (i = 1; i < 6; i++) {
    //                   assert.equal(
    //                       await sdusd.getAddressToAmountFunded(
    //                           accounts[i].address
    //                       ),
    //                       0
    //                   )
    //               }
    //           })
    //           it("Only allows the owner to withdraw", async function () {
    //               const accounts = await ethers.getSigners()
    //               const fundMeConnectedContract = await fundMe.connect(
    //                   accounts[1]
    //               )
    //               await expect(
    //                   fundMeConnectedContract.withdraw()
    //               ).to.be.revertedWith("FundMe__NotOwner")
    //           })
    //       })
      })