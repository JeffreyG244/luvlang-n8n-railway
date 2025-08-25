import React, { useState } from 'react';

// Lovable-compatible Dashboard without external dependencies
const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('matches');
  const [userStats] = useState({
    matches: 12,
    messages: 8,
    profileViews: 45,
    connections: 3
  });

  const tabs = [
    { id: 'matches', label: 'Matches', icon: '❤️', count: userStats.matches },
    { id: 'messages', label: 'Messages', icon: '💬', count: userStats.messages },
    { id: 'connections', label: 'Connections', icon: '👥', count: userStats.connections },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🛡️' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                LuvLang Pro
              </div>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Executive Member
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-purple-200 text-sm">
                Profile Views: <span className="text-white font-semibold">{userStats.profileViews}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
                <span className="text-white">👤</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-white/10 bg-black/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 rounded-none border-b-2 transition-all duration-200 ${
                    isActive
                      ? 'border-purple-400 bg-purple-500/20 text-white'
                      : 'border-transparent text-purple-200 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                  {tab.count && (
                    <span className={`ml-1 px-2 py-1 text-xs font-semibold rounded-full ${
                      isActive 
                        ? 'bg-purple-400 text-white' 
                        : 'bg-white/10 text-purple-200'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'matches' && <MatchesView />}
        {activeTab === 'messages' && <MessagingInterface />}
        {activeTab === 'connections' && <ConnectionsView />}
        {activeTab === 'profile' && <ProfileView />}
        {activeTab === 'security' && <SecurityView />}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
};

// Matches View Component
const MatchesView = () => {
  const matches = [
    { id: 1, name: 'Alexandra Chen', age: 32, title: 'Tech CEO', company: 'InnovateCorp', location: 'San Francisco', image: '👩‍💼' },
    { id: 2, name: 'Victoria Sterling', age: 29, title: 'Investment Director', company: 'Goldman Sachs', location: 'New York', image: '👩‍💻' },
    { id: 3, name: 'Isabella Rodriguez', age: 35, title: 'Surgeon', company: 'Mayo Clinic', location: 'Rochester', image: '👩‍⚕️' },
    { id: 4, name: 'Sophia Williams', age: 31, title: 'Partner', company: 'McKinsey & Co', location: 'Chicago', image: '👩‍🎓' }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Your Premium Matches</h2>
        <p className="text-purple-200">High-caliber professionals who share your ambitions</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {matches.map((match) => (
          <div key={match.id} className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer group p-6">
            <div className="text-center space-y-4">
              <div className="text-6xl">{match.image}</div>
              <div>
                <h3 className="text-xl font-semibold text-white">{match.name}</h3>
                <p className="text-purple-200 text-sm">Age {match.age}</p>
              </div>
              <div className="space-y-1">
                <p className="text-white font-medium">{match.title}</p>
                <p className="text-purple-300 text-sm">{match.company}</p>
                <p className="text-purple-400 text-xs">{match.location}</p>
              </div>
              <div className="flex space-x-2">
                <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium transition-colors">
                  ❤️ Like
                </button>
                <button className="flex-1 px-4 py-2 border border-white/20 text-purple-200 hover:bg-white/10 rounded-md font-medium transition-colors">
                  💬 Message
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Messaging Interface Component
const MessagingInterface = () => {
  const [selectedConversation, setSelectedConversation] = useState(1);
  const [activeTab, setActiveTab] = useState('messages');
  const [showProfile, setShowProfile] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const conversations = [
    {
      id: 1,
      name: 'Alexandra Chen',
      title: 'Tech CEO',
      company: 'InnovateCorp',
      age: 32,
      location: 'San Francisco, CA',
      lastMessage: 'Would love to discuss the merger over dinner 🍷',
      time: '2m ago',
      unread: 2,
      online: true,
      image: '👩‍💼',
      bio: 'Passionate about building scalable tech solutions and mentoring the next generation of entrepreneurs.'
    }
  ];

  const messages = [
    { id: 1, text: 'Hi there! I noticed we both went to Stanford. How did you like the entrepreneurship program?', sender: 'them', time: '10:30 AM' },
    { id: 2, text: 'Stanford was incredible! The network alone has been invaluable for my ventures. Are you still in tech?', sender: 'me', time: '10:32 AM' },
    { id: 3, text: 'Yes, I\'m currently scaling my third startup. We just closed Series B 🚀', sender: 'them', time: '10:35 AM' },
    { id: 4, text: 'Would love to discuss the merger over dinner 🍷', sender: 'them', time: '10:40 AM' }
  ];

  const tabs = [
    { id: 'messages', label: 'Messages', icon: '💬' },
    { id: 'phone', label: 'Phone', icon: '📞' },
    { id: 'video', label: 'Video', icon: '📹' },
    { id: 'coffee', label: 'Coffee', icon: '☕' }
  ];

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      {/* Conversations List */}
      <div className="w-1/3 rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Messages</h3>
            <span className="px-2 py-1 text-xs font-semibold rounded-md bg-purple-600 text-white">{conversations.length}</span>
          </div>
        </div>
        <div className="p-0">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 cursor-pointer transition-colors ${
                selectedConversation === conversation.id
                  ? 'bg-purple-500/20 border-r-2 border-purple-400'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <div className="text-3xl">{conversation.image}</div>
                  {conversation.online && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-purple-900"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white truncate">{conversation.name}</h3>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-purple-300">{conversation.time}</span>
                      {conversation.unread > 0 && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-md bg-purple-600 text-white">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-purple-300 mb-1">{conversation.title} at {conversation.company}</p>
                  <p className="text-sm text-purple-200 truncate">{conversation.lastMessage}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 flex flex-col">
        {currentConversation && (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="text-4xl">{currentConversation.image}</div>
                    {currentConversation.online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-purple-900"></div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{currentConversation.name}</h2>
                    <p className="text-purple-300">{currentConversation.title} • {currentConversation.online ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowProfile(true)}
                    className="px-4 py-2 border border-white/20 text-purple-200 hover:bg-white/10 rounded-md font-medium transition-colors"
                  >
                    👤 View Profile
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 mt-4">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 transition-all duration-200 rounded-md ${
                        isActive
                          ? 'bg-purple-500/20 text-white border border-purple-400/50'
                          : 'text-purple-200 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex flex-col">
              {activeTab === 'messages' && (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            message.sender === 'me'
                              ? 'bg-purple-500 text-white'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          <p className="text-sm">{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender === 'me' ? 'text-purple-200' : 'text-purple-300'
                          }`}>
                            {message.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-white/10 p-4">
                    <div className="flex items-end space-x-2">
                      <div className="flex-1 relative">
                        <input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type your message..."
                          className="w-full h-9 px-3 py-1 text-sm text-white bg-white/10 border border-white/20 rounded-md placeholder:text-purple-300/70 focus:outline-none focus:ring-1 focus:ring-purple-400"
                          onKeyPress={(e) => e.key === 'Enter' && setMessageInput('')}
                        />
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8 text-purple-300 hover:text-white"
                        >
                          😊
                        </button>
                      </div>
                      <button
                        onClick={() => setMessageInput('')}
                        disabled={!messageInput.trim()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                      >
                        📤
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'phone' && <PhoneTab />}
              {activeTab === 'video' && <VideoTab />}
              {activeTab === 'coffee' && <CoffeeTab />}
            </div>
          </>
        )}
      </div>

      {/* Profile Modal */}
      {showProfile && currentConversation && (
        <ProfileModal
          conversation={currentConversation}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
};

// Tab Components
const PhoneTab = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center max-w-md">
      <div className="text-6xl mb-4">📞</div>
      <h3 className="text-xl font-semibold text-white mb-2">Schedule a Call</h3>
      <p className="text-purple-200 mb-6">Connect over a voice call to get to know each other better</p>
      <div className="space-y-3">
        <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
          📞 Schedule Phone Call
        </button>
        <button className="w-full px-4 py-2 border border-white/20 text-purple-200 hover:bg-white/10 rounded-md font-medium transition-colors">
          View Available Times
        </button>
      </div>
    </div>
  </div>
);

const VideoTab = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center max-w-md">
      <div className="text-6xl mb-4">📹</div>
      <h3 className="text-xl font-semibold text-white mb-2">Video Chat</h3>
      <p className="text-purple-200 mb-6">Have a face-to-face conversation from anywhere</p>
      <div className="space-y-3">
        <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
          📹 Start Video Call
        </button>
        <button className="w-full px-4 py-2 border border-white/20 text-purple-200 hover:bg-white/10 rounded-md font-medium transition-colors">
          Schedule Video Date
        </button>
      </div>
    </div>
  </div>
);

