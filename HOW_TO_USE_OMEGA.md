# How To Use Omega: A Practical Guide

> Your friendly guide to interacting with Omega, the self-coding Discord AI agent

---

## What is Omega?

Omega is an AI agent that lives in Discord and can help you with code, content creation, research, visualizations, and much more. Think of it as a highly capable assistant that understands natural language and can execute tasks autonomously.

**Key capabilities:**
- 💻 Write and execute code in 11+ programming languages
- 🎨 Create interactive visualizations, charts, and HTML pages
- 📝 Generate content (blogs, recipes, presentations, poetry)
- 🔍 Research topics and fetch web content
- 🛠️ Build and deploy its own tools and features
- 📊 Create diagrams, maps, and data visualizations

---

## Getting Started

### Where to Talk to Omega

Omega listens in:
- **Direct Messages**: Send a DM to Omega - it will always respond
- **@mentions**: Tag `@Omega` in any channel where it's present
- **#omega channel**: Omega monitors this channel and may respond to conversations (even without being mentioned)

### Basic Interaction

Simply type your request in natural language. Omega will:
1. Understand your intent
2. Show you which tools it's using (as embedded messages)
3. Provide the final result

**Example:**
```
You: "Can you create a chart showing the popularity of programming languages?"

Omega: [Shows tool use: renderChart]
Omega: Here's your chart! [Attaches image]
```

---

## Common Use Cases with Examples

### 1. Code Execution

**What you can do:** Run code in Python, JavaScript, TypeScript, Go, Rust, C++, Java, PHP, Ruby, Gleam, or Elixir.

**Example requests:**
- "Run this Python code and show me the output: `print('Hello, World!')`"
- "Can you write a JavaScript function to find prime numbers and test it?"
- "Execute this Rust code and tell me if it compiles"

**Example conversation:**
```
You: "Write and run a Python script that calculates the Fibonacci sequence up to 100"

Omega: [Uses unsandboxSubmit tool]
Omega: Here's the code I executed:
[Shows code]

Output:
0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89...
```

