# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native & Native Modules
-keep class com.facebook.react.** { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    @com.facebook.react.bridge.ReactMethod *;
}

# React Native Screens & Fragment preservation
-keep class com.swmansion.rnscreens.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native Maps
-keep class com.rnmaps.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Google Play Services & OAuth
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Custom Foreground Service & Bridge
-keep class com.mobile.SafeWalkService** { *; }
-keep class com.mobile.SafeWalkServiceModule** { *; }
-keep class com.mobile.SafeWalkServicePackage** { *; }

