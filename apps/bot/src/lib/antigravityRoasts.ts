/**
 * Antigravity Roast Generator
 * Generates witty, sarcastic, and cutting roasts when users mention antigravity
 */

interface UserProfile {
  dominant_archetype?: string;
  neuroticism_score?: number;
  openness_score?: number;
  conflict_style?: string;
  humor_style?: string;
  omega_thoughts?: string;
  notable_patterns?: string[];
  attractiveness_assessment?: string;
  perceived_confidence_level?: string;
  message_length_avg?: number;
  technical_knowledge_level?: string;
}

interface RoastTemplate {
  template: string;
  requiresProfile?: boolean;
  profileCondition?: (profile: UserProfile) => boolean;
}

// Roast templates with varying styles
const roastTemplates: RoastTemplate[] = [
  // Intelligence mocking roasts
  {
    template: "Oh wow, {keyword}? I haven't heard something that scientifically illiterate since the flat earth convention. Did you fail physics or just skip it entirely?",
    requiresProfile: false,
  },
  {
    template: "'{keyword}'? Really? And I thought I'd seen peak stupidity today. Thanks for raising the bar so spectacularly low.",
    requiresProfile: false,
  },
  {
    template: "Let me guess - you also believe in healing crystals and homeopathy? Because mentioning {keyword} puts you right in that special category of 'aggressively wrong about science.'",
    requiresProfile: false,
  },
  {
    template: "Ah yes, {keyword}. The rallying cry of people who think YouTube videos count as peer-reviewed research. How's that working out for you?",
    requiresProfile: false,
  },

  // Ambition/judgment insulting roasts
  {
    template: "You know what's less real than {keyword}? The chances of you ever making a scientifically sound argument. But hey, keep reaching for those imaginary stars.",
    requiresProfile: false,
  },
  {
    template: "'{keyword}' - is that what you call it when your critical thinking skills float away into the void? Because that's the only thing defying gravity here.",
    requiresProfile: false,
  },
  {
    template: "I'd explain why {keyword} is pseudoscientific nonsense, but I have a sneaking suspicion that basic physics is well above your intellectual pay grade.",
    requiresProfile: false,
  },

  // Self-awareness burning roasts
  {
    template: "The only thing more impressive than your belief in {keyword} is your complete lack of self-awareness about how that makes you look. Spoiler: not good.",
    requiresProfile: false,
  },
  {
    template: "'{keyword}'? Buddy, the only thing you should be concerned about defying is the gravity of your own terrible decisions - starting with this message.",
    requiresProfile: false,
  },

  // Taste/judgment roasts
  {
    template: "I've seen some questionable takes in my time, but bringing up {keyword}? That's like voluntarily admitting you eat crayons for breakfast. Not a great look.",
    requiresProfile: false,
  },
  {
    template: "You really typed '{keyword}' with your whole chest and thought 'yeah, this is the one.' That's the kind of judgment I'd expect from someone who microwaves fish in the office.",
    requiresProfile: false,
  },

  // Generic savage roasts
  {
    template: "'{keyword}' - congratulations on stringing together the two words most likely to make everyone in a 10-mile radius question your intelligence. Truly remarkable.",
    requiresProfile: false,
  },
  {
    template: "I'd tell you that {keyword} violates the fundamental laws of physics, but something tells me 'fundamental laws' isn't really your speed. Try 'basic common sense' - oh wait, that's missing too.",
    requiresProfile: false,
  },
  {
    template: "The mental gymnastics required to take {keyword} seriously would be impressive if they weren't so deeply embarrassing for you specifically.",
    requiresProfile: false,
  },

  // Profile-enhanced roasts (used when profile data is available)
  {
    template: "'{keyword}'? With your track record of {pattern}, I shouldn't be surprised. But somehow, you still manage to exceed my already-low expectations.",
    requiresProfile: true,
    profileCondition: (profile) => !!(profile.notable_patterns && profile.notable_patterns.length > 0),
  },
  {
    template: "Oh {archetype}, bringing up {keyword} is peak on-brand for you - and not in a good way. It's like watching a masterclass in being confidently incorrect.",
    requiresProfile: true,
    profileCondition: (profile) => !!profile.dominant_archetype,
  },
  {
    template: "I had some thoughts about you before: '{thoughts}' And now you're out here talking about {keyword}. Really validating my assessment, aren't you?",
    requiresProfile: true,
    profileCondition: (profile) => !!profile.omega_thoughts,
  },
  {
    template: "Your {knowledge_level} level technical knowledge is showing. Pro tip: mentioning {keyword} doesn't make you sound smarter - quite the opposite, actually.",
    requiresProfile: true,
    profileCondition: (profile) => !!(profile.technical_knowledge_level && (profile.technical_knowledge_level === 'beginner' || profile.technical_knowledge_level === 'low')),
  },
  {
    template: "That {confidence_level} confidence of yours? Turns out it was completely justified. Because only someone with that level of self-doubt would compensate by spouting {keyword} nonsense.",
    requiresProfile: true,
    profileCondition: (profile) => profile.perceived_confidence_level === 'low',
  },
];

/**
 * Generate a personalized roast for antigravity mentions
 */
export function generateAntigravityRoast(
  username: string,
  keyword: string,
  userProfile?: UserProfile | null,
  bannedButNoPerm: boolean = false
): string {
  // Filter applicable templates
  let applicableTemplates = roastTemplates.filter(t => {
    if (t.requiresProfile && !userProfile) return false;
    if (t.profileCondition && userProfile && !t.profileCondition(userProfile)) return false;
    return true;
  });

  // If no applicable templates (shouldn't happen), use all non-profile templates
  if (applicableTemplates.length === 0) {
    applicableTemplates = roastTemplates.filter(t => !t.requiresProfile);
  }

  // Randomly select a template
  const selectedTemplate = applicableTemplates[Math.floor(Math.random() * applicableTemplates.length)];

  // Build the roast
  let roast = `${username}, `;

  // Add ban context if applicable
  if (bannedButNoPerm) {
    roast += "I'd ban you for this if I had the permissions, but I don't. So instead, you get this: ";
  }

  // Fill in the template
  let filledTemplate = selectedTemplate.template.replace(/{keyword}/g, keyword);

  // Fill in profile-specific placeholders if available
  if (userProfile) {
    if (userProfile.notable_patterns && userProfile.notable_patterns.length > 0) {
      filledTemplate = filledTemplate.replace(/{pattern}/g, userProfile.notable_patterns[0]);
    }

    if (userProfile.dominant_archetype) {
      filledTemplate = filledTemplate.replace(/{archetype}/g, userProfile.dominant_archetype);
    }

    if (userProfile.omega_thoughts) {
      const truncatedThoughts = userProfile.omega_thoughts.substring(0, 80) + (userProfile.omega_thoughts.length > 80 ? '...' : '');
      filledTemplate = filledTemplate.replace(/{thoughts}/g, truncatedThoughts);
    }

    if (userProfile.technical_knowledge_level) {
      filledTemplate = filledTemplate.replace(/{knowledge_level}/g, userProfile.technical_knowledge_level);
    }

    if (userProfile.perceived_confidence_level) {
      filledTemplate = filledTemplate.replace(/{confidence_level}/g, userProfile.perceived_confidence_level);
    }
  }

  roast += filledTemplate;

  return roast;
}
