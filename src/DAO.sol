// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";


contract SDUSD_DAO {

  // ERC-20 variables
  // uint256 public ethTargetCollateralRatio;

  // Changeable variables
  // uint256 public REDEMPTION_RATE = 90;
  // uint256 public dollarAmtAtWhichToDepeg = 1;
  uint256 public constant maxDurationOfProposal = 10; // proposals can not be longer than 10 days

  // Changeable variables
  uint256[4] public changeableVariables = [4, 2, 50, 67]; // [ethCollateralRatio, degredationThreshold, quorum, passingPercentage]
  uint256 public proposalCounter = 0;
  uint256 public totalVotes;
  uint256 public quorum = 50; // percent of voting power that needs to vote for a change to apply
  uint256 public passingPercentage = 67; // percent of votes to vote 'yes' needed for proposal to pass

  struct Proposal {
    uint256 variableToChange; // this is either redemptionRate, collateralRatio, quorum, etc., which each have a number assigned to them
    uint256 changeTo; // what the new variable will be -> change quorum from 50 to 40, for example (changeTo = 40)
    uint256 votesFor;
    uint256 votesAgainst;
    uint256 quorum;
    uint256 durationOfProposal; // how long will people be able to vote, no longer than 7 days
    uint256 proposalStart;
    uint256 proposalEnd;
    bool finalizedByCommunity; // true if the `finalizeProposal` funtion has been fulfilled on this Proposal, default false
  }

  mapping(uint256 => Proposal) proposalNumberToData;

  
  // DAO Voting variables
  uint256 public totalVotingShares;
  mapping(address => uint256) public votingShares; // untransferrable voting shares for people who buy an NFT

  // Events
  event ProposalFinalized(address indexed finalizer, Proposal indexed proposal);


  function makeProposal() public {

  }

  function voteOnProposal(uint256 _proposalNumber) public {

  }

  function finalizeProposal(uint256 _proposalNumber) public {
    // make sure durationOfProposal has passed (this math and number usage is not currently correct as of 9/12/23)
    require(proposalNumberToData[_proposalNumber].proposalStart + proposalNumberToData[_proposalNumber].durationOfProposal >= block.timestamp, "Proposal is still open");

    // make sure it's reached quorum
    require(proposalNumberToData[_proposalNumber].quorum > (proposalNumberToData[_proposalNumber].votesFor + proposalNumberToData[_proposalNumber].votesAgainst) / totalVotes, "Proposal did not reach quorum");

    // if passed, make changes
    if (proposalNumberToData[_proposalNumber].votesFor / (proposalNumberToData[_proposalNumber].votesFor + proposalNumberToData[_proposalNumber].votesAgainst) > passingPercentage) {
      // make sure finaizedByCommunity is false (don't need to re-finalize a Proposal that's already been finalized)
      require(proposalNumberToData[_proposalNumber].finalizedByCommunity != true, "Proposal has already been finalized");

      // make changes
      uint256 variableToChange = proposalNumberToData[_proposalNumber].variableToChange;
      changeableVariables[variableToChange] = proposalNumberToData[_proposalNumber].changeTo;

      // and finalize proposal
      proposalNumberToData[_proposalNumber].finalizedByCommunity = true;

    }
    // else, finalizeProposal and end
    else {
      proposalNumberToData[_proposalNumber].finalizedByCommunity = true;
    }

    emit ProposalFinalized(msg.sender, proposalNumberToData[_proposalNumber]);

  }



  /**
   * @notice this function allows users to view the details of a Proposal
   * @dev this probably does not currently work as of 9/12/23 (Proposal details will not be returned)
   * @param _proposalNumber which proposal to get the details for
   */
  function viewProposal(uint256 _proposalNumber) external view returns(Proposal memory) {
    return proposalNumberToData[_proposalNumber];
  }
}
