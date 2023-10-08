// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import { AggregatorV3Interface } from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library PriceConverter {
  /**
   * @dev ethPrice has 8 decimal places, so we add 10 zeros to it to allow it to match msg.value, which is expressed in wei
   */
  function getPrice() internal view returns (uint256) {
    (, int256 ethPrice, , , ) = ethPriceFeed.latestRoundData();
    return uint256(ethPrice * 1e10);
  }

  function getConversionRate(uint256 _ethAmount) internal view returns (uint256) {
    uint256 ethPrice = getPrice();
    uint256 ethAmountInUsd = (ethPrice * ethAmount) / 1e18;
    return ethAmountInUsd;
  }
}