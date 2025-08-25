export const profileFormConfig = {
  sections: [
    {
      id: 'executive-profile',
      title: 'Executive Profile',
      description: 'Professional background & status',
      fields: [
        { id: 'firstName', type: 'text', label: 'First Name', required: true },
        { id: 'lastName', type: 'text', label: 'Last Name', required: true },
        { 
          id: 'age', 
          type: 'select', 
          label: 'Age', 
          required: true,
          options: Array.from({length: 55}, (_, i) => ({ value: i + 25, label: `${i + 25}` }))
        },
        {
          id: 'successLevel',
          type: 'select',
          label: 'Success Level',
          required: true,
          options: [
            { value: 'established-professional', label: 'Established Professional' },
            { value: 'senior-executive', label: 'Senior Executive' },
            { value: 'business-owner', label: 'Business Owner/Entrepreneur' },
            { value: 'investor', label: 'Private Investor' },
            { value: 'creative-leader', label: 'Creative Industry Leader' },
            { value: 'tech-innovator', label: 'Tech Innovator/Founder' },
            { value: 'luxury-professional', label: 'Luxury Industry Professional' },
            { value: 'independent-wealth', label: 'Independently Wealthy' }
          ]
        },
        { id: 'industry', type: 'text', label: 'Industry/Field', placeholder: 'e.g., Technology, Finance, Healthcare', required: true },
        { id: 'location', type: 'text', label: 'Primary Location', placeholder: 'City, State' },
        {
          id: 'lifestyleLevel',
          type: 'select',
          label: 'Lifestyle Level',
          options: [
            { value: 'comfortable', label: 'Comfortable & Secure' },
            { value: 'affluent', label: 'Affluent Professional' },
            { value: 'luxury', label: 'Luxury Lifestyle' },
            { value: 'ultra-luxury', label: 'Ultra-Luxury Experience' },
            { value: 'bespoke', label: 'Bespoke Everything' }
          ]
        }
      ]
    },
    {
      id: 'identity-preferences',
      title: 'Identity & Preferences',
      description: 'Dating preferences and identity',
      fields: [
        {
          id: 'sexualOrientation',
          type: 'multiselect',
          label: 'Sexual Orientation (Select all that apply)',
          required: true,
          options: [
            'Straight/Heterosexual', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 
            'Queer', 'Asexual', 'Demisexual', 'Sapiosexual', 'Questioning', 
            'Fluid', 'Prefer not to label'
          ]
        },
        {
          id: 'relationshipStyle',
          type: 'multiselect',
          label: 'Relationship Style Preferences',
          required: true,
          options: ['Monogamous', 'Ethically Non-monogamous', 'Polyamorous', 'Open Relationship', 'Exploring/Unsure']
        },
        {
          id: 'interestedIn',
          type: 'multiselect',
          label: 'Interested in Meeting',
          required: true,
          options: ['Men', 'Women', 'Non-binary people', 'Trans men', 'Trans women', 'Anyone', 'It depends on the person']
        },
        {
          id: 'datingIntentions',
          type: 'multiselect',
          label: 'Dating Intentions',
          required: true,
          options: [
            'Long-term partnership', 'Marriage & family building', 'Serious dating',
            'Casual dating', 'Networking & friendship', 'Open to anything'
          ]
        },
        {
          id: 'dealBreakers',
          type: 'multiselect',
          label: 'Absolute Deal-Breakers',
          required: true,
          options: [
            'Smoking', 'Heavy drinking', 'Drug use', 'Dishonesty',
            'Different political views', 'Different religious views',
            'Wants children (if I don\'t)', 'Doesn\'t want children (if I do)',
            'Long distance', 'Financial instability', 'Poor communication'
          ]
        },
        {
          id: 'preferredAgeMin',
          type: 'select',
          label: 'Preferred Minimum Age',
          options: Array.from({length: 40}, (_, i) => ({ value: i + 25, label: `${i + 25}` }))
        },
        {
          id: 'preferredAgeMax',
          type: 'select',
          label: 'Preferred Maximum Age',
          options: Array.from({length: 40}, (_, i) => ({ value: i + 25, label: `${i + 25}` }))
        },
        {
          id: 'distancePreference',
          type: 'select',
          label: 'Distance Preference',
          options: [
            { value: 'local-only', label: 'Local only (same city)' },
            { value: '50-miles', label: 'Within 50 miles' },
            { value: '100-miles', label: 'Within 100 miles' },
            { value: 'same-state', label: 'Same state' },
            { value: 'national', label: 'Anywhere in country' },
            { value: 'international', label: 'International' }
          ]
        }
      ]
    },
    {
      id: 'lifestyle-values',
      title: 'Lifestyle & Values',
      description: 'Core beliefs and lifestyle',
      fields: [
        {
          id: 'politicalViews',
          type: 'select',
          label: 'Political Views',
          options: [
            { value: 'very-liberal', label: 'Very Liberal' },
            { value: 'liberal', label: 'Liberal' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'conservative', label: 'Conservative' },
            { value: 'very-conservative', label: 'Very Conservative' },
            { value: 'libertarian', label: 'Libertarian' },
            { value: 'apolitical', label: 'Not Political' },
            { value: 'prefer-not-say', label: 'Prefer Not to Say' }
          ]
        },
        {
          id: 'religiousViews',
          type: 'select',
          label: 'Religious/Spiritual Views',
          options: [
            { value: 'atheist', label: 'Atheist' },
            { value: 'agnostic', label: 'Agnostic' },
            { value: 'spiritual-not-religious', label: 'Spiritual but not Religious' },
            { value: 'christian', label: 'Christian' },
            { value: 'jewish', label: 'Jewish' },
            { value: 'muslim', label: 'Muslim' },
            { value: 'hindu', label: 'Hindu' },
            { value: 'buddhist', label: 'Buddhist' },
            { value: 'other-religion', label: 'Other Religion' },
            { value: 'prefer-not-say', label: 'Prefer Not to Say' }
          ]
        },
        {
          id: 'familyPlans',
          type: 'select',
          label: 'Family Plans',
          options: [
            { value: 'want-children', label: 'Want Children' },
            { value: 'have-children', label: 'Have Children' },
            { value: 'open-to-children', label: 'Open to Children' },
            { value: 'unsure-about-children', label: 'Unsure About Children' },
            { value: 'no-children', label: "Don't Want Children" },
            { value: 'prefer-not-say', label: 'Prefer Not to Say' }
          ]
        },
        {
          id: 'livingArrangement',
          type: 'select',
          label: 'Living Arrangement',
          options: [
            { value: 'own-house', label: 'Own My House' },
            { value: 'own-condo', label: 'Own My Condo' },
            { value: 'luxury-rental', label: 'Luxury Rental' },
            { value: 'multiple-properties', label: 'Multiple Properties' },
            { value: 'family-estate', label: 'Family Estate' },
            { value: 'other', label: 'Other' }
          ]
        },
        {
          id: 'coreValues',
          type: 'multiselect',
          label: 'Core Values (Select up to 6)',
          limit: 6,
          required: true,
          options: [
            'Honesty & Integrity', 'Ambition & Success', 'Family & Loyalty', 'Adventure & Growth',
            'Compassion & Kindness', 'Intelligence & Learning', 'Freedom & Independence', 'Creativity & Art',
            'Health & Wellness', 'Spirituality & Meaning', 'Justice & Fairness', 'Tradition & Heritage',
            'Innovation & Progress', 'Community & Service', 'Excellence & Quality', 'Balance & Harmony'
          ]
        },
        {
          id: 'languages',
          type: 'multiselect',
          label: 'Languages Spoken',
          options: [
            'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
            'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Dutch',
            'Swedish', 'Norwegian', 'Hindi', 'Other'
          ]
        }
      ]
    },
    {
      id: 'psychology-compatibility',
      title: 'Psychology & Compatibility',
      description: 'Personality insights for matching',
      fields: [
        {
          id: 'personalityType',
          type: 'select',
          label: 'Personality Type (Myers-Briggs)',
          required: true,
          options: [
            { value: 'intj', label: 'INTJ - The Architect' },
            { value: 'intp', label: 'INTP - The Thinker' },
            { value: 'entj', label: 'ENTJ - The Commander' },
            { value: 'entp', label: 'ENTP - The Debater' },
            { value: 'infj', label: 'INFJ - The Advocate' },
            { value: 'infp', label: 'INFP - The Mediator' },
            { value: 'enfj', label: 'ENFJ - The Protagonist' },
            { value: 'enfp', label: 'ENFP - The Campaigner' },
            { value: 'istj', label: 'ISTJ - The Logistician' },
            { value: 'isfj', label: 'ISFJ - The Protector' },
            { value: 'estj', label: 'ESTJ - The Executive' },
            { value: 'esfj', label: 'ESFJ - The Consul' },
            { value: 'istp', label: 'ISTP - The Virtuoso' },
            { value: 'isfp', label: 'ISFP - The Adventurer' },
            { value: 'estp', label: 'ESTP - The Entrepreneur' },
            { value: 'esfp', label: 'ESFP - The Entertainer' },
            { value: 'unsure', label: 'Not Sure' }
          ]
        },
        {
          id: 'attachmentStyle',
          type: 'select',
          label: 'Attachment Style',
          required: true,
          options: [
            { value: 'secure', label: 'Secure - Comfortable with intimacy' },
            { value: 'anxious', label: 'Anxious - Seeks closeness, fears abandonment' },
            { value: 'avoidant', label: 'Avoidant - Values independence' },
            { value: 'disorganized', label: 'Disorganized - Inconsistent patterns' },
            { value: 'unsure', label: 'Not Sure' }
          ]
        },
        {
          id: 'loveLanguage',
          type: 'multiselect',
          label: 'Love Languages (Select top 2)',
          limit: 2,
          required: true,
          options: [
            'Words of Affirmation', 'Quality Time', 'Physical Touch', 
            'Acts of Service', 'Receiving Gifts'
          ]
        },
        {
          id: 'conflictResolution',
          type: 'select',
          label: 'Conflict Resolution Style',
          required: true,
          options: [
            { value: 'direct-communication', label: 'Direct Communication - Address issues head-on' },
            { value: 'collaborative', label: 'Collaborative - Find win-win solutions' },
            { value: 'compromising', label: 'Compromising - Meet in the middle' },
            { value: 'accommodating', label: 'Accommodating - Prioritize harmony' },
            { value: 'time-to-process', label: 'Need Time - Process before discussing' }
          ]
        },
        {
          id: 'communicationStyle',
          type: 'multiselect',
          label: 'Communication Style',
          options: [
            'Direct & Honest', 'Diplomatic & Tactful', 'Emotionally Expressive', 
            'Logical & Analytical', 'Playful & Humorous', 'Deep & Philosophical',
            'Supportive & Encouraging', 'Mysterious & Intriguing'
          ]
        }
      ]
    },
    {
      id: 'interests-culture',
      title: 'Interests & Culture',
      description: 'Hobbies and cultural preferences',
      fields: [
        {
          id: 'weekendActivities',
          type: 'multiselect',
          label: 'Weekend Activities',
          required: true,
          options: [
            'Fine Dining', 'Art Galleries', 'Museums', 'Live Music', 'Theater Shows',
            'Wine Tasting', 'Golf', 'Tennis', 'Sailing', 'Skiing', 'Hiking',
            'Fitness & Gym', 'Yoga', 'Spa Days', 'Shopping', 'Reading',
            'Cooking', 'Gardening', 'Photography', 'Travel Planning'
          ]
        },
        {
          id: 'culturalInterests',
          type: 'multiselect',
          label: 'Cultural Interests',
          required: true,
          options: [
            'Classical Music', 'Opera', 'Jazz', 'Contemporary Art', 'Sculpture',
            'Literature', 'Poetry', 'Philosophy', 'History', 'Architecture',
            'Fashion', 'Design', 'Cinema', 'Documentary Films', 'Dance',
            'Theater', 'Museums', 'Cultural Travel'
          ]
        },
        {
          id: 'intellectualPursuits',
          type: 'multiselect',
          label: 'Intellectual Pursuits',
          required: true,
          options: [
            'Investment Strategy', 'Business Innovation', 'Technology Trends', 'Scientific Research',
            'Political Analysis', 'Economic Theory', 'Philosophy', 'Psychology',
            'Entrepreneurship', 'Leadership Development', 'Personal Growth', 'Meditation',
            'Learning Languages', 'Academic Courses', 'Industry Conferences', 'Thought Leadership'
          ]
        },
        {
          id: 'vacationStyle',
          type: 'multiselect',
          label: 'Vacation Style',
          required: true,
          options: [
            'Luxury Resorts', 'Cultural Immersion', 'Adventure Travel', 'City Exploration',
            'Beach Relaxation', 'Mountain Retreats', 'Safari Expeditions', 'Yacht Charters',
            'Private Villas', 'Michelin Tours', 'Wellness Retreats', 'Business & Pleasure'
          ]
        }
      ]
    }
  ]
};
