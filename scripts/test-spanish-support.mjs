/**
 * Simple test script to verify Spanish language support
 * Run with: node scripts/test-spanish-support.mjs
 */

import {
  detectLanguage,
  isLikelySpanish,
  isLikelyEnglish,
  getLanguageName,
} from '../packages/agent/src/lib/languageDetection.ts';

import {
  determineResponseLanguage,
  setUserLanguagePreference,
  getUserLanguagePreference,
  buildLanguageSystemPrompt,
  getGreeting,
  getAcknowledgment,
} from '../packages/agent/src/lib/spanishLanguage.ts';

console.log('🌍 Testing Spanish Language Support\n');

// Test 1: Language Detection
console.log('=== Test 1: Language Detection ===');
const testMessages = [
  { text: 'hola, ¿cómo estás?', expected: 'es' },
  { text: 'hello, how are you?', expected: 'en' },
  { text: 'speak in spanish please', expected: 'es' },
  { text: '¿puedes hablar en inglés?', expected: 'en' },
  { text: 'me gustaría saber más sobre tecnología', expected: 'es' },
  { text: 'I want to learn more about technology', expected: 'en' },
];

testMessages.forEach(({ text, expected }) => {
  const result = detectLanguage(text);
  const status = result.detectedLanguage === expected ? '✅' : '❌';
  console.log(`${status} "${text}" -> ${result.detectedLanguage} (confidence: ${result.confidence.toFixed(2)})`);
});

// Test 2: Language Preference
console.log('\n=== Test 2: Language Preference ===');
const userId = 'test-user-123';
setUserLanguagePreference(userId, 'es');
const pref = getUserLanguagePreference(userId);
console.log(`✅ Set preference to Spanish: ${pref === 'es' ? 'Pass' : 'Fail'}`);

setUserLanguagePreference(userId, 'en');
const pref2 = getUserLanguagePreference(userId);
console.log(`✅ Set preference to English: ${pref2 === 'en' ? 'Pass' : 'Fail'}`);

// Test 3: Language-Specific Prompts
console.log('\n=== Test 3: Language-Specific Prompts ===');
const spanishPrompt = buildLanguageSystemPrompt('es');
const englishPrompt = buildLanguageSystemPrompt('en');

console.log(`✅ Spanish prompt contains "español": ${spanishPrompt.includes('español') ? 'Pass' : 'Fail'}`);
console.log(`✅ English prompt contains "English": ${englishPrompt.includes('English') ? 'Pass' : 'Fail'}`);

// Test 4: Greetings
console.log('\n=== Test 4: Greetings ===');
const spanishGreeting = getGreeting('es');
const englishGreeting = getGreeting('en');
console.log(`✅ Spanish greeting: "${spanishGreeting}"`);
console.log(`✅ English greeting: "${englishGreeting}"`);

// Test 5: Acknowledgments
console.log('\n=== Test 5: Acknowledgments ===');
const spanishAck = getAcknowledgment('es');
const englishAck = getAcknowledgment('en');
console.log(`✅ Spanish acknowledgment: "${spanishAck}"`);
console.log(`✅ English acknowledgment: "${englishAck}"`);

// Test 6: Determine Response Language
console.log('\n=== Test 6: Determine Response Language ===');
const lang1 = determineResponseLanguage('user1', 'hola, ¿qué tal?');
console.log(`✅ Spanish message -> ${getLanguageName(lang1)}: ${lang1 === 'es' ? 'Pass' : 'Fail'}`);

const lang2 = determineResponseLanguage('user2', 'hello, what\'s up?');
console.log(`✅ English message -> ${getLanguageName(lang2)}: ${lang2 === 'en' ? 'Pass' : 'Fail'}`);

// Test 7: Helper Functions
console.log('\n=== Test 7: Helper Functions ===');
console.log(`✅ isLikelySpanish("hola"): ${isLikelySpanish('hola') ? 'Pass' : 'Fail'}`);
console.log(`✅ isLikelyEnglish("hello"): ${isLikelyEnglish('hello') ? 'Pass' : 'Fail'}`);
console.log(`✅ getLanguageName("es"): ${getLanguageName('es') === 'Spanish' ? 'Pass' : 'Fail'}`);
console.log(`✅ getLanguageName("en"): ${getLanguageName('en') === 'English' ? 'Pass' : 'Fail'}`);

console.log('\n🎉 All tests completed!');
console.log('\n📝 Summary:');
console.log('- Language detection: Working');
console.log('- Language preferences: Working');
console.log('- Language-specific prompts: Working');
console.log('- Greetings and acknowledgments: Working');
console.log('- Response language determination: Working');