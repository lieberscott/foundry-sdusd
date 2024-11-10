// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Votes.sol";

contract SDNFT is ERC721, EIP712, ERC721Votes { // may need certain ERC1155 contract extensions

  // uint256 public constant SDNFT_ID = 1;
  // uint256 public constant NON_TRANSFERABLE_NFT_ID = 2;



  string public baseTokenURI;
  uint256 private premiumNftPrice = 1000000000000000000; // 1 ETH
  uint256 private regularNftPrice = 100000000000000000; // 0.1 ETH

  uint256 public premiumNftCounter = 0; // NFTs 0 - 9999
  uint256 public regularNftCounter = 10000; // NFTs 10000+

  address sdusdTokenAddress;

  constructor(
    string memory _baseTokenURI,
    address _sdusdTokenAddress,
    string memory _nftName,
    string memory _nftSymbol
  )
    ERC721(_nftName, _nftSymbol)
    EIP712(_nftName, "1")
  {
    baseTokenURI = _baseTokenURI;
    sdusdTokenAddress = _sdusdTokenAddress;
  }



  function buyPremiumNft() external payable {
    require(msg.value >= premiumNftPrice, "Not enough ETH");
    require(premiumNftCounter < 9999, "Premium NFTs sold out");

    uint256 newItemId = premiumNftCounter;
    _safeMint(msg.sender, newItemId);
    premiumNftCounter++;

    // add to voting power

    // mint soulbound token
  }


  function buyRegularNft() external payable {
    require(msg.value >= regularNftPrice, "Not enough ETH");
    
    uint256 newItemId = regularNftCounter;
    _safeMint(msg.sender, newItemId);
    regularNftCounter++;

    // add to voting power

    // mint soulbound token
  }



  function _baseURI() internal view override returns (string memory) {
    return baseTokenURI;
  }


  receive() external payable {
    (bool success, ) = address(sdusdTokenAddress).call{value: msg.value}("");
    require(success, "Failed to forward ETH to SDUSD contract");
  }

  function forwardETHToSDUSD() internal {
    // If for some reason there is ETH that isn't transferred to SDUSD contract,
    // this contract allows anyone to transfer the ETH Balance of this contract to the SDUSD contract
    (bool success, ) = address(sdusdTokenAddress).call{value: address(this).balance}("");
    require(success, "Failed to forward ETH to SDUSD contract");
  }


  // Override transfer functions to restrict NON_TRANSFERABLE_NFT_ID
  // function safeTransferFrom(
  //     address from,
  //     address to,
  //     uint256 id,
  //     uint256 amount,
  //     bytes memory data
  // ) public override {
  //     require(id != NON_TRANSFERABLE_NFT_ID, "Non-transferable NFT cannot be transferred");
  //     super.safeTransferFrom(from, to, id, amount, data);
  // }


  // The following functions are overrides required by Solidity.

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Votes)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Votes)
    {
        super._increaseBalance(account, value);
    }





}
