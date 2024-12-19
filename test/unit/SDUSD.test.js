// const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../utils/helper-hardhat-config");
const { DEGREDATION_THRESHOLD, COLLATERAL_RATIO, SDUSD_NAME, SDUSD_SYMBOL, INITIAL_PRICE } = require("../../utils/helper-hardhat-config");
const { calculateRedemption, calculateMaxMintable } = require("../utils");

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

    let deployer;
    let adam;
    let bob;
    let cathy;
    let dana;
    let eric;
		let sdusdFromDeployer;
    let sdusdFromAdam;
    let sdusdFromBob;
    let sdusdFromCathy;
    let sdusdFromDana;
    let sdusdContract;
		let mockV3Aggregator;
		const sendValue = "1000000000000000000"; // 1 ETH with 18 zeros
    const initialAmt = "4000000000000000000"; // 4 ETH with 18 zeros
    const maxMintableValue = "1333333333333333333"; // 1.333... ETH, when there is 4 ETH in the contract and 0 SDUSD minted

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
			sdusdFromDeployer = await ethers.getContract("SDUSD", deployer);
      sdusdFromAdam = await ethers.getContract("SDUSD", adam.address);
      sdusdFromBob = await ethers.getContract("SDUSD", bob.address);
      sdusdFromCathy = await ethers.getContract("SDUSD", cathy.address);
      sdusdFromDana = await ethers.getContract("SDUSD", dana.address);
      sdusdFromEric = await ethers.getContract("SDUSD", eric.address);
      // sdusdContract = await ethers.getContractFactory("SDUSD");
			mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
      // console.log("mockV3Aggregator : ", mockV3Aggregator);
		})

		describe("constructor", function () {
			it("sets the aggregator addresses correctly", async () => {
				const response = await sdusdFromDeployer.getPriceFeed();
				assert.equal(response, mockV3Aggregator.address)
			})

			it("sets the degredationThreshold  correctly", async () => {
				const response = await sdusdFromDeployer.getDegredationThreshold();
				assert.equal(response, DEGREDATION_THRESHOLD);
			})

			it("sets the collateralRatio correctly", async () => {
				const response = await sdusdFromDeployer.getEthCollateralRatio();
				assert.equal(response, COLLATERAL_RATIO);
			})

      it("initializes the token with the correct name and symbol ", async () => {
        const name = (await sdusdFromDeployer.name()).toString()
        assert.equal(name, SDUSD_NAME)

        const symbol = (await sdusdFromDeployer.symbol()).toString()
        assert.equal(symbol, SDUSD_SYMBOL)
      })

      it("has 18 decimals", async() => {
        const decimals = await sdusdFromDeployer.decimals();
        assert.equal(decimals, 18);
      })


		})

		describe("mintSDUSD", function () {
			// https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
			// could also do assert.fail
			it("Fails to mint SDUSD if there's no ETH in the contract", async () => {
				await expect(sdusdFromDeployer.mintSDUSD({value: sendValue})).to.be.revertedWith("SDUSD__ExceedsMaxAmountMintable")
			})

      it("Correctly calculates maxMintable", async () => {
        const transactionHash = await adam.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });

        await transactionHash.wait(1);

        const response = await sdusdFromDeployer.calculateMaxMintable(initialAmt);

        assert.equal(response[0].toString(), maxMintableValue);
			})

      it("Mints 1.3 ETH worth of SDUSD after it has 4ETH in it", async () => {
        const transactionHash = await adam.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });

        await transactionHash.wait(1);

        const mintTx = await sdusdFromDeployer.mintSDUSD({value: maxMintableValue});

        await mintTx.wait(1);

        const balanceResponse = await sdusdFromDeployer.balanceOf(deployer);
        const mintedResponse = await sdusdFromDeployer.totalSupply();

        // console.log("balanceResponse : ", balanceResponse.toString());

        const sdusdBalance = ethers.utils.formatUnits(balanceResponse, 18); // user amount as stored by the ERC20 contract
        const sdusdMinted = ethers.utils.formatUnits(mintedResponse); // total supply of SDUSD

        assert.equal(sdusdBalance, "2666.666666666666666");
        assert.equal(sdusdMinted, "2666.666666666666666");
			})

      it("Rejects maxMintable + 1", async () => {
        const sendTx = await adam.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });

        await expect(sdusdFromDeployer.mintSDUSD({value: ethers.BigNumber.from(maxMintableValue).add("1")})).to.be.revertedWith("SDUSD__ExceedsMaxAmountMintable")
			})

      it("Emits an event upon minting", async () => {
        const sendTx = await adam.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });

        await expect(sdusdFromDeployer.mintSDUSD({ value: maxMintableValue })).to.emit(sdusdFromDeployer, "sdusdMinted");
			})

    })

    describe("redeemSDUSD", function () {

      const oneThousand = "1000";

			it("Rejects when user redeems more SDUSD than he has", async () => {
				await expect(sdusdFromDeployer.redeemSdusdForEth(oneThousand)).to.be.revertedWith("SDUSD__WithdrawalAmountLargerThanUserBalance")
			})

      it("Redeems SDUSD correctly when price of ETH does not change", async () => {
        // Send initial ETH
				const transactionHash = await adam.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });
        await transactionHash.wait(1);

        // Mint SDUSD
        const mintTx = await sdusdFromDeployer.mintSDUSD({value: maxMintableValue});
        await mintTx.wait(1);

        // Get SDUSD balance of user
        const balanceResponse = await sdusdFromDeployer.balanceOf(deployer);

        // Redeem full SDUSD amount
        const redeemTx = await sdusdFromDeployer.redeemSdusdForEth(balanceResponse);
        await redeemTx.wait(1);

        // Check balance of SDUSD contract after redemption
        const ethBalance = await ethers.provider.getBalance(sdusdFromDeployer.address);
        assert.equal(ethBalance.toString(), initialAmt);
        
			})

      it("Redeems correctly when one user has all the SDUSD and the price of ETH does not change", async () => {

        // degredationThreshold
        // supplyOfSdusd
        // amountOfSdusdBeingRedeemed
        // ethPrice
        // balanceOfEth

        // Step 0: Get user beginning Eth balance
        const ethBalanceStart = (await ethers.provider.getBalance(adam.address)).toString();

        // Step 1: Seed contract with ETH
				const transactionHash = await bob.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });
        await transactionHash.wait(1);

        // Step 2: Mint SDUSD to one person
        const mintTx = await sdusdFromAdam.mintSDUSD({value: sendValue});
        const mintTxReceipt = await mintTx.wait(1);

        const gasUsed1 = mintTxReceipt.gasUsed;
        const effectiveGasPrice1 = mintTxReceipt.effectiveGasPrice;
        const gasCost1 = gasUsed1.mul(effectiveGasPrice1);

        // Step 3: Get supply of SDUSD
        const supply = (await sdusdFromDeployer.totalSupply()).toString();

        // Step 4: Get the user supply of SDUSD
        const userSdusdSupplyTx = await sdusdFromAdam.balanceOf(adam.address);
        const userSdusdSupply = userSdusdSupplyTx.toString();

        // Step 5: Redeem SDUSD
        const redeemTx = await sdusdFromAdam.redeemSdusdForEth(userSdusdSupply);
        const redeemTxReceipt = await redeemTx.wait(1);
        const amount = redeemTx.toString();

        const gasUsed2 = redeemTxReceipt.gasUsed;
        const effectiveGasPrice2 = redeemTxReceipt.effectiveGasPrice;
        const gasCost2 = gasUsed2.mul(effectiveGasPrice2);

        // Step 6: Get balance of ETH
        const ethBalanceEnd = await ethers.provider.getBalance(adam.address);
        
        assert.equal(ethBalanceStart.toString(), ethBalanceEnd.add(gasCost1).add(gasCost2).toString());

      })

      it("Redeems correctly when one user has all the SDUSD and the price of ETH drops 75%", async () => {

        // Step 0: Get user beginning Eth balance
        const ethBalanceStart = await ethers.provider.getBalance(adam.address);

        // Step 1: Seed contract with ETH
				const transactionHash = await bob.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });
        await transactionHash.wait(1);

        // Step 2: Mint SDUSD to one person
        const mintTx = await sdusdFromAdam.mintSDUSD({value: sendValue});
        const mintTxReceipt = await mintTx.wait(1);

        const gasUsed1 = mintTxReceipt.gasUsed;
        const effectiveGasPrice1 = mintTxReceipt.effectiveGasPrice;
        const gasCost1 = gasUsed1.mul(effectiveGasPrice1);

        // Step 3: Drop ETH price to $500
        const tx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits("100", 8));
        await tx.wait(1);

        // Step 4: Get supply of SDUSD
        const supply = (await sdusdFromDeployer.totalSupply()).toString();

        // Step 4A: Get the user supply of SDUSD
        const userSdusdSupplyTx = await sdusdFromAdam.balanceOf(adam.address);
        const userSdusdSupply = userSdusdSupplyTx.toString();

        // Step 5: Redeem SDUSD
        const redeemTx = await sdusdFromAdam.redeemSdusdForEth(userSdusdSupply);
        const redeemTxReceipt = await redeemTx.wait(1);

        const gasUsed2 = redeemTxReceipt.gasUsed;
        const effectiveGasPrice2 = redeemTxReceipt.effectiveGasPrice;
        const gasCost2 = gasUsed2.mul(effectiveGasPrice2);

        // Step 6: Get balance of ETH
        const ethBalanceEnd = await ethers.provider.getBalance(adam.address);
        
        assert.equal(ethBalanceStart.add(initialAmt).toString(), ethBalanceEnd.add(gasCost1).add(gasCost2).toString());

      });


      it("Redeems correctly when one user has all the SDUSD and the price of ETH 4x's", async () => {

        const updatedEthPrice = 8000;

        // Step 0: Get user beginning Eth balance
        const ethBalanceStart = await ethers.provider.getBalance(adam.address);

        // Step 1: Seed contract with ETH
				const transactionHash = await bob.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt // 4 ETH
        });
        await transactionHash.wait(1);

        // Step 2: Mint SDUSD to one person
        const mintTx = await sdusdFromAdam.mintSDUSD({value: sendValue});
        const mintTxReceipt = await mintTx.wait(1);

        const gasUsed1 = mintTxReceipt.gasUsed;
        const effectiveGasPrice1 = mintTxReceipt.effectiveGasPrice;
        const gasCost1 = gasUsed1.mul(effectiveGasPrice1);

        // Step 3: Drop ETH price to $500
        const tx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(updatedEthPrice.toString(), 8));
        await tx.wait(1);

        // Step 4: Get supply of SDUSD
        const supply = await sdusdFromDeployer.totalSupply();

        // Step 4A: Get the user supply of SDUSD
        const userSdusdSupplyTx = await sdusdFromAdam.balanceOf(adam.address);
        const userSdusdSupply = userSdusdSupplyTx.toString();

        // Step 5: Redeem SDUSD
        const redeemTx = await sdusdFromAdam.redeemSdusdForEth(userSdusdSupply);
        const redeemTxReceipt = await redeemTx.wait(1);

        const gasUsed2 = redeemTxReceipt.gasUsed;
        const effectiveGasPrice2 = redeemTxReceipt.effectiveGasPrice;
        const gasCost2 = gasUsed2.mul(effectiveGasPrice2);

        // Step 5A: Get redemption from utils
        const result = calculateRedemption(DEGREDATION_THRESHOLD, supply, userSdusdSupply, updatedEthPrice, parseInt(initialAmt) + parseInt(sendValue));
        const localRedemption = ethers.BigNumber.from(result.toString());
        
        // Step 6: Get user ending balance of ETH
        const ethBalanceEnd = await ethers.provider.getBalance(adam.address);
        
        assert.equal(ethBalanceStart.sub(sendValue).add(localRedemption).toString(), ethBalanceEnd.add(gasCost1).add(gasCost2).toString());

      })

      it("Mints correctly for four minters", async () => {

        // Step 1: Seed contract with ETH
				const transactionHash = await eric.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmtBig // 1,000 ETH
        });
        await transactionHash.wait(1);

        // Step 2: Have each person mint their respective amounts
        const mintTx0 = await sdusdFromAdam.mintSDUSD({ value: sendValueBig_0});
        await mintTx0.wait(1);
        const mintTx1 = await sdusdFromBob.mintSDUSD({ value: sendValueBig_1});
        await mintTx1.wait(1);
        const mintTx2 = await sdusdFromCathy.mintSDUSD({ value: sendValueBig_2});
        await mintTx2.wait(1);
        const mintTx3 = await sdusdFromDana.mintSDUSD({ value: sendValueBig_3});
        await mintTx3.wait(1);


        // Step 3: Get SDUSD balance of each user
        const balanceResponse0 = await sdusdFromDeployer.balanceOf(adam.address);
        const balanceResponse1 = await sdusdFromDeployer.balanceOf(bob.address);
        const balanceResponse2 = await sdusdFromDeployer.balanceOf(cathy.address);
        const balanceResponse3 = await sdusdFromDeployer.balanceOf(dana.address);

        const balance0 = balanceResponse0.div(dividedByValue);
        const balance1 = balanceResponse1.div(dividedByValue);
        const balance2 = balanceResponse2.div(dividedByValue);
        const balance3 = balanceResponse3.div(dividedByValue);

        // Step 4: Get comparable values for each user
        const compare0 = (parseInt(sendValueBig_0) / 1e18) * (parseInt(INITIAL_PRICE) / 1e8);
        const compare1 = (parseInt(sendValueBig_1) / 1e18) * (parseInt(INITIAL_PRICE) / 1e8);
        const compare2 = (parseInt(sendValueBig_2) / 1e18) * (parseInt(INITIAL_PRICE) / 1e8);
        const compare3 = parseInt((parseInt(sendValueBig_3) / 1e18) * (parseInt(INITIAL_PRICE) / 1e8)); // double parseInt because this number would have decimals because it's 8.3 ETH worth (all the rest are whole numbers of ETH)

        // Step 4: Check their balance against what it should be
        assert.equal(balance0.toString(), compare0.toString());
        assert.equal(balance1.toString(), compare1.toString());
        assert.equal(balance2.toString(), compare2.toString());
        assert.equal(balance3.toString(), compare3.toString());

        // Step 5: Check that it rejects any additional minting (between the four minters, it has minted the maxAmount)
        await expect(sdusdFromDeployer.mintSDUSD({value: "1"})).to.be.revertedWith("SDUSD__ExceedsMaxAmountMintable");
      })

      it.only("Correctly calculates maxMintable with multiple minters", async () => {
        // Step 1: Seed contract with ETH
				const fundContractTx = await eric.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmtBig.toString() // 1,000 ETH
        });
        await fundContractTx.wait(1);

        // Step 2: Get maxMintable amount from contract and then mint that amount
        const ethBalOfSdusd = await ethers.provider.getBalance(sdusdFromDeployer.address);
        const maxMintable = await sdusdFromDeployer.calculateMaxMintable(ethBalOfSdusd.toString());
        
        const mintSdusdTx = await sdusdFromAdam.mintSDUSD({ value: maxMintable[0].toString()});
        await mintSdusdTx.wait(1);

        // Step 3: Get new maxMintable amount (should be 0)
        const ethBalanceOfSdusdAfterMint = await ethers.provider.getBalance(sdusdFromDeployer.address);
        const maxMintable2 = await sdusdFromDeployer.calculateMaxMintable(ethBalanceOfSdusdAfterMint.toString());

        assert.equal(maxMintable2[0].toString(), "0");
        await expect(sdusdFromBob.mintSDUSD({value: "1"})).to.be.revertedWith("SDUSD__ExceedsMaxAmountMintable");

      })
    })

		// 	// we could be even more precise here by making sure exactly $50 works
		// 	// but this is good enough for now
		// 	it("Updates the amount funded data structure", async () => {
		// 		await sdusdFromDeployer.fund({ value: sendValue })
		// 		const response = await sdusdFromDeployer.getAddressToAmountFunded(
		// 			deployer
		// 		)
		// 		assert.equal(response.toString(), sendValue.toString())
		// 	})

		// 	it("Adds funder to array of funders", async () => {
		// 		await sdusdFromDeployer.fund({ value: sendValue })
		// 		const response = await sdusdFromDeployer.getFunder(0)
		// 		assert.equal(response, deployer)
		// 	})
		// })
    //       describe("withdraw", function () {
    //           beforeEach(async () => {
    //               await sdusdFromDeployer.fund({ value: sendValue })
    //           })
    //           it("withdraws ETH from a single funder", async () => {
    //               // Arrange
    //               const startingFundMeBalance =
    //                   await sdusdFromDeployer.provider.getBalance(sdusdFromDeployer.address)
    //               const startingDeployerBalance =
    //                   await sdusdFromDeployer.provider.getBalance(deployer)

    //               // Act
    //               const transactionResponse = await sdusdFromDeployer.withdraw()
    //               const transactionReceipt = await transactionResponse.wait()
    //               const { gasUsed, effectiveGasPrice } = transactionReceipt
    //               const gasCost = gasUsed.mul(effectiveGasPrice)

    //               const endingFundMeBalance = await sdusdFromDeployer.provider.getBalance(
    //                   sdusdFromDeployer.address
    //               )
    //               const endingDeployerBalance =
    //                   await sdusdFromDeployer.provider.getBalance(deployer)

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
    //                   const fundMeConnectedContract = await sdusdFromDeployer.connect(
    //                       accounts[i]
    //                   )
    //                   await fundMeConnectedContract.fund({ value: sendValue })
    //               }
    //               const startingFundMeBalance =
    //                   await sdusdFromDeployer.provider.getBalance(sdusdFromDeployer.address)
    //               const startingDeployerBalance =
    //                   await sdusdFromDeployer.provider.getBalance(deployer)

    //               // Act
    //               const transactionResponse = await sdusdFromDeployer.cheaperWithdraw()
    //               // Let's comapre gas costs :)
    //               // const transactionResponse = await sdusdFromDeployer.withdraw()
    //               const transactionReceipt = await transactionResponse.wait()
    //               const { gasUsed, effectiveGasPrice } = transactionReceipt
    //               const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
    //               console.log(`GasCost: ${withdrawGasCost}`)
    //               console.log(`GasUsed: ${gasUsed}`)
    //               console.log(`GasPrice: ${effectiveGasPrice}`)
    //               const endingFundMeBalance = await sdusdFromDeployer.provider.getBalance(
    //                   sdusdFromDeployer.address
    //               )
    //               const endingDeployerBalance =
    //                   await sdusdFromDeployer.provider.getBalance(deployer)
    //               // Assert
    //               assert.equal(
    //                   startingFundMeBalance
    //                       .add(startingDeployerBalance)
    //                       .toString(),
    //                   endingDeployerBalance.add(withdrawGasCost).toString()
    //               )
    //               // Make a getter for storage variables
    //               await expect(sdusdFromDeployer.getFunder(0)).to.be.reverted

    //               for (i = 1; i < 6; i++) {
    //                   assert.equal(
    //                       await sdusdFromDeployer.getAddressToAmountFunded(
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