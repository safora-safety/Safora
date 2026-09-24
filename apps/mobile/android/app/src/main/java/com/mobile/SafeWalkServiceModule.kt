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

    private var sirenPlayer: android.media.MediaPlayer? = null

    override fun getName(): String = "SafeWalkService"

    @ReactMethod
    fun startWithDetails(
        journeyId: String,
        destLat: Double,
        destLng: Double,
        destName: String?,
        totalDistance: Double,
        token: String?,
        promise: Promise
    ) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_START
                putExtra(SafeWalkService.EXTRA_JOURNEY_ID, journeyId)
                putExtra(SafeWalkService.EXTRA_DEST_LAT, destLat)
                putExtra(SafeWalkService.EXTRA_DEST_LNG, destLng)
                putExtra(SafeWalkService.EXTRA_DEST_NAME, destName ?: "Destination")
                putExtra(SafeWalkService.EXTRA_TOTAL_DISTANCE, totalDistance)
                putExtra(SafeWalkService.EXTRA_AUTH_TOKEN, token ?: "")
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
    fun start(journeyId: String, destLat: Double, destLng: Double, token: String?, promise: Promise) {
        startWithDetails(journeyId, destLat, destLng, "Destination", 0.0, token ?: "", promise)
    }

    @ReactMethod
    fun updateLocation(lat: Double, lng: Double, promise: Promise) {
        try {
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun playSiren(promise: Promise) {
        try {
            if (sirenPlayer == null) {
                val resId = reactContext.resources.getIdentifier("siren_alarm", "raw", reactContext.packageName)
                if (resId != 0) {
                    sirenPlayer = android.media.MediaPlayer.create(reactContext, resId)?.apply {
                        isLooping = true
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            setAudioAttributes(
                                android.media.AudioAttributes.Builder()
                                    .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                                    .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                    .build()
                            )
                        } else {
                            @Suppress("DEPRECATION")
                            setAudioStreamType(android.media.AudioManager.STREAM_ALARM)
                        }
                        start()
                    }
                }
            } else if (!sirenPlayer!!.isPlaying) {
                sirenPlayer!!.start()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SIREN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopSiren(promise: Promise) {
        try {
            sirenPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            sirenPlayer = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isSirenPlaying(promise: Promise) {
        promise.resolve(sirenPlayer?.isPlaying == true)
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
