# Unsandbox API Testing Report

## Test Date
2025-11-16

## API Key Tested
```
UNSANDBOX_API_KEY="omega-paid-the-cost"
```

## Test Code
Python Fibonacci implementation:
```python
def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    fib = [0, 1]
    while len(fib) < n:
        fib.append(fib[-1] + fib[-2])
    return fib

result = fibonacci(10)
print(result)
```

Expected output: `[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]`

## Test Results

### Test 1: Direct curl request
```bash
curl -X POST https://unsandbox.com/v1/run \
  -H "Authorization: Bearer omega-paid-the-cost" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def fibonacci(n):\n    if n <= 0:\n        return []\n    elif n == 1:\n        return [0]\n    fib = [0, 1]\n    while len(fib) < n:\n        fib.append(fib[-1] + fib[-2])\n    return fib\n\nresult = fibonacci(10)\nprint(result)",
    "timeout": 5000
  }'
```

**Result:** Empty response body
- HTTP request completed successfully (no connection errors)
- No authentication error (no 401/403 status)
- Response body was empty (0 bytes received)

### Test 2: curl with JSON parsing
```bash
curl -s -X POST https://unsandbox.com/v1/run \
  -H "Authorization: Bearer omega-paid-the-cost" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "def fibonacci(n):\n    if n <= 0:\n        return []\n    elif n == 1:\n        return [0]\n    fib = [0, 1]\n    while len(fib) < n:\n        fib.append(fib[-1] + fib[-2])\n    return fib\n\nresult = fibonacci(10)\nprint(result)",
    "timeout": 5000
  }' | jq .
```

**Result:** Empty response (jq had nothing to parse)

## Analysis

1. **API Endpoint**: The endpoint `https://unsandbox.com/v1/run` is reachable
2. **Authentication**: The API key format is accepted (no 401/403 error)
3. **Response**: Empty body suggests either:
   - Invalid/expired API key (though server accepts the format)
   - Unsandbox service issue
   - API key lacks necessary permissions/credits

## Discord Bot Behavior

When the bot tries to use the unsandbox tool in Discord:

**User request:**
```
omega write a sample python script that does fibonacci and run it on unsandbox, call the tools again
```

**Bot response:**
```json
{
  "success": false,
  "error": "Unsandbox API key not configured. Please set UNSANDBOX_API_KEY environment variable.",
  "language": "python"
}
```

The bot correctly detects that the API key is not set in its environment variables.

## How to Fix

### Option 1: Set in Fly.io secrets
```bash
flyctl secrets set UNSANDBOX_API_KEY="your-valid-api-key" -a omega-nrhptq
```

### Option 2: Set in .env.local (local development)
```bash
# In apps/bot/.env.local
UNSANDBOX_API_KEY="your-valid-api-key"
```

### Option 3: Test with curl locally
```bash
# Replace YOUR_API_KEY with actual key
export UNSANDBOX_API_KEY="YOUR_API_KEY"

curl -X POST https://unsandbox.com/v1/run \
  -H "Authorization: Bearer $UNSANDBOX_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "code": "print(\"Hello from Unsandbox!\")",
    "timeout": 5000
  }'
```

## Conclusion

The API key `omega-paid-the-cost` appears to be a placeholder or test key that is not actually valid for the Unsandbox API. To enable code execution in the Discord bot, you'll need to:

1. Sign up for an Unsandbox account at https://unsandbox.com
2. Get a valid API key from your account dashboard
3. Set it as a Fly.io secret or environment variable
4. Redeploy the bot

Once a valid API key is configured, the unsandbox tool will be able to execute code in 11 programming languages (Python, JavaScript, TypeScript, Ruby, Go, Rust, Java, C++, C, PHP, Bash).
