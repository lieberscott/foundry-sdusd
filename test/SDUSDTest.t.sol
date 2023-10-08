// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Test, console } from "forge-std/Test.sol";
import { SDUSD } from "../src/SDUSD.sol";
import { DeploySDUSD } from "../script/DeploySDUSD.s.sol";

contract SDUSDTEST is Test {

	SDUSD sdusdContract;
	address sdusdContractAddress;

	address alice = makeAddr("alice");
	address bob = makeAddr("bob");
	address carla = makeAddr("carla");

	uint256 public constant INITIAL_ETH_PRICE = 2000e8;

	uint256 constant STARTING_BALANCE = 100 ether;

	// constructor variables
	// address _sdusdDaoAddress = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	// address _ethPriceFeed = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	// uint256 _sdusdTokenId = 0;
	// address _vrfCoordinator = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	// address _linkTokenAddress = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	// uint256 _ethCollateralRatio = 4 * 1e18;
	// uint256 _degredationThreshold = 1.5 * 1e18;
	// bytes32 _keyHash = "tbd";
	
	function setUp() external {
		DeploySDUSD deploySdusd = new DeploySDUSD();

		sdusdContract = deploySdusd.run();
		sdusdContractAddress = address(sdusdContract);
		vm.deal(alice, STARTING_BALANCE);
		vm.deal(bob, STARTING_BALANCE);
		vm.deal(carla, STARTING_BALANCE);

	}

	function testDegredationThresholdIsSet() public {
		assertEq(sdusdContract.getDegredationThreshold(), 1.5 * 1e18);
	}

	function testOwnerIsSet() public {
		assertEq(sdusdContract.getOwner(), msg.sender);
	}

	// function testPriceOnTestnet() public {
	// 	uint256 ethUsdPrice = sdusdContract.getPrice();
	// 	assertEq(ethUsdPrice, 2000e18);
	// }

	function testMintFailsWithNoCollateral() public {
		vm.expectRevert();
		sdusdContract.mintSDUSD{value: 1e18 }();
	}

	function testItAcceptsCollateral() public {
		vm.prank(alice);
		payable(sdusdContractAddress).transfer(4e18);
		uint256 balance = sdusdContractAddress.balance;
		assertEq(balance, 4e18);
	}

	function testCalculateMaxMintableWorks() public {

		// variables
		uint256 transferAmt = 4e18;
		uint256 sdusdMinted = sdusdContract.getSdusdMinted();
		uint256 ethCollateralRatio = sdusdContract.getEthCollateralRatio();

		vm.prank(alice);
		payable(sdusdContractAddress).transfer(transferAmt);

		// Get balance of contract (should be transferAmt)
		uint256 bal = address(sdusdContractAddress).balance;

		// Get maxMintable (with 18 decimal places), then cast to uint256
		(int256 response, ) = sdusdContract.calculateMaxMintable();
		uint256 maxMintable = uint256(response);
		
		uint256 equationAnswer = (INITIAL_ETH_PRICE * (bal + maxMintable)) / (sdusdMinted + (maxMintable) * INITIAL_ETH_PRICE);
		
		assertEq(equationAnswer, ethCollateralRatio);
	}


	function testMintWorksWithCollateral() public {

		// variables
		uint256 transferAmt = 4e18;
		// uint256 ethCollateralRatio = sdusdContract.getEthCollateralRatio();

		// Transfer 4 eth to contract
		vm.prank(alice);
		payable(sdusdContractAddress).transfer(transferAmt);

		// Get maxMintable (in ETH), then cast into a uint256
		(int256 response, uint256 ethPrice) = sdusdContract.calculateMaxMintable();
		uint256 maxMintable = uint256(response);

		// Attempt to mint the max (use alice because msg.sender is a contract address, which creates complications)
		vm.prank(alice);
		sdusdContract.mintSDUSD{value: maxMintable}();

		uint256 sdusdMinted = sdusdContract.getSdusdMinted();

		assertEq(sdusdMinted, maxMintable * ethPrice / 1e18);

	}

}