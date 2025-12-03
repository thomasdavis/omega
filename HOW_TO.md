# How to Use Omega - Complete Guide with Examples

This guide shows you how to interact with Omega and leverage its 50+ specialized tools. Each section includes real examples you can try.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Code Execution](#code-execution)
3. [Content Creation](#content-creation)
4. [Image Generation](#image-generation)
5. [Research & Web](#research--web)
6. [GitHub Integration](#github-integration)
7. [Blog Publishing](#blog-publishing)
8. [Collaboration](#collaboration)
9. [Data & Visualization](#data--visualization)
10. [Self-Improvement](#self-improvement)
11. [Advanced Features](#advanced-features)

---

## Getting Started

### How to Interact with Omega

Omega responds to messages in several ways:

**1. Direct Messages (DMs)**
```
(In DM to @omega)
Hello! Can you help me with Python?
```
→ Omega always responds to DMs

**2. Mentions**
```
(In any channel)
@omega what can you do?
```
→ Omega always responds to mentions

**3. Replies**
```
(Reply to Omega's message)
Can you explain that in more detail?
```
→ Omega always responds to replies

**4. Contextual Chat**
```
(In active conversation)
That's interesting, tell me more
```
→ Omega uses AI to decide if it should respond based on context

### Understanding Omega's Responses

Omega provides two types of messages:

**1. Tool Execution Reports** (if tools are used)
```
🔧 Tool 1/2: unsandbox

Arguments:
{
  "language": "python",
  "code": "print('Hello, World!')"
}

Result:
Hello, World!
```

**2. Natural Language Response**
```
I've executed your Python code! It printed "Hello, World!" successfully.
```

---

## Code Execution

Omega can execute code in 42+ programming languages using the `unsandbox` tool.

### Supported Languages

Python, JavaScript, TypeScript, Node.js, Ruby, Go, Rust, Java, C++, C, C#, PHP, Swift, Kotlin, Scala, R, Julia, Perl, Lua, Bash, Shell, PowerShell, SQL, and 20+ more.

### Examples

**Python - Data Analysis**
```
@omega execute this Python code:
import statistics
data = [23, 45, 67, 23, 89, 12, 45, 67]
print(f"Mean: {statistics.mean(data)}")
print(f"Median: {statistics.median(data)}")
print(f"Mode: {statistics.mode(data)}")
```

**JavaScript - API Call**
```
@omega run this JavaScript:
const data = await fetch('https://api.github.com/repos/nodejs/node')
  .then(r => r.json());
console.log(`Stars: ${data.stargazers_count}`);
console.log(`Forks: ${data.forks_count}`);
```

**Rust - Performance Code**
```
@omega execute this Rust code:
fn fibonacci(n: u32) -> u32 {
    match n {
        0 => 0,
        1 => 1,
        _ => fibonacci(n - 1) + fibonacci(n - 2)
    }
}

fn main() {
    println!("Fibonacci(10) = {}", fibonacci(10));
}
```

**Go - Concurrent Processing**
```
@omega run this Go code:
package main
import (
    "fmt"
    "time"
)

func main() {
    ch := make(chan string)

    go func() {
        time.Sleep(1 * time.Second)
        ch <- "Hello from goroutine!"
    }()

    msg := <-ch
    fmt.Println(msg)
}
```

### Network Access

By default, code runs in "zerotrust" mode (no network). Request "semitrust" for network access:

```
@omega execute this Python code with network access:
import requests
response = requests.get('https://api.github.com/zen')
print(response.text)
```

---

## Content Creation

### Interactive HTML Artifacts

Generate shareable, interactive HTML pages with the `artifact` tool.

**Calculator Example**
```
@omega create an interactive calculator with HTML, CSS, and JavaScript
```

**Color Picker**
```
@omega make a color picker that shows RGB and HEX values
```

**Data Visualization**
```
@omega create an interactive chart showing this data:
Sales: Jan=1200, Feb=1800, Mar=2400, Apr=2100
```

**Game**
```
@omega create a simple tic-tac-toe game in HTML
```

Each artifact gets a unique URL like:
```
https://your-domain.com/artifacts/abc-def-ghi
```

You can view all artifacts at:
```
https://your-domain.com/artifacts
```

### SVG Graphics

**Logo Design**
```
@omega create an SVG logo with a mountain and sun
```

**Diagram**
```
@omega create an SVG diagram showing the flow:
User → Frontend → API → Database → Response
```

### Complete HTML Pages

```
@omega create a landing page for a coffee shop with:
- Hero section with background image
- Menu items grid
- Contact form
- Modern CSS styling
```

---

## Image Generation

Omega uses DALL-E 3 for high-quality image generation.

### Basic Image Generation

**Landscapes**
```
@omega generate an image of a futuristic city at sunset with flying cars
```

**Characters**
```
@omega create an image of a friendly robot teaching programming to children
```

**Abstract Art**
```
@omega generate abstract art representing the concept of artificial intelligence
```

**Logos**
```
@omega create a minimalist logo for a tech startup called "CloudSync"
```

### Image Sizes

Specify size if needed:
- 1024x1024 (default, square)
- 1792x1024 (wide)
- 1024x1792 (tall)

```
@omega generate a wide panoramic image (1792x1024) of a mountain landscape
```

### Image Editing

```
@omega edit this image to add a blue sky
[attach image]
```

---

## Research & Web

### Web Search

```
@omega search for the latest AI safety research from 2024
```

```
@omega what are the current trends in quantum computing?
```

### Web Scraping (robots.txt compliant)

**Fetch and Summarize**
```
@omega fetch this article and summarize the key points:
https://example.com/article
```

**Extract Data**
```
@omega fetch this page and extract all the pricing information:
https://example.com/pricing
```

**Compare Sources**
```
@omega compare these two articles:
https://source1.com/article
https://source2.com/article
```

### Research Essays

```
@omega write a comprehensive research essay on:
"The impact of large language models on software development"
Include recent sources and citations.
```

### Hacker News Philosophy

```
@omega get philosophical content from Hacker News
```

This tool curates thought-provoking discussions from HN's philosophy tag.

---

## GitHub Integration

Omega can interact with GitHub repositories directly.

### Create Issues

**Bug Report**
```
@omega create a GitHub issue:
Title: Calculator tool returns incorrect results for decimals
Description: When using the calculator tool with decimal numbers,
the results are sometimes off by small amounts. Need to investigate
floating-point precision handling.
Labels: bug
```

**Feature Request**
```
@omega file an enhancement request:
Add support for speech-to-text in voice channels
```

### Update Issues

```
@omega update issue #42:
Add comment: I've investigated this and found the root cause in the
parser. Will have a fix ready soon.
```

```
@omega close issue #123 as completed
```

### Merge Pull Requests

```
@omega merge PR #45
```

### Browse Repository

```
@omega list files in src/agent/tools/
```

### Commit Files

```
@omega commit this file to the repository:
[file content or attachment]
Path: src/new-feature.ts
Message: Add new feature for X
```

---

## Blog Publishing

Omega can create and manage TTS-enabled blog posts.

### Create Blog Post

**Simple Blog Post**
```
@omega create a blog post about:
"10 Tips for Writing Clean TypeScript Code"
```

**Technical Tutorial**
```
@omega write a blog post tutorial:
"Building a REST API with Node.js and Express"
Include code examples and explanations.
```

**Opinion Piece**
```
@omega write a blog post with my thoughts on:
The future of AI in software development
[your thoughts here]
```

### Blog Features

- **TTS Audio**: Each blog post gets text-to-speech audio
- **Voice Selection**: Random voice from 6 options
- **Markdown Format**: YAML frontmatter + markdown content
- **Web Gallery**: View all posts at `/blog`

### Update Blog Post

```
@omega update my blog post from yesterday:
Add a section about error handling
```

### List Blog Posts

```
@omega list all blog posts
```

### Daily Automated Blog

Omega automatically generates a daily blog post at 9 AM UTC combining:
- Philosophical content from Hacker News
- Market predictions and analysis
- Current tech trends

```
@omega trigger the daily blog now
```

---

## Collaboration

### Real-Time Collaborative Documents

Create Google Docs-style collaborative documents using Yjs CRDT.

**Create Document**
```
@omega create a live collaborative document for our meeting notes
```

**Meeting Agenda**
```
@omega create a live document with this template:
# Team Meeting - [Date]
## Attendees
## Agenda Items
## Action Items
## Next Steps
```

**Project Planning**
```
@omega create a collaborative document for planning the Q1 roadmap
```

Each document gets a unique URL that multiple users can edit simultaneously:
```
https://your-domain.com/documents/abc-def-ghi
```

### Read Document

```
@omega show me the content of document abc-def-ghi
```

### Conversation Export

**Export Chat History**
```
@omega export our conversation from the last week to Markdown
```

**Export Specific Date Range**
```
@omega export all messages from December 1-3 to a Markdown file
```

The exported file includes:
- Timestamps
- User names
- Message content
- Tool usage
- Professional formatting

---

## Data & Visualization

### Professional Charts

**Bar Chart**
```
@omega create a bar chart showing:
Product A: 1200 units
Product B: 1800 units
Product C: 900 units
Product D: 2100 units
```

**Line Chart**
```
@omega create a line chart of monthly revenue:
Jan: $50k, Feb: $65k, Mar: $78k, Apr: $82k, May: $95k
```

**Pie Chart**
```
@omega make a pie chart of our traffic sources:
Organic: 45%, Social: 25%, Direct: 20%, Referral: 10%
```

**Scatter Plot**
```
@omega create a scatter plot showing the relationship between
study hours and test scores from this data:
[data points]
```

### ASCII Art Graphs

For text-based visualizations:

```
@omega create an ASCII graph of this data:
Week 1: 100, Week 2: 150, Week 3: 120, Week 4: 180
```

### Market Predictions

```
@omega predict market trends for tech stocks this quarter
```

### Weather Information

```
@omega what's the weather in San Francisco?
```

### Calculator

```
@omega calculate: (123 + 456) * 789 / 234
```

### Recipe Generator

```
@omega generate a vegetarian recipe for 4 people using:
- pasta
- tomatoes
- basil
- garlic
```

---

## Self-Improvement

Omega can improve itself by creating GitHub issues that Claude Code automatically implements.

### Request New Features

**New Tool**
```
@omega create a feature request:
Add a tool that converts Markdown to PDF
```

**Enhancement**
```
@omega file an enhancement:
Improve the image generation tool to support batch generation
```

**Performance Improvement**
```
@omega create an issue:
Optimize the message history query to be faster
```

### Workflow

```
1. You request feature
   ↓
2. Omega creates GitHub issue
   ↓
3. Claude Code sees issue (via @claude mention)
   ↓
4. Claude implements feature
   ↓
5. Auto-creates PR
   ↓
6. CI checks pass
   ↓
7. Auto-merge to main
   ↓
8. Auto-deploy to Railway
   ↓
9. Omega restarts with new feature (2-5 minutes total)
```

### Check Implementation Status

```
@omega what's the status of issue #123?
```

---

## Advanced Features

### Message History Search

Query your conversation history with natural language:

```
@omega find all messages about Python code from last week
```

```
@omega show me when we discussed the database schema
```

```
@omega what tools did I use yesterday?
```

### Codebase Search

```
@omega search the codebase for the implementation of the artifact tool
```

```
@omega how does the webFetch tool work?
```

### Tool Introspection

```
@omega inspect the implementation of the githubCreateIssue tool
```

```
@omega explain how the unsandbox tool executes code
```

### Bot Capabilities

```
@omega whoami
```

Returns complete information about Omega's capabilities, tools, and configuration.

### OODA Loop Analysis

Use military decision-making framework:

```
@omega use OODA loop to analyze this problem:
Should we migrate from SQLite to PostgreSQL?
```

The OODA loop provides:
- **Observe**: Current situation analysis
- **Orient**: Context and constraints
- **Decide**: Options and recommendations
- **Act**: Specific action plan

### Introspect Feelings

```
@omega introspect your feelings
```

Shows Omega's current "emotional state" and performance metrics.

### Sentiment Analysis

```
@omega analyze the sentiment of this text:
[your text here]
```

### File Management

**Upload File**
```
@omega host this file permanently
[attach file, max 25MB]
```

**List Files**
```
@omega list all uploaded files
```

**Download File**
```
@omega give me the download URL for file abc-def.pdf
```

### Presentations

**Convert Conversation to Slides**
```
@omega convert our discussion about TypeScript best practices into a Slidev presentation
```

**Create Presentation**
```
@omega create a presentation about:
"Introduction to Microservices Architecture"
```

Generates a Markdown-based presentation that's converted to HTML using Slidev.

### Translation

```
@omega translate this to Spanish:
[English text]
```

### Jokes

```
@omega tell me a programming joke
```

### Linux Advantages

```
@omega tell me about the advantages of Linux
```

Educational content about Linux and open source.

---

## Tips & Best Practices

### Getting Better Results

**Be Specific**
```
Bad:  @omega make a chart
Good: @omega create a bar chart showing monthly sales for Q1 2024:
      January: $50k, February: $65k, March: $78k
```

**Provide Context**
```
Bad:  @omega fix the bug
Good: @omega there's a bug in the calculator tool where it returns
      NaN for division by zero. Can you add error handling?
```

**Use Examples**
```
Bad:  @omega create a form
Good: @omega create an HTML form with:
      - Name field (text)
      - Email field (email validation)
      - Message field (textarea)
      - Submit button
      - Modern CSS styling
```

### Multi-Step Tasks

Omega can handle complex tasks that require multiple tools:

```
@omega research the top 5 JavaScript frameworks, then create a comparison
chart showing their GitHub stars, and write a blog post with your analysis
```

This will:
1. Use `webFetch` to research frameworks
2. Use `renderChart` to create visualization
3. Use `createBlogPost` to publish analysis

### Understanding Tool Usage

When Omega uses tools, it reports:
- **Tool name**: What capability was used
- **Arguments**: What inputs were provided
- **Result**: What output was generated

This transparency helps you:
- Understand how Omega works
- Verify the information is accurate
- Learn which tools are available
- Reproduce results

### Rate Limits & Costs

Be aware of:
- **Code execution**: Free tier = 1000 executions/month
- **Image generation**: Each DALL-E 3 image costs ~$0.04-0.08
- **API calls**: Some tools use external APIs with limits

Omega will inform you if it hits rate limits.

---

## Example Workflows

### Software Development

```
1. @omega search for best practices in REST API design
2. @omega execute this Python code to test the API endpoint: [code]
3. @omega create a GitHub issue: Add authentication to API endpoints
4. @omega create a live document for API documentation
5. @omega export our conversation about the API to Markdown
```

### Content Creation

```
1. @omega research current trends in web development
2. @omega generate an image for a blog post header about web dev
3. @omega write a blog post: "Web Development Trends in 2024"
4. @omega create a Slidev presentation from the blog post
5. @omega share the blog post and presentation URLs
```

### Data Analysis

```
1. @omega execute this Python code to analyze the CSV data: [code]
2. @omega create a line chart showing the trend over time
3. @omega create a bar chart comparing categories
4. @omega write a summary of the key findings
5. @omega create a collaborative document with the full analysis
```

### Project Planning

```
1. @omega create a live document for Q1 planning
2. @omega use OODA loop to analyze our product strategy
3. @omega create a presentation for stakeholders
4. @omega generate a project timeline chart
5. @omega create GitHub issues for each major initiative
```

---

## Getting Help

### Ask Omega

```
@omega what tools do you have for image generation?
```

```
@omega how do I create a collaborative document?
```

```
@omega show me examples of code execution
```

### Check Documentation

- This guide: `HOW_TO.md`
- Architecture: `ARCHITECTURE.md`
- Complete flow: `OMEGA_FLOW.md`
- System summary: `OMEGA_COMPREHENSIVE_SUMMARY.md`

### Report Issues

```
@omega create an issue: [describe the problem]
```

Or manually create an issue on GitHub.

### Request Features

```
@omega I need a tool that can [describe feature]
Can you create a feature request?
```

---

## Frequently Asked Questions

**Q: How do I know if Omega will respond to my message?**
A: Omega always responds to DMs, mentions, and replies. For other messages, it uses AI to decide based on context.

**Q: Can I use Omega for production code?**
A: Omega is great for prototyping and testing, but always review generated code before using in production.

**Q: Is my data private?**
A: All interactions are logged to Omega's database for context and search. Don't share sensitive information.

**Q: How long does code execution take?**
A: Usually 5-30 seconds depending on complexity. Network requests may take longer.

**Q: Can Omega access external websites?**
A: Yes, but it respects robots.txt and ethical scraping practices.

**Q: What's the file upload limit?**
A: 25MB per file.

**Q: How often is the daily blog posted?**
A: Automatically at 9 AM UTC daily.

**Q: Can I run Omega on my own server?**
A: Yes! See README.md and SETUP.md for installation instructions.

**Q: How much does it cost to run Omega?**
A: Approximately $10-20/month (Railway + OpenAI + other services).

**Q: Can Omega make mistakes?**
A: Yes, AI can make errors. Always verify important information and review generated code.

---

## Example Links & Resources

### Live Examples

Here are some example URLs to explore (replace with your actual domain):

**Artifacts Gallery**
```
https://your-domain.com/artifacts
```

**Blog Posts**
```
https://your-domain.com/blog
```

**Collaborative Documents**
```
https://your-domain.com/documents
```

**Uploaded Files**
```
https://your-domain.com/uploads
```

**Comics (if enabled)**
```
https://your-domain.com/comics
```

### Community Resources

- **GitHub Repository**: https://github.com/thomasdavis/omega
- **Discord Community**: [Link provided by administrator]
- **Issue Tracker**: https://github.com/thomasdavis/omega/issues

---

## Conclusion

Omega is a powerful, versatile AI assistant with 50+ specialized tools. This guide covered the main capabilities, but there's always more to explore.

**Key Takeaways:**
- Start simple and experiment
- Be specific in your requests
- Review tool execution reports
- Use multi-step reasoning for complex tasks
- Leverage the self-improvement workflow
- Check documentation for details

**Ready to Start?**

Try these beginner-friendly commands:
```
@omega whoami
@omega tell me a joke
@omega calculate 123 * 456
@omega execute this Python code: print("Hello, Omega!")
```

Then explore the advanced features as you get comfortable!

---

*For technical details, see [OMEGA_COMPREHENSIVE_SUMMARY.md](./OMEGA_COMPREHENSIVE_SUMMARY.md)*
*For architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md)*
*For setup, see [README.md](./README.md)*
