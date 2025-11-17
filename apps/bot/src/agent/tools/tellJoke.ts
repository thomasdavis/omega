/**
 * Tell a Joke Tool - Provides random jokes from various categories
 *
 * Features:
 * - Diverse joke pool with multiple categories (tech, classic, puns, dad jokes, programming)
 * - Category-specific or random joke selection
 * - Easy to extend with more jokes
 */

import { tool } from 'ai';
import { z } from 'zod';

// Joke database organized by category
const jokes = {
  tech: [
    {
      setup: "Why do programmers prefer dark mode?",
      punchline: "Because light attracts bugs!"
    },
    {
      setup: "What's a programmer's favorite hangout place?",
      punchline: "The Foo Bar!"
    },
    {
      setup: "Why did the developer go broke?",
      punchline: "Because they used up all their cache!"
    },
    {
      setup: "How many programmers does it take to change a light bulb?",
      punchline: "None. It's a hardware problem!"
    },
    {
      setup: "Why do Java developers wear glasses?",
      punchline: "Because they don't C#!"
    },
    {
      setup: "What's the object-oriented way to become wealthy?",
      punchline: "Inheritance!"
    },
    {
      setup: "Why did the computer show up at work late?",
      punchline: "It had a hard drive!"
    },
    {
      setup: "What do you call 8 hobbits?",
      punchline: "A hobbyte!"
    }
  ],
  classic: [
    {
      setup: "Why don't scientists trust atoms?",
      punchline: "Because they make up everything!"
    },
    {
      setup: "What do you call a bear with no teeth?",
      punchline: "A gummy bear!"
    },
    {
      setup: "Why couldn't the bicycle stand up by itself?",
      punchline: "It was two tired!"
    },
    {
      setup: "What do you call a fake noodle?",
      punchline: "An impasta!"
    },
    {
      setup: "Why did the scarecrow win an award?",
      punchline: "Because he was outstanding in his field!"
    },
    {
      setup: "What do you call cheese that isn't yours?",
      punchline: "Nacho cheese!"
    }
  ],
  puns: [
    {
      setup: "I used to hate facial hair...",
      punchline: "But then it grew on me!"
    },
    {
      setup: "What do you call a pile of cats?",
      punchline: "A meowtain!"
    },
    {
      setup: "I'm reading a book about anti-gravity.",
      punchline: "It's impossible to put down!"
    },
    {
      setup: "Did you hear about the claustrophobic astronaut?",
      punchline: "He just needed a little space!"
    },
    {
      setup: "I told my wife she was drawing her eyebrows too high.",
      punchline: "She looked surprised!"
    },
    {
      setup: "What do you call a dinosaur with an extensive vocabulary?",
      punchline: "A thesaurus!"
    }
  ],
  dad: [
    {
      setup: "I'm afraid for the calendar.",
      punchline: "Its days are numbered!"
    },
    {
      setup: "Why don't eggs tell jokes?",
      punchline: "They'd crack each other up!"
    },
    {
      setup: "What did the ocean say to the beach?",
      punchline: "Nothing, it just waved!"
    },
    {
      setup: "How do you organize a space party?",
      punchline: "You planet!"
    },
    {
      setup: "What's brown and sticky?",
      punchline: "A stick!"
    },
    {
      setup: "Why did the math book look so sad?",
      punchline: "Because it had too many problems!"
    }
  ],
  programming: [
    {
      setup: "There are 10 types of people in the world.",
      punchline: "Those who understand binary and those who don't!"
    },
    {
      setup: "A SQL query walks into a bar, walks up to two tables and asks...",
      punchline: "Can I join you?"
    },
    {
      setup: "What's the best thing about a Boolean?",
      punchline: "Even if you're wrong, you're only off by a bit!"
    },
    {
      setup: "Why do programmers always mix up Halloween and Christmas?",
      punchline: "Because Oct 31 == Dec 25!"
    },
    {
      setup: "How do you comfort a JavaScript bug?",
      punchline: "You console it!"
    },
    {
      setup: "Why was the JavaScript developer sad?",
      punchline: "Because they didn't Node how to Express themselves!"
    },
    {
      setup: "What's a pirate's favorite programming language?",
      punchline: "You might think it's R, but their first love is the C!"
    }
  ],
  oneliners: [
    {
      setup: "I would tell you a UDP joke, but you might not get it.",
      punchline: ""
    },
    {
      setup: "Debugging: Being the detective in a crime movie where you're also the murderer.",
      punchline: ""
    },
    {
      setup: "In theory, there's no difference between theory and practice. But in practice, there is.",
      punchline: ""
    },
    {
      setup: "Algorithm: A word used by programmers when they don't want to explain what they did.",
      punchline: ""
    },
    {
      setup: "There's no place like 127.0.0.1!",
      punchline: ""
    }
  ]
};

type JokeCategory = keyof typeof jokes;

/**
 * Get a random joke from a specific category or all categories
 */
function getRandomJoke(category?: string): {
  joke: { setup: string; punchline: string };
  category: string;
} {
  const categories = Object.keys(jokes) as JokeCategory[];

  // If category is specified and valid, use it
  if (category && categories.includes(category as JokeCategory)) {
    const categoryJokes = jokes[category as JokeCategory];
    const randomIndex = Math.floor(Math.random() * categoryJokes.length);
    return {
      joke: categoryJokes[randomIndex],
      category
    };
  }

  // Otherwise, pick a random category
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const categoryJokes = jokes[randomCategory];
  const randomIndex = Math.floor(Math.random() * categoryJokes.length);

  return {
    joke: categoryJokes[randomIndex],
    category: randomCategory
  };
}

/**
 * Format joke for display
 */
function formatJoke(setup: string, punchline: string): string {
  if (!punchline) {
    // One-liner format
    return setup;
  }
  return `${setup}\n\n${punchline}`;
}

export const tellJokeTool = tool({
  description: 'Tell a random joke from various categories (tech, classic, puns, dad, programming, oneliners). Use this when users want to hear a joke or need some lighthearted fun.',
  inputSchema: z.object({
    category: z.string().optional().describe('Optional category: tech, classic, puns, dad, programming, or oneliners. If not specified, a random category will be chosen.'),
  }),
  execute: async ({ category }) => {
    try {
      console.log('😄 Tell Joke: Selecting a joke...');

      const { joke, category: selectedCategory } = getRandomJoke(category);
      const formattedJoke = formatJoke(joke.setup, joke.punchline);

      console.log(`   📂 Category: ${selectedCategory}`);

      return {
        joke: formattedJoke,
        category: selectedCategory,
        setup: joke.setup,
        punchline: joke.punchline || null,
        availableCategories: Object.keys(jokes),
        success: true,
      };
    } catch (error) {
      console.error('Error telling joke:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to tell joke',
        success: false,
      };
    }
  },
});
