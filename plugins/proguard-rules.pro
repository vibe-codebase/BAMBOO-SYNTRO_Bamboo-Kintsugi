# R8 rules for the release build (appended to android/app/proguard-rules.pro at prebuild).

# React Native and Hermes: keep the bridge and anything called from JavaScript or native code by name.
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-keepclassmembers class * { @com.facebook.react.bridge.ReactMethod *; }
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class *

# Expo modules are found by reflection.
-keep class expo.modules.** { *; }
-keep class * implements expo.modules.kotlin.modules.Module { *; }

# The WebView that hosts the game, and its JavaScript bridge.
-keep class com.reactnativecommunity.webview.** { *; }
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }

# Safe-area insets.
-keep class com.th3rdwave.safeareacontext.** { *; }

# Keep enough for readable Play Console crash reports, without source paths.
-keepattributes Signature,*Annotation*,InnerClasses,EnclosingMethod,Exceptions
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# No device-level logging in release: strip verbose, debug and info log calls.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

-dontwarn com.facebook.**
-dontwarn expo.modules.**
-dontwarn org.jetbrains.annotations.**
