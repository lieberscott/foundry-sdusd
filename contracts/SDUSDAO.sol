// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0


/** OPEN ZEPPELIN CODE */


/** Will also want to add that no proposals can be made for the first year of the contract being deployed. Because then one person can buy an NFT and change everything himself */


pragma solidity ^0.8.22;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
// import { SDUSD } from "./SDUSD.sol";


contract SDUSDAO is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction, GovernorTimelockControl {
	
	uint256 public mintingThreshold = 4; // ethInUsd:SDUSD ratio threshold above which SDUSD still can be minted
	uint256 public degredationThreshold = 2; // ethInUsd:SDUSD ratio threshold below which SDUSD redemptions are reduced below 1:1	
	
	constructor(
    IVotes _token,
    TimelockController _timelock,
    uint256 _quorumPercentage,
    uint256 _votingPowerThreshold
  )
		Governor("SDUSDAO")
		GovernorSettings(7200, 5400, _votingPowerThreshold)
		GovernorVotes(_token)
		GovernorVotesQuorumFraction(_quorumPercentage)
		GovernorTimelockControl(_timelock)
	{ }



  // The following functions are overrides required by Solidity.

  function votingDelay()
      public
      view
      override(Governor, GovernorSettings)
      returns (uint256)
  {
      return super.votingDelay();
  }

  function votingPeriod()
      public
      view
      override(Governor, GovernorSettings)
      returns (uint256)
  {
      return super.votingPeriod();
  }

  function quorum(uint256 blockNumber)
      public
      view
      override(Governor, GovernorVotesQuorumFraction)
      returns (uint256)
  {
      return super.quorum(blockNumber);
  }

  function state(uint256 proposalId)
      public
      view
      override(Governor, GovernorTimelockControl)
      returns (ProposalState)
  {
      return super.state(proposalId);
  }

  function proposalNeedsQueuing(uint256 proposalId)
      public
      view
      override(Governor, GovernorTimelockControl)
      returns (bool)
  {
      return super.proposalNeedsQueuing(proposalId);
  }

  function proposalThreshold()
      public
      view
      override(Governor, GovernorSettings)
      returns (uint256)
  {
      return super.proposalThreshold();
  }

  function _queueOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
      internal
      override(Governor, GovernorTimelockControl)
      returns (uint48)
  {
      return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _executeOperations(uint256 proposalId, address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
      internal
      override(Governor, GovernorTimelockControl)
  {
      super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
  }

  function _cancel(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash)
      internal
      override(Governor, GovernorTimelockControl)
      returns (uint256)
  {
      return super._cancel(targets, values, calldatas, descriptionHash);
  }

  function _executor()
      internal
      view
      override(Governor, GovernorTimelockControl)
      returns (address)
  {
      return super._executor();
  }


  /** CHAT-GPT CODE */

//   function _ownsNFT(address _owner) internal view returns (bool) {
//       GovernanceNFT governanceNFT = GovernanceNFT(i_governanceNFTAddress);
//       return governanceNFT.balanceOf(_owner) > 0;
//   }

}
