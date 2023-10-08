// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
import { SDUSD } from "../src/SDUSD.sol";

contract DeploySDUSD is Script {

	// constructor variables
	address _sdusdDaoAddress = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	address _ethPriceFeed = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	uint256 _sdusdTokenId = 0;
	address _vrfCoordinator = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	address _linkTokenAddress = 0x4838B106FCe9647Bdf1E7877BF73cE8B0BAD5f97;
	uint256 _ethCollateralRatio = 4 * 1e18;
	uint256 _degredationThreshold = 1.5 * 1e18;
	bytes32 _keyHash = "tbd";

	function run() external returns (SDUSD) {
		vm.startBroadcast();

		SDUSD sdusd = new SDUSD(
			_sdusdDaoAddress,
			_ethPriceFeed,
			_sdusdTokenId,
			_vrfCoordinator,
			_linkTokenAddress,
			_ethCollateralRatio,
			_degredationThreshold,
			_keyHash
		);

		vm.stopBroadcast();

		return sdusd;
	}
}