import { useState } from 'react';
import { useStore } from '@/store';
import { Web3Service } from '@/services/web3';
import { NFTMetadata } from '@/types';

const web3Service = new Web3Service();

export const useNFT = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userNFTs, setUserNFTs, setError: setStoreError } = useStore();

  const mintNFT = async (metadata: NFTMetadata, walletAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const nft = await web3Service.mintNFT(metadata, walletAddress);
      setUserNFTs([...userNFTs, nft]);
      return nft;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint NFT';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNFTMetadata = async (tokenId: string) => {
    try {
      const metadata = await web3Service.getNFTMetadata(tokenId);
      return metadata;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch NFT metadata';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    }
  };

  const verifyOwnership = async (tokenId: string, walletAddress: string) => {
    try {
      const isOwner = await web3Service.verifyOwnership(tokenId, walletAddress);
      return isOwner;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify ownership';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    }
  };

  const getUserNFTs = async (walletAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const nfts = await web3Service.getUserNFTs(walletAddress);
      setUserNFTs(nfts);
      return nfts;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user NFTs';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const transferNFT = async (
    tokenId: string,
    fromAddress: string,
    toAddress: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      await web3Service.transferNFT(tokenId, fromAddress, toAddress);
      // Update the user's NFTs after transfer
      const updatedNFTs = await web3Service.getUserNFTs(fromAddress);
      setUserNFTs(updatedNFTs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to transfer NFT';
      setError(errorMessage);
      setStoreError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    userNFTs,
    isLoading,
    error,
    mintNFT,
    fetchNFTMetadata,
    verifyOwnership,
    getUserNFTs,
    transferNFT,
  };
}; 