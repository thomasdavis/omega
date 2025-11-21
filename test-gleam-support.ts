/**
 * Test script to check if Gleam is supported by Unsandbox API
 * This will query the /languages endpoint and check for Gleam support
 */

async function testGleamSupport() {
  try {
    console.log('🔍 Checking Unsandbox API for Gleam support...\n');

    // Fetch languages from Unsandbox API
    const response = await fetch('https://api.unsandbox.com/languages', {
      headers: {
        'Authorization': 'Bearer open-says-me',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const languages = await response.json();

    console.log(`✅ Successfully fetched ${languages.length} languages from Unsandbox API\n`);

    // Check if Gleam is in the list
    const gleamSupported = languages.some((lang: any) => {
      const id = typeof lang === 'string' ? lang : (lang.id || lang.name || '');
      return id.toLowerCase() === 'gleam';
    });

    if (gleamSupported) {
      console.log('✅ RESULT: Gleam IS supported by Unsandbox!');
      console.log('   Omega will automatically support Gleam after cache refresh.\n');
    } else {
      console.log('❌ RESULT: Gleam is NOT supported by Unsandbox.');
      console.log('   Gleam support must be added to Unsandbox first.\n');
    }

    // Print all supported languages
    console.log('📋 All supported languages:');
    const languageIds = languages.map((lang: any) => {
      if (typeof lang === 'string') return lang;
      return lang.id || lang.name || String(lang);
    });
    console.log(languageIds.sort().join(', '));
    console.log(`\n📊 Total: ${languages.length} languages`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testGleamSupport();
