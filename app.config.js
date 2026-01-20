// app.config.js
// Unbind - Voice to Action Productivity App
// ASO Optimized Configuration

export default {
  expo: {
    // ASO: App name with primary keyword
    name: "Unbind: Beat Procrastination",
    slug: "unbind",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "unbind",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.unbindapp.unbind",
      // ASO: iOS specific metadata
      infoPlist: {
        NSMicrophoneUsageDescription: "Unbind uses your microphone to record voice journals and convert them into actionable micro-tasks.",
        CFBundleDisplayName: "Unbind",
      },
    },
    
    android: {
      package: "com.unbindapp.unbind",
      adaptiveIcon: {
        backgroundColor: "#4F46E5",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["RECORD_AUDIO"],
    },
    
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#1F2937"
          }
        }
      ],
      "sentry-expo",
      [
        "expo-av",
        {
          microphonePermission: "Allow Unbind to access your microphone for voice journaling."
        }
      ]
    ],
    
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    
    extra: {
      // Environment variables
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      SUPABASE_URL: process.env.SUPABASE_URL || '',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
      
      // App metadata for ASO
      eas: {
        projectId: "unbind"
      }
    },
    
    // ASO: App Store metadata
    // Keywords (100 char max for iOS): 
    // focus,procrastination,productivity,voice journal,habit tracker,task manager,micro tasks,ADHD,time management,AI
  }
};
