/**
 * PPTX Generator Utility
 * Converts Slidev markdown presentations to PowerPoint format
 */

import PptxGenJS from 'pptxgenjs';

interface SlidevSlide {
  layout?: string;
  title?: string;
  content: string[];
  rawContent: string;
}

interface PptxGeneratorOptions {
  title: string;
  author?: string;
  subject?: string;
}

/**
 * Parse Slidev markdown into structured slides
 */
export function parseSlidevMarkdown(markdown: string): SlidevSlide[] {
  const slides: SlidevSlide[] = [];

  // Split by slide separator (---)
  const slideBlocks = markdown.split(/\n---\n/);

  for (const block of slideBlocks) {
    if (!block.trim()) continue;

    // Skip frontmatter (first block if it starts with ---)
    if (block.trim().startsWith('---')) continue;

    const slide: SlidevSlide = {
      content: [],
      rawContent: block,
    };

    // Extract layout directive (e.g., layout: quote)
    const layoutMatch = block.match(/^layout:\s*(\w+)/m);
    if (layoutMatch) {
      slide.layout = layoutMatch[1];
    }

    // Extract title (first # heading)
    const titleMatch = block.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      slide.title = titleMatch[1].replace(/[@#*_`]/g, '').trim();
    }

    // Extract content lines
    const lines = block.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines, frontmatter, and layout directives
      if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('layout:') ||
          trimmed.startsWith('theme:') || trimmed.startsWith('background:') ||
          trimmed.startsWith('class:') || trimmed.startsWith('highlighter:') ||
          trimmed.startsWith('info:') || trimmed.startsWith('drawings:') ||
          trimmed.startsWith('transition:') || trimmed.startsWith('title:') ||
          trimmed.startsWith('mdc:') || trimmed.startsWith('lineNumbers:')) {
        continue;
      }

      // Skip HTML tags and div blocks
      if (trimmed.startsWith('<') || trimmed.startsWith('</')) {
        continue;
      }

      // Clean markdown formatting for PowerPoint
      let cleaned = trimmed
        .replace(/^#+\s+/, '') // Remove heading markers
        .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers
        .replace(/\*(.+?)\*/g, '$1') // Remove italic markers
        .replace(/`(.+?)`/g, '$1') // Remove code markers
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
        .replace(/^[@>-]\s*/, ''); // Remove list markers and blockquotes

      if (cleaned) {
        slide.content.push(cleaned);
      }
    }

    slides.push(slide);
  }

  return slides;
}

/**
 * Generate PPTX from Slidev markdown
 */
export function generatePptxFromSlidev(
  markdown: string,
  options: PptxGeneratorOptions
): PptxGenJS {
  const pptx = new PptxGenJS();

  // Set presentation properties
  pptx.author = options.author || 'Omega Discord Bot';
  pptx.title = options.title;
  pptx.subject = options.subject || 'Discord Conversation Presentation';

  // Define master slide layout
  pptx.defineLayout({ name: 'CUSTOM', width: 10, height: 5.625 });
  pptx.layout = 'CUSTOM';

  // Parse slides
  const slides = parseSlidevMarkdown(markdown);

  for (const slideData of slides) {
    const slide = pptx.addSlide();

    // Determine slide layout based on Slidev layout
    if (slideData.layout === 'end' || slideData.title?.toLowerCase().includes('thank you')) {
      // End slide - centered text
      if (slideData.title) {
        slide.addText(slideData.title, {
          x: 0.5,
          y: 2,
          w: 9,
          h: 1.5,
          fontSize: 44,
          bold: true,
          align: 'center',
          color: '363636',
        });
      }

      if (slideData.content.length > 0) {
        slide.addText(slideData.content.join('\n'), {
          x: 1,
          y: 3.5,
          w: 8,
          h: 1,
          fontSize: 16,
          align: 'center',
          color: '666666',
        });
      }
    } else if (slideData.layout === 'quote' || slideData.content.length > 5) {
      // Quote layout or long content - more compact
      if (slideData.title) {
        slide.addText(slideData.title, {
          x: 0.5,
          y: 0.3,
          w: 9,
          h: 0.6,
          fontSize: 32,
          bold: true,
          color: '363636',
        });
      }

      if (slideData.content.length > 0) {
        const contentText = slideData.content.join('\n\n');
        slide.addText(contentText, {
          x: 0.7,
          y: slideData.title ? 1.2 : 0.5,
          w: 8.6,
          h: slideData.title ? 4 : 4.7,
          fontSize: 14,
          color: '444444',
          valign: 'top',
        });
      }
    } else {
      // Default layout - title slide or content slide
      const isTitleSlide = slideData.rawContent.includes('class: text-center') ||
                          !slideData.layout && slideData.content.length <= 2;

      if (isTitleSlide) {
        // Title slide - centered, large text
        if (slideData.title) {
          slide.addText(slideData.title, {
            x: 0.5,
            y: 1.5,
            w: 9,
            h: 1.5,
            fontSize: 48,
            bold: true,
            align: 'center',
            color: '363636',
          });
        }

        if (slideData.content.length > 0) {
          slide.addText(slideData.content.join('\n'), {
            x: 1,
            y: 3.2,
            w: 8,
            h: 1.5,
            fontSize: 20,
            align: 'center',
            color: '666666',
          });
        }
      } else {
        // Content slide - title + content
        if (slideData.title) {
          slide.addText(slideData.title, {
            x: 0.5,
            y: 0.3,
            w: 9,
            h: 0.7,
            fontSize: 36,
            bold: true,
            color: '363636',
          });
        }

        if (slideData.content.length > 0) {
          const contentText = slideData.content.join('\n\n');
          slide.addText(contentText, {
            x: 0.7,
            y: slideData.title ? 1.3 : 0.5,
            w: 8.6,
            h: slideData.title ? 3.8 : 4.5,
            fontSize: 18,
            color: '444444',
            valign: 'top',
          });
        }
      }
    }

    // Add footer with page number (except first slide)
    if (slides.indexOf(slideData) > 0) {
      slide.addText(`${slides.indexOf(slideData) + 1}`, {
        x: 9.3,
        y: 5.2,
        w: 0.5,
        h: 0.3,
        fontSize: 10,
        color: 'AAAAAA',
        align: 'right',
      });
    }
  }

  return pptx;
}

/**
 * Generate PPTX buffer from Slidev markdown
 */
export async function generatePptxBuffer(
  markdown: string,
  options: PptxGeneratorOptions
): Promise<Buffer> {
  const pptx = generatePptxFromSlidev(markdown, options);

  // Generate as buffer (stream: 'nodebuffer' returns a Promise<Buffer>)
  const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;

  return buffer;
}
