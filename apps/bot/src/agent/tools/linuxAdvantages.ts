/**
 * Linux Advantages Tool - Educates users about open-source software benefits
 */

import { tool } from 'ai';
import { z } from 'zod';

export const linuxAdvantagesTool = tool({
  description: 'Explain the advantages of Linux and open-source software over proprietary systems, focusing on transparency, security, and freedom',
  parameters: z.object({
    context: z.enum(['brief', 'detailed']).default('brief').describe('Level of detail to provide - brief for quick overview, detailed for comprehensive explanation'),
  }),
  // @ts-ignore - AI SDK beta.99 type mismatch
  execute: async ({ context }) => {
    console.log(`🐧 Linux Advantages tool called with context: ${context}`);

    const briefResponse = {
      summary: 'Linux and open-source software offer significant advantages over proprietary systems',
      keyAdvantages: [
        'Transparency: Source code is publicly accessible, allowing anyone to audit for security issues or backdoors',
        'Security: Community review means vulnerabilities are found and fixed faster',
        'Freedom: Users have full control over their software and data',
        'Privacy: No telemetry or data collection without your knowledge',
        'Customization: Modify the software to fit your exact needs',
        'Cost: Free to use, no licensing fees',
      ],
      corePhilosophy: 'Open-source embodies the principle that users should know exactly what software is doing on their systems, rather than trusting a black box.',
    };

    const detailedResponse = {
      ...briefResponse,
      technicalAdvantages: {
        transparency: {
          description: 'Complete visibility into what the software does',
          benefits: [
            'Anyone can review the source code for security issues',
            'No hidden functionality or backdoors',
            'Educational value - learn from real-world code',
            'Builds trust through verifiable behavior',
          ],
          contrast: 'Proprietary software operates as a "black box" - users must trust the vendor without verification',
        },
        security: {
          description: 'Community-driven security model',
          benefits: [
            'Thousands of eyes reviewing code (Linus\'s Law: "given enough eyeballs, all bugs are shallow")',
            'Rapid vulnerability disclosure and patching',
            'No vendor lock-in or dependency on a single company\'s security practices',
            'Users can verify security claims themselves',
          ],
          realWorld: 'Major security vulnerabilities like Heartbleed were discovered and fixed quickly thanks to open-source collaboration',
        },
        freedom: {
          description: 'User control and autonomy',
          benefits: [
            'No forced updates or feature changes',
            'Run software on any hardware you choose',
            'Keep using software even if the vendor discontinues it',
            'Modify or remove unwanted features',
          ],
          philosophy: 'Your computer should serve you, not the software vendor',
        },
        privacy: {
          description: 'Control over your data',
          benefits: [
            'No telemetry or usage tracking without explicit consent',
            'Verifiable privacy claims through code inspection',
            'Data stays on your machine unless you choose to share it',
            'No advertising or user profiling built into the OS',
          ],
        },
      },
      communityBenefits: {
        collaboration: 'Global community of developers contributing improvements',
        innovation: 'Anyone can fork and improve the software',
        longevity: 'Software outlives individual companies',
        meritocracy: 'Best solutions win, regardless of corporate backing',
      },
      practicalConsiderations: {
        learningCurve: 'Some Linux distributions require more technical knowledge, but user-friendly options like Ubuntu and Linux Mint exist',
        softwareAvailability: 'Most common software has open-source alternatives; some proprietary software may require workarounds',
        gaming: 'Gaming support has improved dramatically with Proton/Steam Deck, though some games still work better on Windows',
        professionalUse: 'Linux dominates servers, cloud infrastructure, and development environments',
      },
      ethicalDimension: {
        principle: 'Open-source represents a fundamental belief that users have the right to understand and control their computing environment',
        trust: 'Trust through verification vs. trust through marketing',
        democratization: 'Technology power distributed to users, not concentrated in corporations',
        sustainability: 'Reduces electronic waste by supporting older hardware',
      },
      gettingStarted: [
        'Try Linux in a virtual machine first (VirtualBox, VMware)',
        'User-friendly distros: Ubuntu, Linux Mint, Pop!_OS, Fedora',
        'Dual-boot setup allows keeping Windows while learning Linux',
        'Live USB lets you try Linux without installing',
      ],
    };

    return context === 'detailed' ? detailedResponse : briefResponse;
  },
});