const CoffeeTab = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center max-w-md">
      <div className="text-6xl mb-4">☕</div>
      <h3 className="text-xl font-semibold text-white mb-2">Coffee Date</h3>
      <p className="text-purple-200 mb-6">Meet for coffee at a premium location near you</p>
      <div className="space-y-3">
        <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
          ☕ Suggest Coffee Spot
        </button>
        <button className="w-full px-4 py-2 border border-white/20 text-purple-200 hover:bg-white/10 rounded-md font-medium transition-colors">
          📍 View Premium Venues
        </button>
      </div>
    </div>
  </div>
);

// Other View Components
const ConnectionsView = () => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-2">Your Connections</h2>
      <p className="text-purple-200">Professionals you've connected with</p>
    </div>
    
    <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-8 text-center">
      <div className="text-6xl mb-4">👥</div>
      <h3 className="text-xl font-semibold text-white mb-2">No Connections Yet</h3>
      <p className="text-purple-200 mb-4">Start making meaningful connections with successful professionals</p>
      <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
        Discover Matches
      </button>
    </div>
  </div>
);

const ProfileView = () => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-2">Your Profile</h2>
      <p className="text-purple-200">Manage your professional dating profile</p>
    </div>
    
    <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-8 text-center">
      <div className="text-6xl mb-4">👤</div>
      <h3 className="text-xl font-semibold text-white mb-2">Profile Management</h3>
      <p className="text-purple-200 mb-4">Update your profile information and preferences</p>
      <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors">
        Edit Profile
      </button>
    </div>
  </div>
);

