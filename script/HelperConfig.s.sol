// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import { Script } from "forge-std/Script.sol";
import { MockV3Aggregator } from "../test/mocks/MockV3Aggregator.sol";

contract HelperConfig is Script {

  NetworkConfig public activeNetworkConfig;

  uint8 public constant DECIMALS = 8;
  int256 public constant INITIAL_ETH_PRICE = 2000e8;

  struct NetworkConfig {
    address ethUsdPriceFeed; // ETH/USD price feed address
    address linkTokenAddress;
  }

  constructor() {
    if (block.chainid == 11155111) {
      activeNetworkConfig = getSepoliaEthConfig();
    }
    else if (block.chainid == 31337) {
      activeNetworkConfig = getOrCreateAnvilEthConfig();
    }
  }

  function getSepoliaEthConfig() public pure returns (NetworkConfig memory) {
    NetworkConfig memory sepoliaConfig = NetworkConfig({
      ethUsdPriceFeed: 0x694AA1769357215DE4FAC081bf1f309aDC325306,
      linkTokenAddress: 0x779877A7B0D9E8603169DdbD7836e478b4624789
      });
    return sepoliaConfig;
  }

  function getOrCreateAnvilEthConfig() public returns (NetworkConfig memory) {
    // 1. Deploy the mocks
    // 2. Return the mock addresses

    if (activeNetworkConfig.ethUsdPriceFeed != address(0)) {
      return activeNetworkConfig;
    }

    vm.startBroadcast();

    // constructor takes (_decimals, initialAnswer)
    MockV3Aggregator mockPriceFeed = new MockV3Aggregator(DECIMALS, INITIAL_ETH_PRICE);

    vm.stopBroadcast();

    NetworkConfig memory anvilConfig = NetworkConfig({
      ethUsdPriceFeed: address(mockPriceFeed),
      linkTokenAddress: address(mockPriceFeed)
    });

    return anvilConfig;
  }

}