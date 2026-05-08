# Spanish Language Support for Omega

Omega now supports fluent Spanish communication, allowing users to interact with the bot in Spanish just as naturally as in English.

## Features

### 1. Automatic Language Detection
Omega automatically detects when a user is speaking Spanish and responds in the same language. The detection system uses:
- Pattern matching for common Spanish words and phrases
- Detection of Spanish characters (á, é, í, ó, ú, ü, ñ)
- Recognition of Spanish question words, pronouns, and verbs
- Confidence scoring to ensure accurate detection

### 2. Language Preference Setting
Users can set their preferred language:
- **English mode**: Omega responds in English (default)
- **Spanish mode**: Omega responds in Spanish

Use commands like:
- "speak spanish" / "habla en español"
- "always respond in spanish" / "responde siempre en español"
- "speak english" / "habla en inglés"

### 3. Context-Aware Responses
Omega maintains its personality and wit in Spanish:
- Witty and intelligent humor
- Direct, concise communication
- Natural, conversational style
- Proper use of Spanish idioms and expressions

### 4. Graceful Language Switching
- Omega adapts when users switch languages mid-conversation
- Automatic fallback to English when Spanish is not relevant
- Respect for user language preferences

## Usage Examples

### Basic Spanish Interaction
```
User: hola, ¿cómo estás?
Omega: ¡Hola! Estoy funcionando perfectamente, gracias por preguntar. ¿En qué puedo ayudarte hoy?

User: ¿puedes buscarme información sobre inteligencia artificial?
Omega: Claro, buscaré información sobre inteligencia artificial para ti.
[Omega uses the search tool and responds in Spanish]
```

### Setting Language Preference
```
User: habla en español por favor
Omega: ¡Perfecto! Ahora responderé en español.

User: ¿cómo cambio a inglés?
Omega: Si prefieres que hable en inglés, solo dímelo y cambiaré.
```

### Language Switching
```
User: hello, how are you?
Omega: Hey! I'm doing great, thanks for asking. What can I help you with?

User: ¿puedes cambiar a español ahora?
Omega: ¡Claro! Cambiando al español. ¿En qué puedo ayudarte?
```

### Using Tools in Spanish
```
User: crea una lista de tareas para hoy
Omega: Entendido, crearé una lista de tareas para ti.
[Omega uses the createTodo tool and responds in Spanish]
```

## Technical Implementation

### Language Detection
Located in `packages/agent/src/lib/languageDetection.ts`:
- `detectLanguage(text)`: Detects language with confidence scoring
- `isLikelySpanish(text)`: Quick check for Spanish
- `isLikelyEnglish(text)`: Quick check for English

### Spanish Language Support
Located in `packages/agent/src/lib/spanishLanguage.ts`:
- `determineResponseLanguage()`: Determines response language based on user preference and message content
- `buildLanguageSystemPrompt()`: Builds language-specific system prompts
- `getGreeting()`, `getAcknowledgment()`: Language-specific phrases
- User preference management functions

### Integration Points
1. **Agent Loop** (`agent.ts`): Language detection happens before processing each message
2. **System Prompt** (`systemPrompt.ts`): Language-specific instructions are added dynamically
3. **Tool Selection** (`toolRouter.ts`): Tools work with both English and Spanish input
4. **Tool Responses**: Tool results are presented in the detected language

### Tools for Language Management
- `setLanguagePreference`: Set user's preferred language
- `getLanguagePreference`: Check current language setting
- `translateToSpanish`: Translate text to Spanish (existing tool)

## Testing

Test files are located in `packages/agent/src/lib/__tests__/spanishLanguage.test.ts`:

```bash
# Run Spanish language tests
pnpm test spanishLanguage
```

Test coverage includes:
- Language detection accuracy
- Spanish and English pattern recognition
- Language preference management
- System prompt generation
- Full conversation flows
- Edge cases and mixed-language scenarios

## Configuration

No additional configuration is needed. Spanish language support is enabled by default.

### Environment Variables
None required. The feature uses the existing OpenAI model configuration.

## Performance Considerations

- Language detection is fast (< 1ms) and uses pattern matching
- No additional API calls required for detection
- Language preferences are stored in memory (per session)
- System prompt generation is minimal overhead

## Limitations

1. **Ambiguous Text**: Very short or ambiguous text may default to English
2. **Code Snippets**: Code with Spanish comments may be detected as Spanish
3. **Dialects**: Standard Spanish is prioritized; regional variations may have lower confidence
4. **Mixed Languages**: Mixed-language messages may have lower confidence scores

## Future Enhancements

Potential improvements:
- Persistent language preferences (database storage)
- Support for additional languages
- Dialect-specific responses (Mexican Spanish, Peninsular Spanish, etc.)
- Language learning mode for users practicing Spanish
- Bilingual mode for language learning

## Support

If you encounter issues with Spanish language support:
1. Check the language detection logs in the agent output
2. Verify user language preferences are set correctly
3. Review the test cases for expected behavior
4. Report issues with example messages for debugging

## Examples for Testing

### Spanish Commands
- "hola"
- "¿cómo estás?"
- "ayúdame con esto"
- "busca información sobre X"
- "traduce esto al español"
- "habla en español"
- "responde siempre en español"

### English Commands
- "hello"
- "how are you?"
- "help me with this"
- "search for information about X"
- "speak english"
- "always respond in english"

### Edge Cases
- "hola hello" (mixed)
- "const hola = 'world';" (code)
- "sí" (very short)
- "👋 hola" (with emoji)

## Metadata

The following tools have Spanish-language metadata:
- `setLanguagePreference`: Configure language preference
- `getLanguagePreference`: Check language setting
- `translateToSpanish`: Translate to Spanish

All existing tools work seamlessly with Spanish input and output.