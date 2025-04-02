import { create } from 'zustand';
import { Post, User, SocialPlatform, NFT } from '@/types';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // Feed state
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  setPosts: (posts: Post[]) => void;
  addPost: (post: Post) => void;
  updatePost: (post: Post) => void;
  deletePost: (postId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Platform filters
  activePlatforms: SocialPlatform[];
  setActivePlatforms: (platforms: SocialPlatform[]) => void;
  togglePlatform: (platform: SocialPlatform) => void;

  // UI state
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // NFT state
  userNFTs: NFT[];
  setUserNFTs: (nfts: NFT[]) => void;
}

export const useStore = create<AppState>((set) => ({
  // User state
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  // Feed state
  posts: [],
  isLoading: false,
  error: null,
  setPosts: (posts) => set({ posts }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  updatePost: (post) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === post.id ? post : p)),
    })),
  deletePost: (postId) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
    })),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Platform filters
  activePlatforms: ['facebook', 'twitter', 'instagram'],
  setActivePlatforms: (platforms) => set({ activePlatforms: platforms }),
  togglePlatform: (platform) =>
    set((state) => ({
      activePlatforms: state.activePlatforms.includes(platform)
        ? state.activePlatforms.filter((p) => p !== platform)
        : [...state.activePlatforms, platform],
    })),

  // UI state
  isDarkMode: true,
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // NFT state
  userNFTs: [],
  setUserNFTs: (nfts) => set({ userNFTs: nfts }),
})); 