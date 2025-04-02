import { Post } from "@/types/post";

// Temporary mock data
const mockPosts: Post[] = [
  {
    id: "1",
    content: "Just launched Ominex! 🚀 The future of social media is here.",
    platform: "twitter",
    platformId: "123",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "1",
    user: {
      id: "1",
      name: "Ominex Team",
      image: "https://avatars.githubusercontent.com/u/1234567",
    },
  },
  {
    id: "2",
    content: "Check out our new AI-powered features! 🤖",
    mediaUrl: "https://example.com/image.jpg",
    platform: "instagram",
    platformId: "456",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "2",
    user: {
      id: "2",
      name: "AI Team",
      image: "https://avatars.githubusercontent.com/u/7654321",
    },
  },
];

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Create Post */}
      <div className="bg-gray-800 rounded-lg p-4 mb-8">
        <textarea
          className="w-full bg-gray-700 text-white rounded-lg p-4 mb-4 resize-none"
          placeholder="What's on your mind?"
          rows={3}
        />
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button className="text-gray-400 hover:text-white">
              <span className="sr-only">Add media</span>
              📷
            </button>
            <button className="text-gray-400 hover:text-white">
              <span className="sr-only">Add NFT</span>
              🎨
            </button>
          </div>
          <button className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600">
            Post
          </button>
        </div>
      </div>

      {/* Social Feed */}
      <div className="space-y-6">
        {mockPosts.map((post) => (
          <div key={post.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center space-x-4 mb-4">
              <img
                src={post.user.image || "https://via.placeholder.com/40"}
                alt={post.user.name || "User"}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <h3 className="font-semibold">{post.user.name}</h3>
                <p className="text-sm text-gray-400">
                  {post.platform} • {post.createdAt.toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="mb-4">{post.content}</p>
            {post.mediaUrl && (
              <img
                src={post.mediaUrl}
                alt="Post media"
                className="rounded-lg mb-4"
              />
            )}
            <div className="flex space-x-4 text-gray-400">
              <button className="hover:text-white">❤️ Like</button>
              <button className="hover:text-white">💬 Comment</button>
              <button className="hover:text-white">🔄 Share</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
