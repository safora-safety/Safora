package com.mobile

import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SafeWalkServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SafeWalkService"

    @ReactMethod
    fun start(journeyId: String, destLat: Double, destLng: Double, promise: Promise) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_START
                putExtra(SafeWalkService.EXTRA_JOURNEY_ID, journeyId)
                putExtra(SafeWalkService.EXTRA_DEST_LAT, destLat)
                putExtra(SafeWalkService.EXTRA_DEST_LNG, destLng)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateLocation(lat: Double, lng: Double, promise: Promise) {
        try {
            // If service is running, let it know current coordinates to refresh notification
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun recordSosAudio(alertId: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_RECORD_AUDIO
                putExtra(SafeWalkService.EXTRA_ALERT_ID, alertId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_STOP
            }
            reactContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(SafeWalkService.isServiceRunning)
    }
}
