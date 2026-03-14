import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { serializeProfile } from '@/lib/serializeProfile';

export const dynamic = 'force-dynamic';

function computeCompatibility(a: any, b: any): number {
  const dims = [
    'openness_score', 'conscientiousness_score', 'extraversion_score',
    'agreeableness_score', 'neuroticism_score', 'emotional_awareness_score',
    'empathy_score', 'analytical_thinking_score', 'creative_thinking_score',
    'cooperation_score', 'social_dominance_score', 'order_chaos_balance',
    'responsibility_index', 'dopamine_seeking_score', 'serotonin_stability_score',
    'persuadability_index', 'will_to_power_score', 'system1_dominance',
    'shadow_integration_score', 'persona_authenticity_gap', 'resilience_score',
    'adaptability_score', 'sublimation_score', 'decision_quality_score',
    'narrative_coherence_score',
  ];
  let validDims = 0;
  let sumSq = 0;
  for (const d of dims) {
    const va = a[d], vb = b[d];
    if (va != null && vb != null) {
      sumSq += ((va - vb) / 100) ** 2;
      validDims++;
    }
  }
  if (validDims === 0) return 50;
  const distance = Math.sqrt(sumSq / validDims);
  return Math.round((1 - distance) * 100);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const usersParam = searchParams.get('users');

    if (!usersParam) {
      return NextResponse.json(
        { error: 'Missing required "users" query parameter (comma-separated usernames)' },
        { status: 400 }
      );
    }

    const usernames = usersParam.split(',').map(u => u.trim()).filter(Boolean);

    if (usernames.length < 2 || usernames.length > 3) {
      return NextResponse.json(
        { error: 'Provide 2-3 usernames separated by commas' },
        { status: 400 }
      );
    }

    // Fetch all profiles in parallel
    const profiles = await Promise.all(
      usernames.map(username =>
        prisma.userProfile.findFirst({ where: { username } })
      )
    );

    // Check for missing profiles
    const missing = usernames.filter((u, i) => !profiles[i]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Profiles not found for: ${missing.join(', ')}` },
        { status: 404 }
      );
    }

    const serializedProfiles = profiles.map(p => serializeProfile(p!));

    // Compute pairwise compatibility scores
    const compatibility: { userA: string; userB: string; score: number }[] = [];
    for (let i = 0; i < serializedProfiles.length; i++) {
      for (let j = i + 1; j < serializedProfiles.length; j++) {
        compatibility.push({
          userA: serializedProfiles[i].username,
          userB: serializedProfiles[j].username,
          score: computeCompatibility(serializedProfiles[i], serializedProfiles[j]),
        });
      }
    }

    return NextResponse.json({
      profiles: serializedProfiles,
      compatibility,
    });
  } catch (error) {
    console.error('Error comparing profiles:', error);
    return NextResponse.json(
      { error: 'Failed to compare profiles' },
      { status: 500 }
    );
  }
}
