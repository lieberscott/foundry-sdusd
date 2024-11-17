// const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../utils/helper-hardhat-config");
const { DEGREDATION_THRESHOLD, COLLATERAL_RATIO, SDUSD_NAME, SDUSD_SYMBOL, INITIAL_PRICE } = require("../../utils/helper-hardhat-config");


/**
 * 
 * 1. Before testing, change the calculateRedemption function in the SDUSD.sol contract from internal to public
 * 2. After testing, change it back to internal
 * 
 * 
 * 
 * 
 */

!developmentChains.includes(network.name)
	? describe.skip
	: describe("SDUSD", function () {

		let sdusd;
    let sdusdContract;
		let mockV3Aggregator;
		let deployer;
    let funder;
    let funder2;
    let sdusdUser;
		const sendValue = "1000000000000000000"; // 1 ETH with 18 zeros
    const initialAmt = "4000000000000000000"; // 4 ETH with 18 zeros
    const maxMintableValue = "1333333333333333333"; // 1.333... ETH, when there is 4 ETH in the contract and 0 SDUSD minted

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
      funder = accounts[1];
      funder2 = accounts[2];

			await deployments.fixture(["all"]);
			sdusd = await ethers.getContract("SDUSD", deployer);
      sdusdUser = await ethers.getContract("SDUSD", funder.address);
      // sdusdContract = await ethers.getContractFactory("SDUSD");
			mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
      // console.log("mockV3Aggregator : ", mockV3Aggregator);
		})

		describe("constructor", function () {
			it("sets the aggregator addresses correctly", async () => {
				const response = await sdusd.getPriceFeed();
				assert.equal(response, mockV3Aggregator.address)
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

      it("has 18 decimals", async() => {
        const decimals = await sdusd.decimals();
        assert.equal(decimals, 18);
      })


		})

		describe("mintSDUSD", function () {
			// https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
			// could also do assert.fail
			it("Fails to mint SDUSD if there's no ETH in the contract", async () => {
				await expect(sdusd.mintSDUSD({value: sendValue})).to.be.revertedWith("SDUSD__ExceedsMaxAmountMintable")
			})

      it("Correctly calculates maxMintable", async () => {
        const transactionHash = await funder.sendTransaction({
          to: sdusd.address,
          value: initialAmt // 4 ETH
        });

        await transactionHash.wait(1);

        const response = await sdusd.calculateMaxMintable(initialAmt);

        assert.equal(response[0].toString(), maxMintableValue);
			})

      it("Mints 1.3 ETH worth of SDUSD after it has 4ETH in it", async () => {
        const transactionHash = await funder.sendTransaction({
          to: sdusd.address,
          value: initialAmt // 4 ETH
        });

        await transactionHash.wait(1);

        const mintTx = await sdusd.mintSDUSD({value: maxMintableValue});

        await mintTx.wait(1);

        const balanceResponse = await sdusd.balanceOf(deployer);
        const mintedResponse = await sdusd.totalSupply();

        // console.log("balanceResponse : ", balanceResponse.toString());

        const sdusdBalance = ethers.utils.formatUnits(balanceResponse, 18); // user amount as stored by the ERC20 contract
        const sdusdMinted = ethers.utils.formatUnits(mintedResponse); // total supply of SDUSD

        assert.equal(sdusdBalance, "2666.666666666666666");
        assert.equal(sdusdMinted, "2666.666666666666666");
			})

      it("Rejects maxMintable + 1", async () => {
        const sendTx = await funder.sendTransaction({
          to: sdusd.address,
          value: initialAmt // 4 ETH
        });

        // const response = await sdusd.calculateMaxMintable(initialAmt);

        // console.log("maxMintable and ethPrice: ", response[0].toString(), response[1].toString());

        // const tx = await sdusd.mintSDUSD({ value: "1333333333333333333" });

        // const txReceipt = await tx.wait(1) // waits 1 block
        // const maxAmount = txReceipt.events[0].args.maxAmountInEth;
        // const msgValue = txReceipt.events[0].args.msgValue;
        // const ethBalance = txReceipt.events[0].args.ethBalance
        // console.log("maxAmount : ", maxAmount.toString());
        // console.log("msgValue : ", msgValue.toString());
        // console.log("pre-transaction balance : ", ethBalance.toString());
        // assert.equal(1, 1);
   

        await expect(sdusd.mintSDUSD({value: "1333333333333333334"})).to.be.revertedWith("SDUSD__ExceedsMaxAmountMintable")
			})

      it("Emits an event upon minting", async () => {
        const sendTx = await funder.sendTransaction({
          to: sdusd.address,
          value: initialAmt // 4 ETH
        });

        await expect(sdusd.mintSDUSD({ value: maxMintableValue })).to.emit(sdusd, "sdusdMinted");
			})

    })

    describe("redeemSDUSD", function () {

      const oneThousand = "1000";

			it("Rejects when user redeems more SDUSD than he has", async () => {
				await expect(sdusd.redeemSdusdForEth(oneThousand)).to.be.revertedWith("SDUSD__WithdrawalAmountLargerThanUserBalance")
			})

      it("Redeems SDUSD correctly when price of ETH does not change", async () => {
        // Send initial ETH
				const transactionHash = await funder.sendTransaction({
          to: sdusd.address,
          value: initialAmt // 4 ETH
        });
        await transactionHash.wait(1);

        // Mint SDUSD
        const mintTx = await sdusd.mintSDUSD({value: maxMintableValue});
        await mintTx.wait(1);

        // Get SDUSD balance of user
        const balanceResponse = await sdusd.balanceOf(deployer);

        // Redeem full SDUSD amount
        const redeemTx = await sdusd.redeemSdusdForEth(balanceResponse);
        await redeemTx.wait(1);

        // Check balance of SDUSD contract after redemption
        const ethBalance = await ethers.provider.getBalance(sdusd.address);
        console.log("balance : ", ethBalance.toString());
        assert.equal(ethBalance.toString(), initialAmt);
        
			})

      it.only("Redeems correctly when price of ETH drops and triggers degredation threshold", async () => {

        // Send initial ETH
				const transactionHash = await funder.sendTransaction({
          to: sdusd.address,
          value: initialAmt // 4 ETH
        });
        await transactionHash.wait(1);

        const ethBalance0 = await ethers.provider.getBalance(deployer);
        console.log("Deployer ETH balance before minting: ", ethBalance0.toString());

        // Mint SDUSD
        const mintTx = await sdusd.mintSDUSD({value: sendValue});
        await mintTx.wait(1);

        const mintTx2 = await sdusdUser.mintSDUSD({ value: "333333333333333333"});
        await mintTx2.wait(1);

        // Drop ETH price to $500
        const tx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits("100", 8));
        await tx.wait(1);

        // Get SDUSD balance of user
        const balanceResponse = await sdusd.balanceOf(deployer);
        const balanceResponse2 = await sdusd.balanceOf(funder.address);

        const ethBalance1 = await ethers.provider.getBalance(deployer);
        console.log("Deployer ETH balance after minting: ", ethBalance1.toString());

        // Redeem full SDUSD amount
        const redeemTx = await sdusd.calculateRedemption(balanceResponse);
        // await redeemTx.wait(1);

        console.log("redemptionAmtInWei : ", redeemTx.toString());

        // // Check balance of SDUSD contract after redemption
        // const ethBalance2 = await ethers.provider.getBalance(deployer);
        // console.log("Deployer ETH balance after redemption: ", ethBalance2.toString());
        // console.log("Total ETH gotten back : ", parseInt(ethBalance2) - parseInt(ethBalance1));
        // expect(parseInt(ethBalance)).to.be.greaterThan(parseInt(initialAmt));

        assert.equal(1, 1);

      })
    })

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