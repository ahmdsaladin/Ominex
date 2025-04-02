import { env } from '@/config/env';
import { NFT, NFTMetadata } from '@/types';
import { ethers } from 'ethers';
import { create } from 'ipfs-http-client';

// Initialize IPFS client
const ipfs = create({ url: env.ipfs.nodeUrl });

// NFT Contract ABI (minimal example)
const NFT_ABI = [
  'function mint(string memory tokenURI) public returns (uint256)',
  'function ownerOf(uint256 tokenId) public view returns (address)',
  'function tokenURI(uint256 tokenId) public view returns (string)',
];

export class Web3Service {
  private provider: ethers.Provider;
  private nftContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.ethereum.nodeUrl);
    this.nftContract = new ethers.Contract(
      env.nft.contractAddress,
      NFT_ABI,
      this.provider
    );
  }

  // Mint a new NFT
  async mintNFT(
    metadata: NFTMetadata,
    walletAddress: string
  ): Promise<NFT> {
    try {
      // Upload metadata to IPFS
      const metadataBuffer = Buffer.from(JSON.stringify(metadata));
      const metadataResult = await ipfs.add(metadataBuffer);
      const tokenURI = `ipfs://${metadataResult.path}`;

      // Create contract instance with signer
      const signer = await this.provider.getSigner(walletAddress);
      const contractWithSigner = this.nftContract.connect(signer);

      // Mint NFT
      const tx = await contractWithSigner.mint(tokenURI);
      const receipt = await tx.wait();

      // Get token ID from event logs
      const tokenId = receipt.logs[0].topics[3]; // Assuming tokenId is in the first event

      return {
        id: tokenId,
        tokenId: tokenId.toString(),
        contractAddress: env.nft.contractAddress,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: walletAddress,
        user: null as any, // Will be populated by the database
      };
    } catch (error) {
      console.error('Error minting NFT:', error);
      throw new Error('Failed to mint NFT');
    }
  }

  // Get NFT metadata
  async getNFTMetadata(tokenId: string): Promise<NFTMetadata> {
    try {
      const tokenURI = await this.nftContract.tokenURI(tokenId);
      const ipfsHash = tokenURI.replace('ipfs://', '');
      
      // Fetch metadata from IPFS
      const response = await fetch(`${env.ipfs.nodeUrl}/api/v0/cat?arg=${ipfsHash}`);
      const metadata = await response.json();
      
      return metadata as NFTMetadata;
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      throw new Error('Failed to fetch NFT metadata');
    }
  }

  // Verify NFT ownership
  async verifyOwnership(tokenId: string, walletAddress: string): Promise<boolean> {
    try {
      const owner = await this.nftContract.ownerOf(tokenId);
      return owner.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      console.error('Error verifying NFT ownership:', error);
      return false;
    }
  }

  // Get user's NFTs
  async getUserNFTs(walletAddress: string): Promise<NFT[]> {
    try {
      // This is a simplified example. In a real implementation,
      // you would need to handle pagination and possibly use
      // a subgraph or indexer to efficiently query NFTs
      const balance = await this.nftContract.balanceOf(walletAddress);
      const nfts: NFT[] = [];

      for (let i = 0; i < balance; i++) {
        const tokenId = await this.nftContract.tokenOfOwnerByIndex(walletAddress, i);
        const metadata = await this.getNFTMetadata(tokenId);
        
        nfts.push({
          id: tokenId,
          tokenId: tokenId.toString(),
          contractAddress: env.nft.contractAddress,
          metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: walletAddress,
          user: null as any, // Will be populated by the database
        });
      }

      return nfts;
    } catch (error) {
      console.error('Error fetching user NFTs:', error);
      return [];
    }
  }

  // Transfer NFT ownership
  async transferNFT(
    tokenId: string,
    fromAddress: string,
    toAddress: string
  ): Promise<boolean> {
    try {
      // Verify ownership
      const isOwner = await this.verifyOwnership(tokenId, fromAddress);
      if (!isOwner) {
        throw new Error('Not the owner of the NFT');
      }

      // Create contract instance with signer
      const signer = await this.provider.getSigner(fromAddress);
      const contractWithSigner = this.nftContract.connect(signer);

      // Transfer NFT
      const tx = await contractWithSigner.transferFrom(fromAddress, toAddress, tokenId);
      await tx.wait();

      return true;
    } catch (error) {
      console.error('Error transferring NFT:', error);
      return false;
    }
  }
} 