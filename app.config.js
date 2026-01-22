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
    icon: "./assets/images/unbind-logo.png",
    scheme: "unbind",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.unbindapp.unbind",
      buildNumber: "6",
      // ASO: iOS specific metadata
      infoPlist: {
        NSMicrophoneUsageDescription: "Unbind uses your microphone to record voice journals and convert them into actionable micro-tasks.",
        CFBundleDisplayName: "Unbind",
        ITSAppUsesNonExemptEncryption: false,
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
      favicon: "./assets/images/unbind-logo.png"
    },
    
    plugins: [
      "expo-router",
      "expo-font",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/unbind-logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#1F2937"
          }
        }
      ],
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
      // Supabase config (anon key is public, safe to include)
      SUPABASE_URL: 'https://jzpfbxybfoowkdeomecd.supabase.co',
      SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6cGZieHliZm9vd2tkZW9tZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MDk4NTAsImV4cCI6MjA4NDM4NTg1MH0.qNTdPTWDfePqGkSmZBvKRcso4Jyy-3Nh2HndRtV_YNY',
      
      eas: {
        projectId: "e980fa42-2281-4596-91dd-9d8715b2ec4e"
      }
    },
    
    // ASO: App Store metadata
    // Keywords (100 char max for iOS): 
    // focus,procrastination,productivity,voice journal,habit tracker,task manager,micro tasks,ADHD,time management,AI
  }
};
