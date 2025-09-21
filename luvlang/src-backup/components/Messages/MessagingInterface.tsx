import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Phone, 
  Video, 
  Coffee, 
  User, 
  Send, 
  Smile,
  Heart,
  MoreVertical,
  X,
  MapPin,
  Briefcase,
  GraduationCap,
  Star
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';

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
      education: 'Stanford MBA',
      lastMessage: 'Would love to discuss the merger over dinner 🍷',
      time: '2m ago',
      unread: 2,
      online: true,
      image: '👩‍💼',
      bio: 'Passionate about building scalable tech solutions and mentoring the next generation of entrepreneurs. Currently scaling a SaaS platform to 10M+ users.',
      interests: ['Technology', 'Leadership', 'Wine Tasting', 'Sailing'],
      achievements: ['Forbes 30 Under 30', 'TechCrunch Disruptor', 'Y Combinator Alum']
    },
    {
      id: 2,
      name: 'Victoria Sterling',
      title: 'Investment Director',
      company: 'Goldman Sachs',
      age: 29,
      location: 'New York, NY',
      education: 'Wharton MBA',
      lastMessage: 'The art gallery opening was fantastic!',
      time: '1h ago',
      unread: 0,
      online: false,
      image: '👩‍💻',
      bio: 'Managing $2B+ in private equity investments. Art collector and philanthropist with a passion for supporting women in finance.',
      interests: ['Art', 'Finance', 'Philanthropy', 'Classical Music'],
      achievements: ['Top PE Performer 2023', 'Charity Board Member', 'Marathon Finisher']
    },
    {
      id: 3,
      name: 'Isabella Rodriguez',
      title: 'Neurosurgeon',
      company: 'Mayo Clinic',
      age: 35,
      location: 'Rochester, MN',
      education: 'Harvard Medical',
      lastMessage: 'Coffee tomorrow sounds perfect ☕',
      time: '3h ago',
      unread: 1,
      online: true,
      image: '👩‍⚕️',
      bio: 'Leading neurosurgeon specializing in complex brain surgeries. Published researcher and medical innovation advocate.',
      interests: ['Medicine', 'Research', 'Yoga', 'Travel'],
      achievements: ['Medical Innovation Award', 'Published Author', 'TEDx Speaker']
    }
  ];

  const messages = [
    { id: 1, text: 'Hi there! I noticed we both went to Stanford. How did you like the entrepreneurship program?', sender: 'them', time: '10:30 AM' },
    { id: 2, text: 'Stanford was incredible! The network alone has been invaluable for my ventures. Are you still in tech?', sender: 'me', time: '10:32 AM' },
    { id: 3, text: 'Yes, I\'m currently scaling my third startup. We just closed Series B 🚀', sender: 'them', time: '10:35 AM' },
    { id: 4, text: 'Congratulations! That\'s amazing. I\'d love to hear more about it.', sender: 'me', time: '10:37 AM' },
    { id: 5, text: 'Would love to discuss the merger over dinner 🍷', sender: 'them', time: '10:40 AM' }
  ];

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // Add message logic here
    setMessageInput('');
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
  };

  const tabs = [
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'phone', label: 'Phone', icon: Phone },
    { id: 'video', label: 'Video', icon: Video },
    { id: 'coffee', label: 'Coffee', icon: Coffee }
  ];

  return (
    <div className="h-[calc(100vh-200px)] flex gap-6">
      {/* Conversations List */}
      <Card className="w-1/3 bg-white/5 border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center justify-between">
            <span>Messages</span>
            <Badge className="bg-purple-500 text-white">{conversations.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
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
                          <Badge className="bg-purple-500 text-white text-xs w-5 h-5 flex items-center justify-center p-0">
                            {conversation.unread}
                          </Badge>
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
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="flex-1 bg-white/5 border-white/10 flex flex-col">
        {currentConversation && (
          <>
            {/* Chat Header */}
            <CardHeader className="border-b border-white/10 pb-4">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowProfile(true)}
                    className="border-white/20 text-purple-200 hover:bg-white/10"
                  >
                    <User className="w-4 h-4 mr-1" />
                    View Profile
                  </Button>
                  <Button variant="outline" size="sm" className="border-white/20 text-purple-200 hover:bg-white/10">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex space-x-1 mt-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2 transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-500/20 text-white border border-purple-400/50'
                          : 'text-purple-200 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardHeader>

            {/* Tab Content */}
            <CardContent className="flex-1 flex flex-col p-0">
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
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type your message..."
                          className="bg-white/10 border-white/20 text-white placeholder-purple-300 pr-12"
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-8 w-8 text-purple-300 hover:text-white"
                        >
                          <Smile className="w-4 h-4" />
                        </Button>
                        {showEmojiPicker && (
                          <div className="absolute bottom-full right-0 mb-2">
                            <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        className="bg-purple-500 hover:bg-purple-600 text-white"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'phone' && <PhoneTab />}
              {activeTab === 'video' && <VideoTab />}
              {activeTab === 'coffee' && <CoffeeTab />}
            </CardContent>
          </>
        )}
      </Card>

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

// Phone Tab Component
const PhoneTab = () => (
  <div className="flex-1 flex items-center justify-center">
    <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
      <Phone className="w-16 h-16 text-purple-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">Schedule a Call</h3>
      <p className="text-purple-200 mb-6">Connect over a voice call to get to know each other better</p>
      <div className="space-y-3">
        <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">
          <Phone className="w-4 h-4 mr-2" />
          Schedule Phone Call
        </Button>
        <Button variant="outline" className="w-full border-white/20 text-purple-200 hover:bg-white/10">
          View Available Times
        </Button>
      </div>
    </Card>
  </div>
);

// Video Tab Component
const VideoTab = () => (
  <div className="flex-1 flex items-center justify-center">
    <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
      <Video className="w-16 h-16 text-purple-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">Video Chat</h3>
      <p className="text-purple-200 mb-6">Have a face-to-face conversation from anywhere</p>
      <div className="space-y-3">
        <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">
          <Video className="w-4 h-4 mr-2" />
          Start Video Call
        </Button>
        <Button variant="outline" className="w-full border-white/20 text-purple-200 hover:bg-white/10">
          Schedule Video Date
        </Button>
      </div>
    </Card>
  </div>
);

// Coffee Tab Component
const CoffeeTab = () => (
  <div className="flex-1 flex items-center justify-center">
    <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
      <Coffee className="w-16 h-16 text-purple-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">Coffee Date</h3>
      <p className="text-purple-200 mb-6">Meet for coffee at a premium location near you</p>
      <div className="space-y-3">
        <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">
          <Coffee className="w-4 h-4 mr-2" />
          Suggest Coffee Spot
        </Button>
        <Button variant="outline" className="w-full border-white/20 text-purple-200 hover:bg-white/10">
          <MapPin className="w-4 h-4 mr-2" />
          View Premium Venues
        </Button>
      </div>
    </Card>
  </div>
);

// Profile Modal Component
const ProfileModal = ({ conversation, onClose }: { conversation: any, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <Card className="bg-purple-900/95 border-white/10 backdrop-blur-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-2xl">Profile Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
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
              <Briefcase className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">{conversation.title}</p>
                <p className="text-purple-300 text-sm">{conversation.company}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">{conversation.education}</p>
                <p className="text-purple-300 text-sm">Education</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-purple-400" />
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

        {/* Interests */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {conversation.interests.map((interest: string, index: number) => (
              <Badge key={index} className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-white/10 pb-2">Achievements</h3>
          <div className="space-y-2">
            {conversation.achievements.map((achievement: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-purple-200">{achievement}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
            <Heart className="w-4 h-4 mr-2" />
            Like Profile
          </Button>
          <Button variant="outline" className="flex-1 border-white/20 text-purple-200 hover:bg-white/10">
            <MessageCircle className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default MessagingInterface;