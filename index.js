const { useState, useEffect } = require("react");
const { ethers } = require("ethers");
const { Button } = require("@/components/ui/button");

export default function SDUSDApp() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [sdusdContract, setSDUSDContract] = useState(null);
  const [sdnftContract, setSDNFTContract] = useState(null);
  const [ethBalance, setEthBalance] = useState("0");
  const [sdusdMintable, setSDUSDMintable] = useState("0");
  const [nftSupply, setNFTSupply] = useState("0");

  const SDUSD_CONTRACT_ADDRESS = "0xYourSDUSDContractAddress";
  const SDNFT_CONTRACT_ADDRESS = "0xYourSDNFTContractAddress";
  const sdusdAbi = [ /* Your ABI Here */ ];
  const sdnftAbi = [ /* Your ABI Here */ ];

  useEffect(() => {
    if (window.ethereum) {
      const providerInstance = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(providerInstance);
    }
  }, []);

  const connectWallet = async () => {
    if (!provider) return;
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);
    const signerInstance = provider.getSigner();
    setSigner(signerInstance);

    const sdusdInstance = new ethers.Contract(SDUSD_CONTRACT_ADDRESS, sdusdAbi, signerInstance);
    setSDUSDContract(sdusdInstance);
    
    const sdnftInstance = new ethers.Contract(SDNFT_CONTRACT_ADDRESS, sdnftAbi, signerInstance);
    setSDNFTContract(sdnftInstance);

    updateBalances(signerInstance);
  };

  const updateBalances = async (signerInstance) => {
    const balance = await signerInstance.getBalance();
    setEthBalance(ethers.utils.formatEther(balance));

    if (sdusdContract) {
      const maxMintable = await sdusdContract.getMaxMintable();
      setSDUSDMintable(ethers.utils.formatUnits(maxMintable, 18));
    }
    
    if (sdnftContract) {
      const supply = await sdnftContract.totalSupply();
      setNFTSupply(supply.toString());
    }
  };

  const mintSDUSD = async (amount) => {
    if (!sdusdContract || !signer) return;
    const tx = await sdusdContract.mint({ value: ethers.utils.parseEther(amount) });
    await tx.wait();
    updateBalances(signer);
  };

  const mintNFT = async () => {
    if (!sdnftContract || !signer) return;
    const tx = await sdnftContract.mintNFT({ value: ethers.utils.parseEther("0.1") });
    await tx.wait();
    updateBalances(signer);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">SDUSD DApp</h1>
      {!account ? (
        <Button onClick={connectWallet}>Connect MetaMask</Button>
      ) : (
        <div>
          <p>Connected: {account}</p>
          <p>ETH Balance: {ethBalance}</p>
          <p>Max SDUSD Mintable: {sdusdMintable}</p>
          <p>NFTs Minted: {nftSupply}</p>

          <input type="text" placeholder="ETH to Mint SDUSD" id="mintAmount" className="border p-2 w-full" />
          <Button onClick={() => mintSDUSD(document.getElementById("mintAmount").value)}>Mint SDUSD</Button>

          <Button onClick={mintNFT} className="mt-4">Mint NFT (0.1 ETH)</Button>
        </div>
      )}
    </div>
  );
}
