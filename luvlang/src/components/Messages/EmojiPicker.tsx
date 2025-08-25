import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');

  const emojiCategories = {
    smileys: {
      name: 'Smileys & People',
      emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
        '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
        '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
        '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
        '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎',
        '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳',
        '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖',
        '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬'
      ]
    },
    hearts: {
      name: 'Hearts & Love',
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️',
        '💋', '💌', '💐', '🌹', '🌺', '🌻', '🌷', '🌸', '💎', '💍',
        '👑', '🎁', '🎀', '🍷', '🥂', '🍾', '🍯', '🍓', '🍒', '🍑'
      ]
    },
    professional: {
      name: 'Professional',
      emojis: [
        '💼', '👔', '👗', '👠', '💍', '⌚', '📱', '💻', '🖥️', '📊',
        '📈', '📉', '💰', '💵', '💴', '💶', '💷', '💳', '💎', '🏆',
        '🥇', '🎯', '📋', '📝', '✅', '❌', '⭐', '🌟', '💡', '🔔',
        '📞', '☎️', '📧', '✉️', '📬', '📮', '🗃️', '📁', '📂', '🗂️',
        '📅', '📆', '🗓️', '⏰', '⏲️', '⏱️', '🕐', '🕕', '🕘', '🕛'
      ]
    },
    food: {
      name: 'Food & Drink',
      emojis: [
        '☕', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷',
        '🥃', '🍸', '🍹', '🧉', '🍾', '🍴', '🥄', '🔪', '🍽️', '🥢',
        '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒',
        '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬',
        '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠'
      ]
    },
    activities: {
      name: 'Activities',
      emojis: [
        '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
        '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
        '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
        '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️',
        '🤺', '🤾', '🏌️', '🏇', '🧘', '🏃', '🚶', '🧎', '🧍', '🤳'
      ]
    },
    travel: {
      name: 'Travel & Places',
      emojis: [
        '✈️', '🛫', '🛬', '🚁', '🚀', '🛸', '🚢', '⛵', '🛥️', '🚤',
        '🛳️', '⛴️', '🚂', '🚝', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉',
        '🚞', '🚋', '🚃', '🚟', '🚠', '🚡', '🚘', '🚗', '🚙', '🚐',
        '🛻', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🚲', '🛴', '🛺',
        '🌍', '🌎', '🌏', '🌐', '🗺️', '🗾', '🧭', '🏔️', '⛰️', '🌋'
      ]
    }
  };

  const categories = Object.keys(emojiCategories) as Array<keyof typeof emojiCategories>;

  return (
    <Card className="w-80 bg-purple-900/95 border-white/10 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap gap-1">
          {categories.map((category) => (
            <Button
              key={category}
              variant="ghost"
              size="sm"
              onClick={() => setActiveCategory(category)}
              className={`text-xs px-3 py-1 h-7 ${
                activeCategory === category
                  ? 'bg-purple-500/30 text-white border border-purple-400/50'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {emojiCategories[category].name}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
          {emojiCategories[activeCategory as keyof typeof emojiCategories].emojis.map((emoji, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => onEmojiSelect(emoji)}
              className="w-8 h-8 p-0 text-lg hover:bg-purple-500/30 transition-colors"
            >
              {emoji}
            </Button>
          ))}
        </div>
        
        {/* Recently Used Section */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-medium text-purple-300 mb-2">Recently Used</h4>
          <div className="grid grid-cols-8 gap-1">
            {['😊', '❤️', '👍', '😂', '🔥', '💯', '🙌', '😍'].map((emoji, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                onClick={() => onEmojiSelect(emoji)}
                className="w-8 h-8 p-0 text-lg hover:bg-purple-500/30 transition-colors"
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <h4 className="text-xs font-medium text-purple-300 mb-2">Quick Reactions</h4>
          <div className="flex flex-wrap gap-1">
            {[
              { emoji: '👍', label: 'Like' },
              { emoji: '❤️', label: 'Love' },
              { emoji: '😂', label: 'Funny' },
              { emoji: '😍', label: 'Wow' },
              { emoji: '🔥', label: 'Hot' },
              { emoji: '💯', label: 'Perfect' }
            ].map((reaction, index) => (
              <Badge
                key={index}
                onClick={() => onEmojiSelect(reaction.emoji)}
                className="cursor-pointer bg-purple-500/20 text-purple-200 border-purple-400/30 hover:bg-purple-500/30 transition-colors"
              >
                {reaction.emoji} {reaction.label}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmojiPicker;