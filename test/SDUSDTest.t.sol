// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Test, console } from "forge-std/Test.sol";
import { SDUSD } from "../src/SDUSD.sol";
import { DeploySDUSD } from "../script/DeploySDUSD.s.sol";

contract SDUSDTEST is Test {

	SDUSD sdusdContract;

	// constructor variables
	address _sdusdDaoAddress = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	address _ethPriceFeed = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	uint256 _sdusdTokenId = 0;
	address _vrfCoordinator = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	address _linkTokenAddress = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	uint256 _ethCollateralRatio = 4 * 1e18;
	uint256 _degredationThreshold = 1.5 * 1e18;
	bytes32 _keyHash = "tbd";
	
	function setUp() external {
		DeploySDUSD deploySdusd = new DeploySDUSD();

		sdusdContract = deploySdusd.run();

	}

	function testDegredationThreshold() public {
		assertEq(sdusdContract.s_degredationThreshold(), 15);
	}

	function testOwner() public {
		assertEq(sdusdContract.i_owner(), msg.sender);
	}

}