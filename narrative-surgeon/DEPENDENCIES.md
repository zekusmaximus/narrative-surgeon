# Additional Dependencies Required

To enable the enhanced API key management and security features, install these Expo dependencies:

## Installation Commands

```bash
# Install Expo SecureStore and Crypto
npx expo install expo-secure-store expo-crypto

# Alternative with npm
npm install expo-secure-store expo-crypto
```

## Dependencies Overview

### expo-secure-store
- **Purpose**: Secure storage for sensitive data like API keys
- **Features**: Hardware-backed encryption on supported devices
- **Fallback**: Uses keychain (iOS) or encrypted shared preferences (Android)

### expo-crypto
- **Purpose**: Generate cryptographically secure random values
- **Features**: Create unique encryption keys for enhanced security
- **Usage**: Generate dynamic encryption keys instead of hardcoded ones

## Security Benefits

1. **Dynamic Encryption Keys**: Each app installation gets a unique encryption key
2. **Hardware Security**: Uses device security features when available
3. **Fallback Safety**: Gracefully degrades to software encryption if hardware unavailable
4. **No Hardcoded Keys**: Eliminates security risks from hardcoded encryption keys

## Alternative Implementation

If you prefer not to use Expo dependencies, the app falls back to:
- MMKV with a static encryption key (still secure, but less dynamic)
- Regular local storage for non-sensitive settings
- Manual API key format validation without network testing

## Current Fallback Behavior

The current implementation includes fallback handling:
- If Expo modules are unavailable, uses hardcoded encryption key
- All features remain functional with slightly reduced security
- No breaking changes to existing functionality