**Live example:** [See code execution in action](https://github.com/thomasdavis/omega/blob/main/docs/OMEGA_DISSERTATION.md#35-tooling-surface-representative-set)

---

### 2. Creating Interactive Content

**What you can do:** Generate HTML pages, visualizations, and interactive experiences.

**Example requests:**
- "Create an interactive HTML page about the solar system"
- "Build me a simple calculator as an HTML page"
- "Make an interactive timeline of the Roman Empire"

**Example conversation:**
```
You: "Create an interactive todo list as an HTML page"

Omega: [Uses artifact tool]
Omega: I've created your interactive todo list! View it here:
https://your-omega-url.railway.app/artifacts/abc-123-def
```

**What you'll get:** A fully functional, shareable web page with your requested content.

---

### 3. Data Visualization

**What you can do:** Create charts, graphs, ASCII art, diagrams, and maps.

**Example requests:**
- "Create a bar chart comparing GDP of top 5 countries"
- "Draw an ASCII map of a fantasy dungeon"
- "Make a line chart showing temperature trends"
- "Create a conversation flow diagram of our chat"

**Example conversation:**
```
You: "Create a pie chart showing market share: Apple 30%, Samsung 25%, Xiaomi 15%, Others 30%"

Omega: [Uses renderChart tool]
Omega: Here's your pie chart! [Attaches PNG image]
```

---

### 4. Content Generation

**What you can do:** Generate blog posts, recipes, poetry, presentations, and more.

**Example requests:**
- "Write a blog post about quantum computing for beginners"
- "Create a recipe for chocolate chip cookies"
- "Generate a haiku about artificial intelligence"
- "Build a presentation about climate change"

**Example conversation:**
```
You: "Create a recipe for homemade pizza"

Omega: [Uses recipeGenerator tool]
Omega: Here's your homemade pizza recipe!

**Ingredients:**
- 2 cups flour
- 1 cup warm water
...

**Instructions:**
1. Mix flour and yeast...
```

---

### 5. Research and Information

**What you can do:** Fetch web pages, search for information, and analyze content.

**Example requests:**
- "What's on the front page of Hacker News right now?"
- "Fetch the content from this URL and summarize it: [URL]"
- "Research the latest developments in AI and write a summary"

**Example conversation:**
```
You: "What are the top stories on Hacker News right now?"

Omega: [Uses hackerNewsPhilosophy tool]
Omega: Here are today's top Hacker News stories:

1. "New JavaScript Framework..." (245 points)
2. "Why SQLite is faster than..." (189 points)
...
```

---

### 6. File Uploads and Exports

**What you can do:** Upload files, export conversations, and work with documents.

**Example requests:**
- "Export our entire conversation as a file"
- "List all my previously created artifacts"
- "Upload this [attached file] for me"

**Example conversation:**
```
You: "Export our conversation from the last hour"

Omega: [Uses exportConversation tool]
Omega: I've created an export! Download it here:
https://your-omega-url.railway.app/uploads/conversation-abc123.json
```

---

### 7. Self-Improvement

**What you can do:** Ask Omega to create new tools or fix bugs in itself.

**Example requests:**
- "Create a new tool that can generate crossword puzzles"
- "Fix the bug in your chart rendering tool"
- "Add a feature to convert CSV data to charts"

**Example conversation:**
```
You: "Can you add a tool that tells dad jokes?"

Omega: [Uses githubCreateIssue tool]
Omega: I've created an issue to track this feature request:
https://github.com/thomasdavis/omega/issues/42

I can implement this now if you'd like!
```

**This is what makes Omega special:** It can literally modify its own code and deploy improvements autonomously.

---

## Advanced Features

### Presentations with Slidev

Create beautiful presentations directly in Discord:

```
You: "Create a Slidev presentation about the history of computers"

Omega: [Uses buildSlidevPresentation tool]
Omega: I've created your presentation! View it here:
https://your-omega-url.railway.app/artifacts/presentation-xyz/
```

### Comic Generation

Generate multi-panel comics with AI:

```
You: "Create a 4-panel comic about a programmer debugging code at 3am"

Omega: [Uses generateComic tool]
Omega: Here's your comic! [Shows images]
```

### Database Queries

Query the internal database:

```
You: "Show me statistics about artifacts created in the last week"

Omega: [Uses queryDatabase tool]
Omega: In the last 7 days:
- 45 artifacts created
- 12 blog posts generated
- 8 code executions
```

### ASCII Art and Diagrams

Create text-based visualizations:

```
You: "Draw an ASCII graph of y=x²"

Omega: [Uses asciiGraph tool]
Omega: [Shows ASCII art graph]
```

---

## Tips for Best Results

### 1. Be Specific

**Instead of:** "Make something cool"
**Try:** "Create an interactive periodic table as an HTML page"

### 2. Provide Context

**Instead of:** "Fix that bug"
**Try:** "Fix the bug in the chart rendering where labels are cut off"

### 3. Break Down Complex Tasks

**Instead of:** "Build me a complete web app"
**Try:** "First, create an HTML login form. Then we'll add authentication."

### 4. Attach Files When Relevant

If you have data, images, or code files, attach them to your message for Omega to analyze.

### 5. Review Tool Usage

Omega shows you which tools it's using. If something seems off, you can ask it to use a different approach.

---

## Understanding Omega's Responses

### Tool Transparency

Omega always shows you what tools it's using before the final response:

```
[Embed: Tool Use - renderChart]
Arguments: { type: "bar", data: [...] }
Result: Chart generated successfully
```

This helps you understand what Omega is doing behind the scenes.

### Artifacts

Many outputs are saved as "artifacts" - permanent, shareable links:

- **HTML pages**: Interactive content you can share
- **Charts**: Downloadable images
- **Code outputs**: Execution results
- **Files**: Uploads and exports

Access artifacts via the URL provided in Omega's response.

---

## Real-World Example Conversations

### Example 1: Learning Project

```
You: "I'm learning React. Can you create a simple counter component and explain how it works?"

Omega: [Uses artifact tool]
Omega: I've created an interactive React counter for you!

View it here: https://[...]/artifacts/counter-demo

Here's how it works:
1. useState hook manages the count state
2. Button onClick increments the counter
3. The component re-renders when state changes

Try clicking the button in the live demo!
```

### Example 2: Data Analysis

```
You: "I have sales data: Jan=100, Feb=150, Mar=200, Apr=175. Create a chart and tell me the trend."

Omega: [Uses renderChart tool]
Omega: I've created a line chart showing your sales data. [Attaches chart]

Analysis:
- Strong growth from Jan to Mar (+100%)
- Slight decline in Apr (-12.5%)
- Overall trend: Positive
- Recommendation: Investigate Apr decline
```

### Example 3: Content Creation Workflow

```
You: "Write a blog post about TypeScript benefits, then create a presentation summarizing the key points"

Omega: [Uses createBlogPost tool]
Omega: Blog post created! Read it here: https://[...]/blog/typescript-benefits

[Uses buildSlidevPresentation tool]
Omega: Presentation ready! View it here: https://[...]/presentations/typescript-slides

I've created both a detailed blog post and a 10-slide presentation covering:
- Type safety advantages
- Developer experience improvements
- Common use cases
- Migration strategies
```

---

## What Omega Can't Do (Yet)

To set proper expectations:

- ❌ Can't access private repositories or files outside its workspace
- ❌ Can't make external API calls without proper authentication
- ❌ Won't share secrets or sensitive information
- ❌ Limited to Discord's file size limits for uploads (8MB)
- ❌ Can't execute code that requires GUI or system-level access

---

## Getting Help

### Ask Omega Directly

```
You: "What tools do you have available?"
Omega: [Uses getOmegaManifest tool]
Omega: I have 25+ tools including: artifact, renderChart, webFetch, ...
```

### Check Tool Descriptions

```
You: "What does the artifact tool do?"
Omega: [Uses inspectTool tool]
Omega: The artifact tool generates and previews HTML, SVG, and Markdown content...
```

### Report Issues

If something doesn't work:

```
You: "The chart tool is broken - it's not showing labels correctly"
Omega: Let me create an issue to track this bug...
[Uses githubCreateIssue tool]
```

---

## Example Projects You Can Build

### 1. Personal Dashboard
"Create an HTML dashboard showing today's date, a motivational quote, and a to-do list"

### 2. Learning Resource
"Build an interactive tutorial about SQL joins with examples and a quiz"

### 3. Data Visualization Suite
"Create a series of charts showing climate data: temperature, CO2, sea levels"

### 4. Content Hub
"Write a blog post about machine learning, create a presentation about it, and generate a haiku summarizing the key concept"

### 5. Game Prototype
"Build a simple number guessing game as an HTML page with score tracking"

---

## Community Examples

Here are some real examples from the Omega community:

### Comic Generation
Users have created multi-panel comics about:
- Programming bugs
- Daily life situations
- Historical events
- Scientific concepts

**Try it:** "Create a 3-panel comic about the invention of the lightbulb"

### Recipe Collection
Popular requests:
- Cultural dishes from around the world
- Dietary-specific recipes (vegan, keto, etc.)
- Baking tutorials
- Cocktail recipes

**Try it:** "Generate a vegan lasagna recipe with nutritional information"

### Educational Content
Teachers and students use Omega for:
- Presentation creation
- Concept diagrams
- Study guides
- Interactive quizzes

**Try it:** "Create a Slidev presentation explaining photosynthesis for high school students"

### Developer Tools
Developers use Omega for:
- Code snippet generation
- Algorithm visualization
- Documentation creation
- Bug hunting

**Try it:** "Create a visual diagram explaining how a binary search tree works"

---

## Pro Tips

### 1. Chain Requests

You can ask Omega to do multiple things in sequence:
```
"First create a bar chart of Q1 sales, then write a blog post analyzing the trends, then create a presentation summarizing both"
```

### 2. Iterate and Refine

Don't like the first result? Ask for modifications:
```
You: "Make the chart bigger and change colors to blue"
Omega: [Regenerates with your preferences]
```

### 3. Save Your Work

Ask Omega to export conversations or artifacts you want to keep:
```
"Export our entire conversation about React hooks"
```

### 4. Explore Tools

Ask Omega to show you what it can do:
```
"Show me a list of all your available tools"
"What creative things can you make?"
```

---

## Frequently Asked Questions

### Q: How do I know if Omega is working?
**A:** Omega will show typing indicators and tool usage embeds. If nothing happens after 30 seconds, try rephrasing your request.

### Q: Can I use Omega for homework/work projects?
**A:** Yes! Omega is great for learning, prototyping, and content creation. Always verify outputs for accuracy.

### Q: Are my conversations private?
**A:** Direct messages are only visible to you and Omega. Channel messages are visible to all channel members.

### Q: Can Omega remember previous conversations?
**A:** Yes! Omega has access to recent message history (last 20 messages) for context.

### Q: What happens to my artifacts?
**A:** Artifacts are stored on Omega's server and accessible via their unique URLs. They persist until manually deleted.

### Q: Can I delete something Omega created?
**A:** Ask Omega: "Delete the artifact with ID xyz" or "Remove that file you uploaded"

### Q: Is there a limit to how much I can use Omega?
**A:** Be reasonable! Omega uses AI services that cost money. Occasional heavy use is fine, but don't spam or abuse the system.

---

## Quick Reference

### Most Used Commands

| Request | What It Does |
|---------|-------------|
| "Create a [type] chart with [data]" | Generates and returns a chart image |
| "Build an HTML page about [topic]" | Creates an interactive web page |
| "Run this code: [code]" | Executes code and shows output |
| "Write a blog post about [topic]" | Generates a blog article |
| "Export our conversation" | Saves the conversation as a file |
| "Create a recipe for [dish]" | Generates a detailed recipe |
| "Make a presentation about [topic]" | Creates a Slidev presentation |
| "Draw an ASCII [type]" | Creates ASCII art/diagrams |

---

## Next Steps

Ready to get started? Try these beginner-friendly requests:

1. **Test the basics:** "Tell me a joke about programming"
2. **Create something visual:** "Create a bar chart showing days of the week"
3. **Build something interactive:** "Make a simple HTML calculator"
4. **Learn something new:** "Create a presentation about black holes"
5. **Execute some code:** "Run a Python script that prints the first 10 prime numbers"

**Remember:** Omega is designed to be helpful and transparent. Don't be afraid to experiment, ask questions, and iterate on results!

---

## Additional Resources

- **Technical Documentation:** [`docs/OMEGA_DISSERTATION.md`](docs/OMEGA_DISSERTATION.md)
- **Deployment Guide:** [`self-docs/how-i-can-be-deployed.md`](self-docs/how-i-can-be-deployed.md)
- **Architecture Overview:** [`ARCHITECTURE_PLAN.md`](ARCHITECTURE_PLAN.md)
- **GitHub Repository:** [thomasdavis/omega](https://github.com/thomasdavis/omega)
- **Report Issues:** [GitHub Issues](https://github.com/thomasdavis/omega/issues)

---

**Happy creating with Omega! 🚀**

*This guide is maintained by the Omega community. Last updated: December 2025*
