const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Alias native-only modules to web shims when bundling for web
const webShims = {
  'react-native-maps': 'shims/react-native-maps.web.tsx',
  'expo-secure-store': 'shims/expo-secure-store.web.ts',
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return {
      filePath: path.resolve(__dirname, webShims[moduleName]),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
