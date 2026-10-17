package com.mobile

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.HashMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import android.os.PowerManager
import android.provider.Settings
import android.net.Uri
import android.content.ComponentName
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

class SafeWalkServiceModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

    private var sirenPlayer: android.media.MediaPlayer? = null
    private var fakeCallPlayer: android.media.MediaPlayer? = null
    private var tts: TextToSpeech? = null
    private var isTtsInitialized = false
    private var isFakeCallActive = false
    private var currentPhraseIndex = 0
    private var activePhrases: List<String> = emptyList()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingLanguage = "en"
    private var pendingIsSpeaker = false

    private val enPhrases = listOf(
        "Hello? Can you hear me? Where are you right now?",
        "Dad asked me to check on you. Are you on your way home?",
        "Okay, stay on the main road. Dinner is ready, everyone is waiting for you.",
        "Yeah, I am standing near the main gate. I will see you in a couple of minutes.",
        "Call me if you need anything. I am keeping my phone right next to me."
    )

    private val hiPhrases = listOf(
        "हेलो? आवाज़ आ रही है मेरी? कहाँ पहुँचे तुम अभी?",
        "पापा पूछ रहे थे कि तुम घर के लिए निकल गए या नहीं।",
        "हाँ, सीधे रास्ते से ही आना। खाना तैयार है, सब तुम्हारा इंतज़ार कर रहे हैं।",
        "अच्छा ठीक है, मैं गेट के पास खड़ा हूँ। दो मिनट में मिलो।",
        "कोई बात हो तो तुरंत बताना, मैं यहीं बाहर खड़ा हूँ।"
    )

    companion object {
        private var reactContextRef: WeakReference<ReactApplicationContext>? = null

        fun emitEvent(eventName: String, params: Any?) {
            try {
                val context = reactContextRef?.get() ?: return
                if (!context.hasActiveReactInstance()) {
                    android.util.Log.w("SafeWalkServiceModule", "ReactContext has no active instance, dropping $eventName")
                    return
                }
                context.runOnJSQueueThread {
                    try {
                        context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            ?.emit(eventName, params)
                    } catch (e: Exception) {
                        android.util.Log.w("SafeWalkServiceModule", "Failed to emit $eventName on JS thread: ${e.message}")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.w("SafeWalkServiceModule", "Failed to schedule $eventName: ${e.message}")
            }
        }
    }

    init {
        reactContextRef = WeakReference(reactContext)
        try {
            tts = TextToSpeech(reactContext, this)
        } catch (_: Exception) {}
    }

    override fun getName(): String = "SafeWalkService"

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsInitialized = true
            setupTtsListener()
            if (isFakeCallActive) {
                startSpeakingPhrases(pendingLanguage, pendingIsSpeaker)
            }
        }
    }

    private fun setupTtsListener() {
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}
            override fun onDone(utteranceId: String?) {
                if (!isFakeCallActive) return
                // Pause naturally 3.5s between dialogue turns
                mainHandler.postDelayed({
                    if (isFakeCallActive) {
                        currentPhraseIndex++
                        if (currentPhraseIndex >= activePhrases.size) {
                            currentPhraseIndex = 0
                        }
                        speakCurrentPhrase()
                    }
                }, 3500)
            }
            override fun onError(utteranceId: String?) {
                if (!isFakeCallActive) return
                mainHandler.postDelayed({
                    if (isFakeCallActive) {
                        currentPhraseIndex++
                        if (currentPhraseIndex >= activePhrases.size) {
                            currentPhraseIndex = 0
                        }
                        speakCurrentPhrase()
                    }
                }, 3000)
            }
        })
    }

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
    fun playFakeCall(language: String, isSpeaker: Boolean, promise: Promise) {
        try {
            stopFakeCallInternal()
            isFakeCallActive = true
            pendingLanguage = language
            pendingIsSpeaker = isSpeaker
            currentPhraseIndex = 0
            activePhrases = if (language.equals("hi", ignoreCase = true)) hiPhrases else enPhrases

            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            if (isSpeaker) {
                audioManager?.mode = android.media.AudioManager.MODE_NORMAL
                audioManager?.isSpeakerphoneOn = true
            } else {
                audioManager?.mode = android.media.AudioManager.MODE_IN_COMMUNICATION
                audioManager?.isSpeakerphoneOn = false
            }

            if (isTtsInitialized && tts != null) {
                startSpeakingPhrases(language, isSpeaker)
                promise.resolve(true)
            } else {
                playFallbackAudio(language, isSpeaker)
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("FAKECALL_ERROR", e.message, e)
        }
    }

    private fun startSpeakingPhrases(language: String, isSpeaker: Boolean) {
        try {
            val targetLocale = if (language.equals("hi", ignoreCase = true)) Locale("hi", "IN") else Locale.US
            tts?.language = targetLocale
            tts?.setPitch(1.0f)
            tts?.setSpeechRate(0.95f)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                val usage = if (isSpeaker) android.media.AudioAttributes.USAGE_MEDIA else android.media.AudioAttributes.USAGE_VOICE_COMMUNICATION
                tts?.setAudioAttributes(
                    android.media.AudioAttributes.Builder()
                        .setUsage(usage)
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
            }
            speakCurrentPhrase()
        } catch (_: Exception) {
            playFallbackAudio(language, isSpeaker)
        }
    }

    private fun speakCurrentPhrase() {
        if (!isFakeCallActive || activePhrases.isEmpty()) return
        val text = activePhrases.getOrNull(currentPhraseIndex) ?: return
        val utteranceId = "fake_call_utterance_${System.currentTimeMillis()}"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
        } else {
            val params = HashMap<String, String>()
            params[TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID] = utteranceId
            @Suppress("DEPRECATION")
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, params)
        }
    }

    private fun playFallbackAudio(language: String, isSpeaker: Boolean) {
        try {
            val resName = if (language.equals("hi", ignoreCase = true)) "fake_call_hi" else "fake_call_en"
            var resId = reactContext.resources.getIdentifier(resName, "raw", reactContext.packageName)
            if (resId == 0) {
                resId = reactContext.resources.getIdentifier("fake_call_en", "raw", reactContext.packageName)
            }
            if (resId != 0) {
                fakeCallPlayer = android.media.MediaPlayer.create(reactContext, resId)?.apply {
                    isLooping = true
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        val usage = if (isSpeaker) android.media.AudioAttributes.USAGE_MEDIA else android.media.AudioAttributes.USAGE_VOICE_COMMUNICATION
                        setAudioAttributes(
                            android.media.AudioAttributes.Builder()
                                .setUsage(usage)
                                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SPEECH)
                                .build()
                        )
                    } else {
                        @Suppress("DEPRECATION")
                        val stream = if (isSpeaker) android.media.AudioManager.STREAM_MUSIC else android.media.AudioManager.STREAM_VOICE_CALL
                        setAudioStreamType(stream)
                    }
                    start()
                }
            }
        } catch (_: Exception) {}
    }

    private fun stopFakeCallInternal() {
        isFakeCallActive = false
        mainHandler.removeCallbacksAndMessages(null)
        try {
            tts?.stop()
        } catch (_: Exception) {}
        try {
            fakeCallPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
            fakeCallPlayer = null
        } catch (_: Exception) {}
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? android.media.AudioManager
            audioManager?.mode = android.media.AudioManager.MODE_NORMAL
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun stopFakeCall(promise: Promise) {
        stopFakeCallInternal()
        promise.resolve(true)
    }

    @ReactMethod
    fun isFakeCallPlaying(promise: Promise) {
        promise.resolve(isFakeCallActive)
    }

    @ReactMethod
    fun recordSosAudio(alertId: String, promise: Promise) {
        startEmergencyAudio(alertId, promise)
    }

    @ReactMethod
    fun startEmergencyAudio(alertId: String, promise: Promise) {
        startEmergencyAudioWithToken(alertId, null, promise)
    }

    @ReactMethod
    fun startEmergencyAudioWithToken(alertId: String, authToken: String?, promise: Promise) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_RECORD_AUDIO
                putExtra(SafeWalkService.EXTRA_ALERT_ID, alertId)
                if (!authToken.isNullOrEmpty()) {
                    putExtra(SafeWalkService.EXTRA_AUTH_TOKEN, authToken)
                }
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AUDIO_START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateEmergencyAlertId(alertId: String, promise: Promise) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_UPDATE_ALERT_ID
                putExtra(SafeWalkService.EXTRA_ALERT_ID, alertId)
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun updateEmergencyAlertIdWithToken(alertId: String, authToken: String?, promise: Promise) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_UPDATE_ALERT_ID
                putExtra(SafeWalkService.EXTRA_ALERT_ID, alertId)
                if (!authToken.isNullOrEmpty()) {
                    putExtra(SafeWalkService.EXTRA_AUTH_TOKEN, authToken)
                }
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun stopEmergencyAudio(promise: Promise) {
        try {
            val intent = Intent(reactContext, SafeWalkService::class.java).apply {
                action = SafeWalkService.ACTION_STOP_AUDIO
            }
            reactContext.startService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("AUDIO_STOP_ERROR", e.message, e)
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

    // Phase 4: OEM Battery Optimization & Lock-Screen Protection Methods
    @ReactMethod
    fun isIgnoringBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as? PowerManager
                val isIgnoring = powerManager?.isIgnoringBatteryOptimizations(reactContext.packageName) ?: false
                promise.resolve(isIgnoring)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent().apply {
                    action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            // Fallback to general battery saver settings page if direct prompt fails
            try {
                val fallbackIntent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(fallbackIntent)
                promise.resolve(true)
            } catch (e2: Exception) {
                promise.reject("BATTERY_INTENT_ERROR", e2.message, e2)
            }
        }
    }

    @ReactMethod
    fun openManufacturerPowerSettings(promise: Promise) {
        val manufacturer = Build.MANUFACTURER.lowercase(Locale.getDefault())
        val intent = Intent().apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }

        var intentFound = false
        when {
            manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco") -> {
                try {
                    intent.component = ComponentName(
                        "com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"
                    )
                    reactContext.startActivity(intent)
                    intentFound = true
                } catch (_: Exception) {}
            }
            manufacturer.contains("samsung") -> {
                try {
                    intent.component = ComponentName(
                        "com.samsung.android.lool",
                        "com.samsung.android.sm.battery.ui.BatteryActivity"
                    )
                    reactContext.startActivity(intent)
                    intentFound = true
                } catch (_: Exception) {}
            }
            manufacturer.contains("oneplus") || manufacturer.contains("oppo") || manufacturer.contains("realme") -> {
                try {
                    intent.component = ComponentName(
                        "com.coloros.safecenter",
                        "com.coloros.safecenter.permission.startup.StartupAppListActivity"
                    )
                    reactContext.startActivity(intent)
                    intentFound = true
                } catch (_: Exception) {}
            }
            manufacturer.contains("huawei") || manufacturer.contains("honor") -> {
                try {
                    intent.component = ComponentName(
                        "com.huawei.systemmanager",
                        "com.huawei.systemmanager.optimize.process.ProtectActivity"
                    )
                    reactContext.startActivity(intent)
                    intentFound = true
                } catch (_: Exception) {}
            }
        }

        if (!intentFound) {
            // General application details fallback
            try {
                val appSettingsIntent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${reactContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                reactContext.startActivity(appSettingsIntent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SETTINGS_ERROR", e.message, e)
            }
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun getDeviceManufacturerInfo(promise: Promise) {
        try {
            val map = Arguments.createMap().apply {
                putString("manufacturer", Build.MANUFACTURER)
                putString("brand", Build.BRAND)
                putString("model", Build.MODEL)
                putInt("sdkInt", Build.VERSION.SDK_INT)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("DEVICE_INFO_ERROR", e.message, e)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopFakeCallInternal()
        try {
            tts?.shutdown()
        } catch (_: Exception) {}
    }
}