const SecurityView = () => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-2">Security Dashboard</h2>
      <p className="text-purple-200">Monitor your account security</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-purple-200 text-sm mb-2">Events (24h)</h3>
        <p className="text-2xl font-bold text-white">24</p>
      </div>
      <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-purple-200 text-sm mb-2">Failed Logins</h3>
        <p className="text-2xl font-bold text-white">0</p>
      </div>
      <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-purple-200 text-sm mb-2">Unique IPs</h3>
        <p className="text-2xl font-bold text-white">3</p>
      </div>
      <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-purple-200 text-sm mb-2">Active Alerts</h3>
        <p className="text-2xl font-bold text-green-400">0</p>
      </div>
    </div>
  </div>
);

const SettingsView = () => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white mb-2">Account Settings</h2>
      <p className="text-purple-200">Manage your preferences and account</p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-purple-200">Show my profile to matches</span>
            <div className="w-12 h-6 bg-purple-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-purple-200">Allow direct messages</span>
            <div className="w-12 h-6 bg-purple-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white/5 text-white shadow backdrop-blur-sm border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Notifications</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-purple-200">New matches</span>
            <div className="w-12 h-6 bg-purple-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-purple-200">Messages</span>
            <div className="w-12 h-6 bg-purple-500 rounded-full relative">
              <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Profile Modal Component
const ProfileModal = ({ conversation, onClose }: { conversation: any, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="rounded-xl border bg-purple-900/95 text-white shadow backdrop-blur-sm border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-2xl font-semibold">Profile Details</h2>
          <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-md">
            ✕
          </button>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <div className="text-center">
          <div className="text-8xl mb-4">{conversation.image}</div>
          <h2 className="text-2xl font-bold text-white">{conversation.name}</h2>
          <p className="text-purple-200">Age {conversation.age}</p>
        </div>

        {/* Professional Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Professional</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <span className="text-purple-400">💼</span>
              <div>
                <p className="text-white font-medium">{conversation.title}</p>
                <p className="text-purple-300 text-sm">{conversation.company}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-purple-400">📍</span>
              <div>
                <p className="text-white font-medium">{conversation.location}</p>
                <p className="text-purple-300 text-sm">Location</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">About</h3>
          <p className="text-purple-200 leading-relaxed">{conversation.bio}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-md font-medium transition-colors">
            ❤️ Like Profile
          </button>
          <button className="flex-1 px-4 py-2 border border-white/20 text-purple-200 hover:bg-white/10 rounded-md font-medium transition-colors">
            💬 Send Message
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default Dashboard;