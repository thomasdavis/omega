# SoundFont Directory

This directory should contain a piano SoundFont file for high-quality MP3 audio generation.

## Recommended SoundFonts:

1. **Salamander Grand Piano** (Recommended)
   - Size: ~200MB
   - Download: https://github.com/sfztools/salamander
   - Quality: Excellent

2. **FluidR3_GM** (Smaller alternative)
   - Size: ~140MB
   - Download: https://github.com/musescore/MuseScore/blob/master/share/sound/FluidR3Mono_GM.sf3
   - Quality: Good

## Setup:

1. Download your preferred SoundFont
2. Place it in this directory as `grand_piano.sf2`
3. Or set the `SOUNDFONT_PATH` environment variable to point to your SoundFont

## Environment Variable:

```bash
SOUNDFONT_PATH=/app/assets/soundfonts/grand_piano.sf2
```

For Railway deployment, the SoundFont file should be included in the Docker image or mounted as a volume.

