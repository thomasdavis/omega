# Architecture Documentation

## Overview

This document describes the automated architectural diagram generation system for the Omega project.

## Architecture Diagram

The project includes an automated d2 diagram that visualizes the complete system architecture, including:

- **Monorepo structure** (apps/bot, packages/shared)
- **External services** (Discord, OpenAI, GitHub, Unsandbox, Railway)
- **Core services** (API layer, message handling, artifact server)
- **18+ self-built agent tools** categorized by function
- **Database architecture** (SQLite)
- **Automated features** (daily blog, error monitoring, self-coding loop)
- **Public file structure** and web access patterns

## Viewing the Diagram

### Online

The diagrams are accessible via the public homepage:

- **SVG Format:** https://your-domain.com/architecture.svg
- **PNG Format:** https://your-domain.com/architecture.png
- **Homepage:** https://your-domain.com/ (includes links to both)

### Local Development

1. View the SVG: `open architecture.svg`
2. View the PNG: `open architecture.png`
3. View the source: `cat architecture.d2`

## Generating the Diagram

### Prerequisites

Install d2 diagram tool:

```bash
# macOS
brew install d2

# Linux (using curl)
curl -fsSL https://d2lang.com/install.sh | sh -s --

# Or download from https://github.com/terrastruct/d2/releases
```

### Generate Diagrams

Run the generation script:

```bash
pnpm generate-diagram
```

This will create:
- `architecture.svg` - Scalable vector graphic (recommended for web)
- `architecture.png` - PNG image (for embedding in documents)

Both files are placed in the repository root and automatically served by the public artifact server.

### Automatic Updates

**Important:** The diagram should be regenerated whenever major architectural changes occur:

- New tools are added to the agent
- New services or databases are introduced
- External integrations change
- Project structure is reorganized

**Workflow:**
1. Update `architecture.d2` with new components/connections
2. Run `pnpm generate-diagram`
3. Commit both the `.d2` source and generated `.svg`/`.png` files
4. The changes will be deployed automatically

## d2 Diagram Source

The diagram is defined in `architecture.d2` using the d2 scripting language. This is a human-readable text format that makes architectural changes easy to track in version control.

### Structure

The d2 file is organized into logical sections:

1. **Title** - Project name and description
2. **External Services** - Cloud services and APIs (Discord, OpenAI, GitHub, etc.)
3. **Main Application** - Monorepo structure
   - apps/bot (core application)
   - API layer
   - Core services
   - Agent tools (categorized)
   - Database
   - Public files
4. **Automated Features** - Self-coding, daily blog, error monitoring
5. **User Access** - Discord users and web users
6. **Technology Stack** - Runtime, frameworks, tools
7. **Legend** - Key features

### Editing the Diagram

To modify the architecture:

1. Edit `architecture.d2`
2. Use d2 syntax for shapes, connections, and styling
3. Test locally: `d2 architecture.d2 test-output.svg && open test-output.svg`
4. Generate final diagrams: `pnpm generate-diagram`
5. Commit changes

### d2 Syntax Reference

```d2
# Components
component_name: Display Name {
  shape: cloud | package | person | folder | text
  style.fill: "#hexcolor"
}

# Connections
source -> target: Label

# Nested structures
parent: Parent {
  child: Child Component
}

# Positioning
element: Text {
  near: top-center | bottom-left | etc
}
```

For full syntax, see: https://d2lang.com/tour/intro

## CI/CD Integration

### Current Setup

The diagram generation is currently a manual step. Developers should regenerate diagrams when making architectural changes.

### Future Automation (Optional)

You can automate diagram generation in CI/CD:

**GitHub Actions example:**

```yaml
- name: Generate Architecture Diagram
  run: |
    curl -fsSL https://d2lang.com/install.sh | sh -s --
    pnpm generate-diagram

- name: Commit Diagrams
  run: |
    git config --global user.name "github-actions[bot]"
    git config --global user.email "github-actions[bot]@users.noreply.github.com"
    git add architecture.svg architecture.png
    git diff --quiet || git commit -m "chore: update architecture diagrams"
    git push
```

**Railway deployment:**

The generated SVG/PNG files are automatically deployed with the application since they're in the repository root and served by the artifact server.

## File Locations

```
omega/
├── architecture.d2           # d2 source file
├── architecture.svg          # Generated SVG diagram
├── architecture.png          # Generated PNG diagram
├── ARCHITECTURE.md           # This documentation
└── apps/bot/public/
    └── index.html            # Homepage with diagram links
```

## Maintenance

### When to Update

Update the architecture diagram when:

- ✅ Adding new agent tools
- ✅ Integrating new external services
- ✅ Changing database schema significantly
- ✅ Restructuring the monorepo
- ✅ Adding new automated features
- ✅ Modifying the deployment architecture

### Best Practices

1. **Keep it current** - Regenerate after major changes
2. **Commit source and output** - Include both `.d2` and `.svg`/`.png`
3. **Use clear labels** - Make connections obvious
4. **Group logically** - Organize related components
5. **Version control** - Track changes in git history
6. **Document changes** - Add comments in the `.d2` file

## Troubleshooting

### d2 Command Not Found

```bash
# Install d2
brew install d2  # macOS
# or
curl -fsSL https://d2lang.com/install.sh | sh -s --
```

### Diagram Not Rendering

1. Check d2 syntax: `d2 architecture.d2 test.svg`
2. Look for syntax errors in terminal output
3. Verify file permissions
4. Ensure d2 is in PATH

### Diagram Not Accessible Online

1. Verify files are in repository root
2. Check that artifact server serves root-level files
3. Ensure files are committed and deployed
4. Test URLs: `/architecture.svg` and `/architecture.png`

## Resources

- **d2 Language:** https://d2lang.com
- **d2 GitHub:** https://github.com/terrastruct/d2
- **d2 Playground:** https://play.d2lang.com
- **Examples:** https://d2lang.com/tour/intro

## Contributing

When contributing to the architecture:

1. Update `architecture.d2` with your changes
2. Regenerate diagrams: `pnpm generate-diagram`
3. Test that diagrams render correctly
4. Commit all three files (`.d2`, `.svg`, `.png`)
5. Reference architecture changes in your PR description
