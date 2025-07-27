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


/**
 * 
 * it("Correctly calculates maxMintable when the price of Eth changes")
 * it("Correctly redeems for multiple users when the price of Eth changes")
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
    const smallInitialAmt = "100000000000000000"; // 0.1 ETH with 17 trailing zeros (18 total decimal places)
    const smallMintAmt = "10000000000000000"; // 0.01 ETH with 16 trailing zeros (18 total decimal places)
    const smallRedeemAmt = "5000000000000000000"; // $5 SDUSD with 18 trailing zeros (18 total decimal places)
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
			const accounts = await ethers.getSigners();
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

      it("Correctly calculates maxMintable with no ETH in it", async () => {
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
			});

      it("Mints correctly for four minters when the price of ETh doesn't change", async () => {

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

      it("Correctly calculates maxMintable with multiple minters when the price of ETH doesn't change", async () => {
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

      it("Correctly calculates maxMintable with supply > 0 and the price of ETH drops 75%", async() => {

        // We're using 4x as many ETH to start
        // That way, when the price drops 75%, from $2,000 to $500, 0.333 ETH is still available as maxMintable

        // Step 1: Seed contract with 16 ETH
				const transactionHash = await bob.sendTransaction({
          to: sdusdFromDeployer.address,
          value: ethers.BigNumber.from(initialAmt).mul("4").toString() // 16 ETH
        });
        await transactionHash.wait(1);

        // Step 2: Mint 0.25 ETH worth ($500)
        const mintTx = await sdusdFromAdam.mintSDUSD({value: sendValue });
        await mintTx.wait(1);

        // Step 3: Drop ETH price 75%
        const tx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits("500", 8));
        await tx.wait(1);

        // Step 4: Get maxMintable
        const ethBalance = ethers.BigNumber.from(initialAmt).mul("4").add(sendValue).toString();
        
        const maxMintable = await sdusdFromDeployer.calculateMaxMintable(ethBalance);
        assert.equal(maxMintable[0].toString(), ethers.BigNumber.from(maxMintableValue).sub(sendValue).toString());
        
      });

      it("Sets maxMintable to 0 when it's below 0 (doesn't throw an error for the uint256, which can't be negative)", async() => {

        // Step 1: Seed contract with 4 ETH
				const transactionHash = await bob.sendTransaction({
          to: sdusdFromDeployer.address,
          value: initialAmt
        });
        await transactionHash.wait(1);

        // Step 2: Mint maxMintable (1.3333 ETH)
        const mintTx = await sdusdFromAdam.mintSDUSD({value: maxMintableValue });
        await mintTx.wait(1);

        // Step 3: Drop ETH price 95%
        const tx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits("100", 8));
        await tx.wait(1);

        // Step 4: Get maxMintable
        const ethBalance = ethers.BigNumber.from(initialAmt).add(sendValue).toString();
        
        const maxMintable = await sdusdFromDeployer.calculateMaxMintable(ethBalance);
        assert.equal(maxMintable[0].toString(), "0");
        
      });

    })

    describe("redeemSDUSD", function () {

      const oneThousand = "1000";

			it("Rejects when user redeems more SDUSD than he has", async () => {
				await expect(sdusdFromDeployer.redeemSdusdForEth(oneThousand)).to.be.revertedWith("SDUSD__WithdrawalAmountLargerThanUserBalance")
			});

      it("Redeems with only small amounts minted and user redeems only a portion of his SDUSD", async () => {
        // Send initial ETH
				const transactionHash = await adam.sendTransaction({
          to: sdusdFromDeployer.address,
          value: smallInitialAmt // 0.1 ETH
        });
        await transactionHash.wait(1);

        const ethBalanceStart = (await ethers.provider.getBalance(bob.address));

        // Mint 0.01 SDUSD
        const mintTx = await sdusdFromBob.mintSDUSD({value: smallMintAmt});
        const mintTxReceipt = await mintTx.wait(1);

        // Redeem 0.005 SDUSD
        const redeemTx = await sdusdFromBob.redeemSdusdForEth(smallRedeemAmt);
        const redeemTxReceipt = await redeemTx.wait(1);

        const gasUsed1 = mintTxReceipt.gasUsed;
        const effectiveGasPrice1 = mintTxReceipt.effectiveGasPrice;
        const gasCost1 = gasUsed1.mul(effectiveGasPrice1);

        const gasUsed2 = redeemTxReceipt.gasUsed;
        const effectiveGasPrice2 = redeemTxReceipt.effectiveGasPrice;
        const gasCost2 = gasUsed2.mul(effectiveGasPrice2);

        // Step 6: Get balance of ETH
        const ethBalanceEnd = await ethers.provider.getBalance(bob.address);

        const smallMintAmtBigNum = ethers.BigNumber.from(smallMintAmt); // 0.01 ETH, or $20 SDUSD
        const smallRedeemAmtInEth = smallMintAmtBigNum.div(4).toString(); // 0.0025 ETH, or $5 SDUSD
        
        // User spent 1 ETH, then is receiving back 4 ETH, so should end with 10,003
        assert.equal(ethBalanceStart.sub(smallMintAmt).add(smallRedeemAmtInEth).toString(), ethBalanceEnd.add(gasCost1).add(gasCost2).toString());

        // assert.equal(1, 1);
      });

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
        const tx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits("500", 8));
        await tx.wait(1);

        // Step 4: Get supply of SDUSD
        const totalSupply = (await sdusdFromDeployer.totalSupply()).toString();
        
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
        
        // User spent 1 ETH, then is receiving back 4 ETH, so should end with 10,003
        assert.equal(ethBalanceStart.sub(sendValue).add(initialAmt).toString(), ethBalanceEnd.add(gasCost1).add(gasCost2).toString());

      });

      it("Redeems correctly when one user has all the SDUSD and the price of ETH drops 95%", async () => {

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

        // Step 3: Drop ETH price to $100
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
        
        // User spent 1 ETH, then will get back 5 ETH (entire balance of contract), so should end up with 10,004
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

        // Step 3: Raise ETH price to $8000
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

      });

      it("Correctly redeems for multiple users all above degredationThreshold as the price of ETH changes", async () => {

        // Minting ETH prices for each person
        const adamPrice = "2000";
        const bobPrice = "3000";
        const cathyPrice = "1000";
        const danaPrice = "500";

        // multiples of 1 ETH
        const adamMul = "20";
        const bobMul = "1";
        const cathyMul = "2";
        const danaMul = "10";

        // Step 1: Seed contract with 1000 ETH
				const transactionHash = await eric.sendTransaction({
          to: sdusdFromDeployer.address,
          value: ethers.BigNumber.from(initialAmtBig).toString() // 1000 ETH
        });
        await transactionHash.wait(1);

        // Step 2: Mint ETH for each user, changing the ETH price in between
        const adamMintTx = await sdusdFromAdam.mintSDUSD({ value: ethers.BigNumber.from(sendValue).mul(adamMul) }); // 20 ETH ($40,000)
        const adamMintTxReceipt = await adamMintTx.wait(1);
        const adamMintGas = adamMintTxReceipt.gasUsed;
        const adamMintGasPrice = adamMintTxReceipt.effectiveGasPrice;
        const adamMintGasCost = adamMintGas.mul(adamMintGasPrice);

        const priceTxBob = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(bobPrice, 8));
        await priceTxBob.wait(1);
        const bobMintTx = await sdusdFromBob.mintSDUSD({ value: ethers.BigNumber.from(sendValue).mul(bobMul) }); // 20 ETH ($40,000)
        const bobMintTxReceipt = await bobMintTx.wait(1);
        const bobMintGas = bobMintTxReceipt.gasUsed;
        const bobMintGasPrice = bobMintTxReceipt.effectiveGasPrice;
        const bobMintGasCost = bobMintGas.mul(bobMintGasPrice);
        
        const priceTxCathy = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(cathyPrice, 8));
        await priceTxCathy.wait(1);
        const cathyMintTx = await sdusdFromCathy.mintSDUSD({ value: ethers.BigNumber.from(sendValue).mul(cathyMul) }); // 20 ETH ($40,000)
        const cathyMintTxReceipt = await cathyMintTx.wait(1);
        const cathyMintGas = cathyMintTxReceipt.gasUsed;
        const cathyMintGasPrice = cathyMintTxReceipt.effectiveGasPrice;
        const cathyMintGasCost = cathyMintGas.mul(cathyMintGasPrice);
       
        const priceTxDana = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(danaPrice, 8));
        await priceTxDana.wait(1);
        const danaMintTx = await sdusdFromDana.mintSDUSD({ value: ethers.BigNumber.from(sendValue).mul(danaMul) }); // 20 ETH ($40,000)
        const danaMintTxReceipt = await danaMintTx.wait(1);
        const danaMintGas = danaMintTxReceipt.gasUsed;
        const danaMintGasPrice = danaMintTxReceipt.effectiveGasPrice;
        const danaMintGasCost = danaMintGas.mul(danaMintGasPrice);


        // Step 3: Check each user's balance is correct
        const adamBalTx = await sdusdFromAdam.balanceOf(adam.address);
        const adamBal = adamBalTx.toString();

        const bobBalTx = await sdusdFromBob.balanceOf(bob.address);
        const bobBal = bobBalTx.toString();

        const cathyBalTx = await sdusdFromCathy.balanceOf(cathy.address);
        const cathyBal = cathyBalTx.toString();

        const danaBalTx = await sdusdFromDana.balanceOf(dana.address);
        const danaBal = danaBalTx.toString();

        assert.equal(adamBal, ethers.BigNumber.from(adamPrice).mul(adamMul).mul(sendValue).toString());
        assert.equal(bobBal, ethers.BigNumber.from(bobPrice).mul(bobMul).mul(sendValue).toString());
        assert.equal(cathyBal, ethers.BigNumber.from(cathyPrice).mul(cathyMul).mul(sendValue).toString());
        assert.equal(danaBal, ethers.BigNumber.from(danaPrice).mul(danaMul).mul(sendValue).toString());

        // Step 4: Redeem SDUSD while changing ETH price

        const adamRedeemPrice = "750";
        const bobRedeemPrice = "1200";
        const cathyRedeemPrice = "2500";
        const danaRedeemPrice = "1800";

        const adamRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(adamRedeemPrice, 8));
        await adamRedeemPriceTx.wait(1);
        const adamRedeemTx = await sdusdFromAdam.redeemSdusdForEth(adamBal);
        const adamRedeemTxReceipt = await adamRedeemTx.wait(1);
        const adamRedeemGas = adamRedeemTxReceipt.gasUsed;
        const adamRedeemGasPrice = adamRedeemTxReceipt.effectiveGasPrice;
        const adamRedeemGasCost= adamRedeemGas.mul(adamRedeemGasPrice);
        const adamEthSent = ethers.BigNumber.from(adamMul).mul(sendValue);
        const adamSdusdBal = ethers.BigNumber.from(adamMul).mul(adamPrice).mul(sendValue);
        const adamEthReceived = adamSdusdBal.div(adamRedeemPrice);
        const adamEndingEthBalance = await ethers.provider.getBalance(adam.address);

        const bobRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(bobRedeemPrice, 8));
        await bobRedeemPriceTx.wait(1);
        const bobRedeemTx = await sdusdFromBob.redeemSdusdForEth(bobBal);
        const bobRedeemTxReceipt = await bobRedeemTx.wait(1);
        const bobRedeemGas = bobRedeemTxReceipt.gasUsed;
        const bobRedeemGasPrice = bobRedeemTxReceipt.effectiveGasPrice;
        const bobRedeemGasCost= bobRedeemGas.mul(bobRedeemGasPrice);
        const bobEthSent = ethers.BigNumber.from(bobMul).mul(sendValue);
        const bobSdusdBal = ethers.BigNumber.from(bobMul).mul(bobPrice).mul(sendValue);
        const bobEthReceived = bobSdusdBal.div(bobRedeemPrice);
        const bobEndingEthBalance = await ethers.provider.getBalance(bob.address);

        const cathyRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(cathyRedeemPrice, 8));
        await cathyRedeemPriceTx.wait(1);
        const cathyRedeemTx = await sdusdFromCathy.redeemSdusdForEth(cathyBal);
        const cathyRedeemTxReceipt = await cathyRedeemTx.wait(1);
        const cathyRedeemGas = cathyRedeemTxReceipt.gasUsed;
        const cathyRedeemGasPrice = cathyRedeemTxReceipt.effectiveGasPrice;
        const cathyRedeemGasCost= cathyRedeemGas.mul(cathyRedeemGasPrice);
        const cathyEthSent = ethers.BigNumber.from(cathyMul).mul(sendValue);
        const cathySdusdBal = ethers.BigNumber.from(cathyMul).mul(cathyPrice).mul(sendValue);
        const cathyEthReceived = cathySdusdBal.div(cathyRedeemPrice);
        const cathyEndingEthBalance = await ethers.provider.getBalance(cathy.address);

        const danaRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(danaRedeemPrice, 8));
        await danaRedeemPriceTx.wait(1);
        const danaRedeemTx = await sdusdFromDana.redeemSdusdForEth(danaBal);
        const danaRedeemTxReceipt = await danaRedeemTx.wait(1);
        const danaRedeemGas = danaRedeemTxReceipt.gasUsed;
        const danaRedeemGasPrice = danaRedeemTxReceipt.effectiveGasPrice;
        const danaRedeemGasCost= danaRedeemGas.mul(danaRedeemGasPrice);
        const danaEthSent = ethers.BigNumber.from(danaMul).mul(sendValue);
        const danaSdusdBal = ethers.BigNumber.from(danaMul).mul(danaPrice).mul(sendValue);
        const danaEthReceived = danaSdusdBal.div(danaRedeemPrice);
        const danaEndingEthBalance = await ethers.provider.getBalance(dana.address);

        // Step 5: Check redemptions are correct
        assert.equal(ethers.BigNumber.from("10000").mul(sendValue).sub(adamEthSent).add(adamEthReceived).sub(adamMintGasCost).sub(adamRedeemGasCost).toString(), adamEndingEthBalance.toString());
        assert.equal(ethers.BigNumber.from("10000").mul(sendValue).sub(bobEthSent).add(bobEthReceived).sub(bobMintGasCost).sub(bobRedeemGasCost).toString(), bobEndingEthBalance.toString());
        assert.equal(ethers.BigNumber.from("10000").mul(sendValue).sub(cathyEthSent).add(cathyEthReceived).sub(cathyMintGasCost).sub(cathyRedeemGasCost).toString(), cathyEndingEthBalance.toString());
        assert.equal(ethers.BigNumber.from("10000").mul(sendValue).sub(danaEthSent).add(danaEthReceived).sub(danaMintGasCost).sub(danaRedeemGasCost).toString(), danaEndingEthBalance.toString());

      });

      it.only("Correctly redeems for multiple users above and below degredationThreshold as the price of ETH changes", async () => {

        // Minting ETH prices for each person
        const adamPrice = "2000";
        const bobPrice = "1000";
        const cathyPrice = "1500";
        const danaPrice = "3000";

        // Step 1: Seed contract with 16 ETH
				const transactionHash = await eric.sendTransaction({
          to: sdusdFromDeployer.address,
          value: ethers.BigNumber.from(initialAmt).mul("3").toString() // 8 ETH
        });
        await transactionHash.wait(1);

        // Step 2: Mint ETH for each user, changing the ETH price in between
        const adamMintTx = await sdusdFromAdam.mintSDUSD({ value: sendValue }); // 1 ETH ($2,000)
        const adamMintTxReceipt = await adamMintTx.wait(1);
        const adamMintGas = adamMintTxReceipt.gasUsed;
        const adamMintGasPrice = adamMintTxReceipt.effectiveGasPrice;
        const adamMintGasCost = adamMintGas.mul(adamMintGasPrice);

        const priceTxBob = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(bobPrice, 8));
        await priceTxBob.wait(1);
        const bobMintTx = await sdusdFromBob.mintSDUSD({ value: sendValue }); // 1 ETH ($3,000)
        const bobMintTxReceipt = await bobMintTx.wait(1);
        const bobMintGas = bobMintTxReceipt.gasUsed;
        const bobMintGasPrice = bobMintTxReceipt.effectiveGasPrice;
        const bobMintGasCost = bobMintGas.mul(bobMintGasPrice);
        
        // const priceTxCathy = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(cathyPrice, 8));
        // await priceTxCathy.wait(1);
        // const cathyMintTx = await sdusdFromCathy.mintSDUSD({ value: sendValue }); // 1 ETH ($1,500)
        // const cathyMintTxReceipt = await cathyMintTx.wait(1);
        // const cathyMintGas = cathyMintTxReceipt.gasUsed;
        // const cathyMintGasPrice = cathyMintTxReceipt.effectiveGasPrice;
        // const cathyMintGasCost = cathyMintGas.mul(cathyMintGasPrice);
       
        // const priceTxDana = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(danaPrice, 8));
        // await priceTxDana.wait(1);
        // const danaMintTx = await sdusdFromDana.mintSDUSD({ value: sendValue }); // 1 ETH ($500)
        // const danaMintTxReceipt = await danaMintTx.wait(1);
        // const danaMintGas = danaMintTxReceipt.gasUsed;
        // const danaMintGasPrice = danaMintTxReceipt.effectiveGasPrice;
        // const danaMintGasCost = danaMintGas.mul(danaMintGasPrice);


        // Step 3: Check each user's balance is correct
        const adamBalTx = await sdusdFromAdam.balanceOf(adam.address);
        const adamBal = adamBalTx.toString();

        // const bobBalTx = await sdusdFromBob.balanceOf(bob.address);
        // const bobBal = bobBalTx.toString();

        // const cathyBalTx = await sdusdFromCathy.balanceOf(cathy.address);
        // const cathyBal = cathyBalTx.toString();

        // const danaBalTx = await sdusdFromDana.balanceOf(dana.address);
        // const danaBal = danaBalTx.toString();

        assert.equal(adamBal, ethers.BigNumber.from(adamPrice).mul(sendValue).toString());
        // assert.equal(bobBal, ethers.BigNumber.from(bobPrice).mul(sendValue).toString());
        // assert.equal(cathyBal, ethers.BigNumber.from(cathyPrice).mul(sendValue).toString());
        // assert.equal(danaBal, ethers.BigNumber.from(danaPrice).mul(sendValue).toString());

        // Step 4: Redeem SDUSD while changing ETH price

        const adamRedeemPrice = "240";
        const bobRedeemPrice = "500";
        const cathyRedeemPrice = "400";
        const danaRedeemPrice = "300";

        // Calculate using JS locally for Adam
        const adamTotalSupplySdusd = (await sdusdFromAdam.totalSupply()).div(sendValue).toString(); // total SDUSD supply at time this user is redeeming
        const adamSdusdEthBal = (await ethers.provider.getBalance(sdusdFromDeployer.address)).div(sendValue).toString(); // total ETH balance of the SDUSD contract at the time this user is redeeming
        const adamBalJS = adamBalTx.div(sendValue).toString(); // user's SDUSD balance

        const adamEthReceived = calculateRedemption(DEGREDATION_THRESHOLD, parseInt(adamTotalSupplySdusd), parseInt(adamBalJS), parseInt(adamRedeemPrice), parseInt(adamSdusdEthBal));
        const adamEthReceivedJS = adamEthReceived.toString().replace(".", ""); // 26666666666666665

        // Redeem and calculate using Solidity contract
        const adamRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(adamRedeemPrice, 8));
        await adamRedeemPriceTx.wait(1);
        const adamRedeemTx = await sdusdFromAdam.redeemSdusdForEth(adamBal);
        const adamRedeemTxReceipt = await adamRedeemTx.wait(1);


        const event = adamRedeemTxReceipt.events.find(e => e.event === "Test");


        console.log("redemptionRate : ", Number(event.args.redemptionRate));
        console.log("weiAmt : ", Number(event.args.weiAmt));
        console.log("quadraticSqrtValueAfter : ", Number(event.args.endingCollateralRatio));
        console.log("quadraticA : ", Number(event.args.quadraticAAmt));



        const adamRedeemGas = adamRedeemTxReceipt.gasUsed;
        const adamRedeemGasPrice = adamRedeemTxReceipt.effectiveGasPrice;
        const adamRedeemGasCost= adamRedeemGas.mul(adamRedeemGasPrice);
        const adamEthSent = ethers.BigNumber.from(sendValue);
        const adamEndingEthBal = await ethers.provider.getBalance(adam.address);

        const adamEthReceivedSolidity = adamEndingEthBal.sub(startingBalances.toString()).add(adamMintGasCost.toString()).add(adamRedeemGasCost.toString()).add(sendValue).toString();
        
        // Ensure the Solidity number has the same number of digits as the JS (local) number
        const adamLengthJS = adamEthReceivedJS.length;

        // subtracting 1 extra digit from the length, because JS will round, i.e. 2.66666666665, when it should be 2.666666666
        const adamEthReceivedJSUpdated = adamEthReceivedJS.substring(0, adamLengthJS - 1)
        const adamEthReceivedSolidityUpdated = adamEthReceivedSolidity.substring(0, adamLengthJS - 1);

        // // Calculate using JS locally for Bob
        // const bobTotalSupplySdusd = (await sdusdFromBob.totalSupply()).div(sendValue).toString(); // total SDUSD supply at time this user is redeeming
        // const bobSdusdEthBal0 = await ethers.provider.getBalance(sdusdFromDeployer.address); // total ETH balance of the SDUSD contract at the time this user is redeeming
        // const bobSdusdEthBal = bobSdusdEthBal0.div(sendValue).toString(); // total ETH balance of the SDUSD contract at the time this user is redeeming
        // const bobBalJS = bobBalTx.div(sendValue).toString(); // user's SDUSD balance
        // const bobEthReceived = calculateRedemption(DEGREDATION_THRESHOLD, parseInt(bobTotalSupplySdusd), parseInt(bobBalJS), parseInt(bobRedeemPrice), parseInt(bobSdusdEthBal));
        // const bobEthReceivedJS = bobEthReceived.toString().replace(".", ""); // 26666666666666665

        // // Redeem and calculate using Solidity contract
        // const bobRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(bobRedeemPrice, 8));
        // await bobRedeemPriceTx.wait(1);

        // const bobRedeemTx = await sdusdFromBob.redeemSdusdForEth(bobBal);
        // const bobRedeemTxReceipt = await bobRedeemTx.wait(1);
        // const bobRedeemGas = bobRedeemTxReceipt.gasUsed;
        // const bobRedeemGasPrice = bobRedeemTxReceipt.effectiveGasPrice;
        // const bobRedeemGasCost= bobRedeemGas.mul(bobRedeemGasPrice);
        // const bobEthSent = ethers.BigNumber.from(sendValue);
        // const bobEndingEthBal = await ethers.provider.getBalance(bob.address);

        // const bobEthReceivedSolidity = bobEndingEthBal.sub(startingBalances.toString()).add(bobMintGasCost.toString()).add(bobRedeemGasCost.toString()).add(sendValue).toString();

        // // Making each number 10 digits so assert.closeTo will work
        // const bobLengthJS = 10;
        // const bobEthReceivedJSUpdated = bobEthReceivedJS.substring(0, bobLengthJS)
        // const bobEthReceivedSolidityUpdated = bobEthReceivedSolidity.substring(0, bobLengthJS);

        // // Calculate using JS locally for Cathy
        // const cathyTotalSupplySdusd = (await sdusdFromCathy.totalSupply()).div(sendValue).toString(); // total SDUSD supply at time this user is redeeming
        // const cathySdusdEthBal0 = await ethers.provider.getBalance(sdusdFromDeployer.address); // total ETH balance of the SDUSD contract at the time this user is redeeming
        // const cathySdusdEthBal = cathySdusdEthBal0.div(sendValue).toString(); // total ETH balance of the SDUSD contract at the time this user is redeeming
        // const cathyBalJS = cathyBalTx.div(sendValue).toString(); // user's SDUSD balance

        // const cathyEthReceived = calculateRedemption(DEGREDATION_THRESHOLD, parseInt(cathyTotalSupplySdusd), parseInt(cathyBalJS), parseInt(cathyRedeemPrice), parseInt(cathySdusdEthBal));
        // const cathyEthReceivedJS = cathyEthReceived.toString().replace(".", ""); // 26666666666666665
        // console.log()

        // // Redeem and calculate using Solidity contract
        // const cathyRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(cathyRedeemPrice, 8));
        // await cathyRedeemPriceTx.wait(1);
        // const cathyRedeemTx = await sdusdFromCathy.redeemSdusdForEth(cathyBal);
        // const cathyRedeemTxReceipt = await cathyRedeemTx.wait(1);
        // const cathyRedeemGas = cathyRedeemTxReceipt.gasUsed;
        // const cathyRedeemGasPrice = cathyRedeemTxReceipt.effectiveGasPrice;
        // const cathyRedeemGasCost= cathyRedeemGas.mul(cathyRedeemGasPrice);
        // const cathyEthSent = ethers.BigNumber.from(sendValue);
        // const cathyEndingEthBal = await ethers.provider.getBalance(cathy.address);

        // const cathyEthReceivedSolidity = cathyEndingEthBal.sub(startingBalances.toString()).add(cathyMintGasCost.toString()).add(cathyRedeemGasCost.toString()).add(sendValue).toString();
        
        // // Making each number 10 digits so assert.closeTo will work
        // const cathyLengthJS = 10;

        // // subtracting 1 extra digit from the length, because JS will round, i.e. 2.66666666665, when it should be 2.666666666
        // const cathyEthReceivedJSUpdated = cathyEthReceivedJS.substring(0, cathyLengthJS)
        // const cathyEthReceivedSolidityUpdated = cathyEthReceivedSolidity.substring(0, cathyLengthJS);

        // // Calculate using JS locally for Dana
        // const danaTotalSupplySdusd = (await sdusdFromDana.totalSupply()).div(sendValue).toString(); // total SDUSD supply at time this user is redeeming
        // const danaSdusdEthBal = (await ethers.provider.getBalance(sdusdFromDeployer.address)).div(sendValue).toString(); // total ETH balance of the SDUSD contract at the time this user is redeeming
        // const danaBalJS = danaBalTx.div(sendValue).toString(); // user's SDUSD balance
        // const danaEthReceived = calculateRedemption(DEGREDATION_THRESHOLD, parseInt(danaTotalSupplySdusd), parseInt(danaBalJS), parseInt(danaRedeemPrice), parseInt(danaSdusdEthBal));
        // const danaEthReceivedJS = danaEthReceived.toString().replace(".", ""); // 26666666666666665

        // // Redeem and calculate using Solidity contract
        // const danaRedeemPriceTx = await mockV3Aggregator.updateAnswer(ethers.utils.parseUnits(danaRedeemPrice, 8));
        // await danaRedeemPriceTx.wait(1);
        // const danaRedeemTx = await sdusdFromDana.redeemSdusdForEth(danaBal);
        // const danaRedeemTxReceipt = await danaRedeemTx.wait(1);
        // const danaRedeemGas = danaRedeemTxReceipt.gasUsed;
        // const danaRedeemGasPrice = danaRedeemTxReceipt.effectiveGasPrice;
        // const danaRedeemGasCost= danaRedeemGas.mul(danaRedeemGasPrice);
        // const danaEthSent = ethers.BigNumber.from(sendValue);
        // const danaEndingEthBal = await ethers.provider.getBalance(dana.address);

        // const danaEthReceivedSolidity = danaEndingEthBal.sub(startingBalances.toString()).add(danaMintGasCost.toString()).add(danaRedeemGasCost.toString()).add(sendValue).toString();
        
        // // Ensure the Solidity number has the same number of digits as the JS (local) number
        // const danaLengthJS = danaEthReceivedJS.length;

        // // subtracting 1 extra digit from the length, because JS will round, i.e. 2.66666666665, when it should be 2.666666666
        // const danaEthReceivedJSUpdated = danaEthReceivedJS.substring(0, danaLengthJS)
        // const danaEthReceivedSolidityUpdated = danaEthReceivedSolidity.substring(0, danaLengthJS);

        assert.equal(adamEthReceivedSolidityUpdated, adamEthReceivedJSUpdated);
        // assert.closeTo(parseInt(bobEthReceivedSolidityUpdated), parseInt(bobEthReceivedJSUpdated), 2000000000, "Bob's ETH received from .sol code and from .js code is within 0.2 ETH of each other");
        // assert.closeTo(parseInt(cathyEthReceivedSolidityUpdated), parseInt(cathyEthReceivedJSUpdated), 2000000000, "Cathy's ETH received from .sol code and from .js code is within 0.2 ETH of each other");
        // assert.equal(danaEthReceivedSolidityUpdated, danaEthReceivedJSUpdated);

        
      });
    })
  })