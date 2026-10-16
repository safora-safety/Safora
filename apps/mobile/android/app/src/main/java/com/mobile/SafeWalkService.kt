package com.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.content.pm.ServiceInfo
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat

import android.util.Base64
import com.facebook.react.bridge.Arguments
import java.io.ByteArrayOutputStream
import java.io.FileOutputStream
import java.io.RandomAccessFile
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import okhttp3.Call
import okhttp3.Callback
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class SafeWalkService : Service(), LocationListener {

    companion object {
        const val TAG = "SafeWalkService"
        const val CHANNEL_ID = "safewalk_corridor"
        const val NOTIFICATION_ID = 9001

        const val ACTION_START = "com.mobile.action.START_SAFE_WALK"
        const val ACTION_STOP = "com.mobile.action.STOP_SAFE_WALK"
        const val ACTION_RECORD_AUDIO = "com.mobile.action.RECORD_AUDIO"
        const val ACTION_STOP_AUDIO = "com.mobile.action.STOP_AUDIO"
        const val ACTION_TRIGGER_SOS = "com.mobile.action.TRIGGER_SOS"

        const val EXTRA_JOURNEY_ID = "journey_id"
        const val EXTRA_DEST_LAT = "dest_lat"
        const val EXTRA_DEST_LNG = "dest_lng"
        const val EXTRA_DEST_NAME = "dest_name"
        const val EXTRA_TOTAL_DISTANCE = "total_distance"
        const val EXTRA_AUTH_TOKEN = "auth_token"
        const val EXTRA_ALERT_ID = "alert_id"

        var isServiceRunning = false
            private set
    }

    private var journeyId: String = ""
    private var destLat: Double = 0.0
    private var destLng: Double = 0.0
    private var destName: String = "Destination"
    private var totalDistanceMeters: Double = 0.0
    private var authToken: String = ""

    private var lastLat: Double = 0.0
    private var lastLng: Double = 0.0

    private var wakeLock: PowerManager.WakeLock? = null
    private var locationManager: LocationManager? = null
    private var notificationManager: NotificationManager? = null

    private var isRecordingAudio = false
    private var audioRecordThread: Thread? = null
    private var audioRecord: AudioRecord? = null
    private var currentAudioFile: File? = null
    private var audioWakeLock: PowerManager.WakeLock? = null

    private val httpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action

        when (action) {
            ACTION_START -> {
                journeyId = intent.getStringExtra(EXTRA_JOURNEY_ID) ?: ""
                destLat = intent.getDoubleExtra(EXTRA_DEST_LAT, 0.0)
                destLng = intent.getDoubleExtra(EXTRA_DEST_LNG, 0.0)
                destName = intent.getStringExtra(EXTRA_DEST_NAME) ?: "Destination"
                totalDistanceMeters = intent.getDoubleExtra(EXTRA_TOTAL_DISTANCE, 0.0)
                authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN) ?: ""
                startSafeWalkForeground()
            }
            ACTION_STOP -> {
                stopSafeWalk()
            }
            ACTION_RECORD_AUDIO -> {
                val alertId = intent.getStringExtra(EXTRA_ALERT_ID) ?: "emergency"
                ensureAudioForegroundNotification()
                startLockScreenAudio(alertId)
            }
            ACTION_STOP_AUDIO -> {
                stopAudioRecording()
            }
            ACTION_TRIGGER_SOS -> {
                triggerEmergencySosNatively()
            }
        }

        return START_STICKY
    }

    private fun ensureAudioForegroundNotification() {
        try {
            val notification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("🚨 SAFORA · Emergency SOS Recording")
                .setContentText("Capturing & streaming live ambient audio evidence...")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try {
                    val fgsType = if (isServiceRunning) {
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                    } else {
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                    }
                    startForeground(NOTIFICATION_ID, notification, fgsType)
                } catch (e: Exception) {
                    Log.w(TAG, "Typed startForeground failed, falling back to standard: ${e.message}")
                    startForeground(NOTIFICATION_ID, notification)
                }
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (e: Exception) {
            Log.e(TAG, "ensureAudioForegroundNotification failed: ${e.message}")
        }
    }


    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Safe Walk Virtual Escort",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Live road corridor and distance tracking notification"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            notificationManager?.createNotificationChannel(channel)
        }
    }

    private fun startSafeWalkForeground() {
        isServiceRunning = true

        // 1. Acquire partial wake lock to keep GPS/OkHttp alive when screen is locked (TRG-2-lite)
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "SafeWalkService::CorridorWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(60 * 60 * 1000L) // 1 hour max safety timeout
        }

        // 2. Start initial Google Maps-style foreground notification
        val notification = buildNotification(
            "Connecting live GPS...",
            "Safe Escort Active",
            0
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                val fgsType = if (isRecordingAudio) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION or ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                } else {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
                }
                startForeground(NOTIFICATION_ID, notification, fgsType)
            } catch (e: Exception) {
                Log.w(TAG, "Typed startForeground failed, falling back to standard: ${e.message}")
                startForeground(NOTIFICATION_ID, notification)
            }
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // 3. Register native location updates (4s interval or 3 meters distance)
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    4000L,
                    3f,
                    this
                )
            } else if (locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    4000L,
                    3f,
                    this
                )
            }
        } catch (e: SecurityException) {
            Log.w(TAG, "Location permission missing in SafeWalkService: ${e.message}")
        }
    }

    /**
     * Google Maps-style Navigation Notification:
     * - Live progress bar showing route percentage
     * - Estimated time of arrival (e.g., Arrive 7:25 PM)
     * - Distance to destination
     * - Lock-screen action buttons: [🚨 SOS] and [Exit Safe Walk]
     */
    private fun buildNotification(
        distText: String,
        etaText: String,
        progressPercent: Int
    ): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        // Action 1: Exit navigation / Stop walk directly from notification
        val stopIntent = Intent(this, SafeWalkService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this,
            1,
            stopIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        // Action 2: Trigger Emergency SOS directly from lock screen
        val sosIntent = Intent(this, SafeWalkService::class.java).apply {
            action = ACTION_TRIGGER_SOS
        }
        val sosPending = PendingIntent.getService(
            this,
            2,
            sosIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚶‍♀️ SAFORA · $etaText")
            .setContentText("$distText · Route to $destName")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentIntent)
            .setProgress(100, Math.min(100, Math.max(0, progressPercent)), false)
            .addAction(android.R.drawable.ic_dialog_alert, "🚨 SOS", sosPending)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Exit Safe Walk", stopPending)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    // Called on location update to recalculate straight-line distance, ETA, and progress bar
    fun updateProgress(currentLat: Double, currentLng: Double) {
        lastLat = currentLat
        lastLng = currentLng

        if (destLat == 0.0 && destLng == 0.0) {
            val notification = buildNotification("Monitoring active corridor", "Escort Active", 0)
            notificationManager?.notify(NOTIFICATION_ID, notification)
            return
        }

        val results = FloatArray(1)
        Location.distanceBetween(currentLat, currentLng, destLat, destLng, results)
        val distMeters = results[0]

        if (totalDistanceMeters <= 0.0) {
            totalDistanceMeters = distMeters.toDouble()
        }

        val progressPercent = if (totalDistanceMeters > 0.0) {
            Math.round(((totalDistanceMeters - distMeters) / totalDistanceMeters) * 100).toInt()
        } else {
            0
        }

        // Calibrated walking speed = 1.60 m/s
        val walkSpeed = 1.60
        val etaSecs = distMeters / walkSpeed
        val etaMillis = System.currentTimeMillis() + (etaSecs * 1000).toLong()
        val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
        val etaTimeStr = "Arrive ${timeFormat.format(Date(etaMillis))}"

        val distText = if (distMeters >= 1000) {
            String.format(Locale.getDefault(), "%.1f km", distMeters / 1000.0)
        } else {
            "${distMeters.toInt()}m"
        }

        val notification = buildNotification(distText, etaTimeStr, progressPercent)
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }

    /**
     * Native OkHttp Location Streamer (Task 13 — TRG-2-lite):
     * Runs 100% natively in Kotlin inside the foreground service.
     * Guarantees location breadcrumbs keep reaching Render and Neon DB
     * even when the phone is locked and Android suspends the JS thread.
     */
    private fun postLocationNatively(lat: Double, lng: Double, speed: Float?, battery: Int?) {
        if (journeyId.isEmpty()) return

        try {
            val json = JSONObject().apply {
                put("latitude", lat)
                put("longitude", lng)
                if (speed != null && speed >= 0) put("speed", speed)
                if (battery != null && battery >= 0) put("battery", battery)
            }

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val reqBuilder = Request.Builder()
                .url("https://safora-backend.onrender.com/api/journeys/$journeyId/location")
                .patch(body)

            if (authToken.isNotEmpty()) {
                reqBuilder.header("Authorization", "Bearer $authToken")
            }

            httpClient.newCall(reqBuilder.build()).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.w(TAG, "Native location stream error: ${e.message}")
                }
                override fun onResponse(call: Call, response: Response) {
                    response.close()
                }
            })
        } catch (e: Exception) {
            Log.w(TAG, "Failed to schedule native location update: ${e.message}")
        }
    }

    private fun getBatteryPercentage(): Int? {
        return try {
            val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
            bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Lock-Screen SOS Trigger:
     * When user presses [🚨 SOS] on the lock-screen notification,
     * immediately starts audio recording and posts emergency alert.
     */
    private fun triggerEmergencySosNatively() {
        startLockScreenAudio(if (journeyId.isNotEmpty()) journeyId else "emergency")

        try {
            val json = JSONObject().apply {
                put("latitude", lastLat)
                put("longitude", lastLng)
                if (journeyId.isNotEmpty()) put("journey_id", journeyId)
                put("source", "lockscreen_notification")
            }

            val body = json.toString().toRequestBody("application/json; charset=utf-8".toMediaType())
            val reqBuilder = Request.Builder()
                .url("https://safora-backend.onrender.com/api/sos")
                .post(body)

            if (authToken.isNotEmpty()) {
                reqBuilder.header("Authorization", "Bearer $authToken")
            }

            httpClient.newCall(reqBuilder.build()).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    Log.w(TAG, "Native SOS dispatch network failed: ${e.message}")
                }
                override fun onResponse(call: Call, response: Response) {
                    response.close()
                }
            })

            // Update notification to Red Emergency Alert state
            val alertNotification = NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("🚨 SAFORA · EMERGENCY SOS TRANSMITTED")
                .setContentText("Emergency contacts alerted with live GPS. Audio recording.")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .build()
            notificationManager?.notify(NOTIFICATION_ID, alertNotification)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to trigger SOS natively: ${e.message}")
        }
    }

    data class AudioProbeResult(
        val record: AudioRecord,
        val sampleRate: Int,
        val bufferSize: Int
    )

    private fun findBestAudioRecord(): AudioProbeResult? {
        if (ContextCompat.checkSelfPermission(
                this,
                android.Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            Log.e(TAG, "RECORD_AUDIO permission not granted in SafeWalkService")
            return null
        }

        val sampleRates = intArrayOf(16000, 44100, 48000, 22050, 8000)
        val sources = intArrayOf(
            MediaRecorder.AudioSource.MIC,
            MediaRecorder.AudioSource.VOICE_RECOGNITION,
            MediaRecorder.AudioSource.DEFAULT
        )

        for (source in sources) {
            for (rate in sampleRates) {
                try {
                    val minBuf = AudioRecord.getMinBufferSize(
                        rate,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT
                    )
                    if (minBuf > 0) {
                        val bufSize = (minBuf * 2).coerceAtLeast(4096)
                        val rec = AudioRecord(
                            source,
                            rate,
                            AudioFormat.CHANNEL_IN_MONO,
                            AudioFormat.ENCODING_PCM_16BIT,
                            bufSize
                        )
                        if (rec.state == AudioRecord.STATE_INITIALIZED) {
                            Log.i(TAG, "AudioRecord successfully probed: source=$source, rate=$rate, bufferSize=$bufSize")
                            return AudioProbeResult(rec, rate, bufSize)
                        } else {
                            rec.release()
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "AudioRecord probe failed for source=$source, rate=$rate: ${e.message}")
                }
            }
        }
        return null
    }

    private fun stopAudioThreadOnly() {
        isRecordingAudio = false
        try {
            audioRecordThread?.join(600)
        } catch (_: Exception) {}
        audioRecordThread = null

        try {
            audioRecord?.stop()
            audioRecord?.release()
        } catch (_: Exception) {}
        audioRecord = null

        try {
            audioWakeLock?.let { if (it.isHeld) it.release() }
        } catch (_: Exception) {}
        audioWakeLock = null
    }

    private fun checkStopService() {
        if (!isServiceRunning && !isRecordingAudio) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                } else {
                    @Suppress("DEPRECATION")
                    stopForeground(true)
                }
                stopSelf()
            } catch (_: Exception) {}
        }
    }

    // Dual-Sink Audio Engine: Slices 5s PCM chunks over Socket.IO and saves unbroken master WAV
    fun startLockScreenAudio(alertId: String): String? {
        try {
            stopAudioThreadOnly()

            // Acquire temporary partial wake lock so CPU stays awake during 30s emergency recording
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            audioWakeLock = powerManager?.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "SafeWalkService::AudioRecordWakeLock"
            )?.apply {
                setReferenceCounted(false)
                acquire(45 * 1000L)
            }

            val probe = findBestAudioRecord()
            if (probe == null) {
                Log.e(TAG, "AudioRecord failed to initialize across all sample rates and sources!")
                try {
                    audioWakeLock?.let { if (it.isHeld) it.release() }
                } catch (_: Exception) {}
                audioWakeLock = null

                // Notify JavaScript that native AudioRecord failed so it activates fallback recorder!
                val failMap = Arguments.createMap().apply {
                    putString("alertId", alertId)
                    putString("error", "NATIVE_RECORD_FAILED")
                }
                SafeWalkServiceModule.emitEvent("onSosAudioFailed", failMap)
                checkStopService()
                return null
            }

            audioRecord = probe.record
            val sampleRate = probe.sampleRate
            val bufferSize = probe.bufferSize
            val bytesPerSecond = sampleRate * 1 * 2 // 16-bit mono = 2 bytes per sample
            val target5SecBytes = bytesPerSecond * 5

            val outputDir = File(cacheDir, "emergency_audio").apply { if (!exists()) mkdirs() }
            currentAudioFile = File(outputDir, "sos_${alertId}_master.wav")

            audioRecord?.startRecording()
            isRecordingAudio = true

            audioRecordThread = Thread {
                val buffer = ByteArray(bufferSize)
                var totalBytesRecorded = 0
                val chunkBuffer = ByteArrayOutputStream(target5SecBytes)
                var chunkSeq = 1
                val maxDurationMs = 30000L
                val startTime = System.currentTimeMillis()
                val fileOut = FileOutputStream(currentAudioFile)
                fileOut.write(ByteArray(44)) // WAV header placeholder

                try {
                    while (isRecordingAudio && (System.currentTimeMillis() - startTime < maxDurationMs)) {
                        val read = audioRecord?.read(buffer, 0, buffer.size) ?: 0
                        if (read > 0) {
                            fileOut.write(buffer, 0, read)
                            chunkBuffer.write(buffer, 0, read)
                            totalBytesRecorded += read

                            // When 5 seconds of PCM accumulated
                            if (chunkBuffer.size() >= target5SecBytes) {
                                val pcmBytes = chunkBuffer.toByteArray()
                                chunkBuffer.reset()
                                val chunkWav = createWavHeaderBytes(pcmBytes.size, sampleRate, 1, 16) + pcmBytes
                                val base64Chunk = Base64.encodeToString(chunkWav, Base64.NO_WRAP)

                                val map = Arguments.createMap().apply {
                                    putString("alertId", alertId)
                                    putInt("seq", chunkSeq)
                                    putInt("totalChunksExpected", 6)
                                    putDouble("durationSec", 5.0)
                                    putInt("sampleRate", sampleRate)
                                    putString("mimeType", "audio/wav")
                                    putString("data", base64Chunk)
                                    putBoolean("isLast", false)
                                }
                                SafeWalkServiceModule.emitEvent("onSosAudioChunk", map)
                                chunkSeq++
                            }
                        }
                    }

                    // Flush any remaining partial bytes if recording ended early or at 30s
                    if (chunkBuffer.size() > 0) {
                        val pcmBytes = chunkBuffer.toByteArray()
                        chunkBuffer.reset()
                        val chunkWav = createWavHeaderBytes(pcmBytes.size, sampleRate, 1, 16) + pcmBytes
                        val base64Chunk = Base64.encodeToString(chunkWav, Base64.NO_WRAP)

                        val map = Arguments.createMap().apply {
                            putString("alertId", alertId)
                            putInt("seq", chunkSeq)
                            putInt("totalChunksExpected", chunkSeq)
                            putDouble("durationSec", pcmBytes.size.toDouble() / bytesPerSecond.toDouble())
                            putInt("sampleRate", sampleRate)
                            putString("mimeType", "audio/wav")
                            putString("data", base64Chunk)
                            putBoolean("isLast", true)
                        }
                        SafeWalkServiceModule.emitEvent("onSosAudioChunk", map)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Audio recording thread error: ${e.message}")
                } finally {
                    try {
                        fileOut.flush()
                        fileOut.close()
                    } catch (_: Exception) {}

                    // Overwrite the 44-byte WAV header on the continuous master file
                    if (currentAudioFile != null && totalBytesRecorded > 0) {
                        try {
                            val raf = RandomAccessFile(currentAudioFile, "rw")
                            raf.seek(0)
                            raf.write(createWavHeaderBytes(totalBytesRecorded, sampleRate, 1, 16))
                            raf.close()
                            Log.i(TAG, "Master WAV written successfully: ${currentAudioFile?.absolutePath} ($totalBytesRecorded bytes)")
                        } catch (e: Exception) {
                            Log.w(TAG, "Failed to write master WAV header: ${e.message}")
                        }
                    }

                    try {
                        audioRecord?.stop()
                        audioRecord?.release()
                    } catch (_: Exception) {}
                    audioRecord = null
                    isRecordingAudio = false

                    try {
                        audioWakeLock?.let { if (it.isHeld) it.release() }
                    } catch (_: Exception) {}
                    audioWakeLock = null

                    // Notify mobile JS that master recording is complete and ready for Cloudinary upload
                    val completionMap = Arguments.createMap().apply {
                        putString("alertId", alertId)
                        putString("filePath", currentAudioFile?.absolutePath ?: "")
                        putBoolean("success", totalBytesRecorded > 0)
                        putInt("bytesRecorded", totalBytesRecorded)
                    }
                    SafeWalkServiceModule.emitEvent("onSosAudioMasterCompleted", completionMap)

                    checkStopService()
                }
            }.apply {
                priority = Thread.MAX_PRIORITY
                start()
            }

            Log.i(TAG, "Dual-sink audio recording started ($sampleRate Hz): ${currentAudioFile?.absolutePath}")
            return currentAudioFile?.absolutePath
        } catch (e: Exception) {
            Log.w(TAG, "Failed to start dual-sink audio: ${e.message}")
            try {
                audioWakeLock?.let { if (it.isHeld) it.release() }
            } catch (_: Exception) {}
            audioWakeLock = null
            checkStopService()
            return null
        }
    }


    fun stopAudioRecording(): String? {
        val path = currentAudioFile?.absolutePath
        stopAudioThreadOnly()
        checkStopService()
        return path
    }


    private fun createWavHeaderBytes(
        dataLength: Int,
        sampleRate: Int = 16000,
        channels: Int = 1,
        bitsPerSample: Int = 16
    ): ByteArray {
        val header = ByteArray(44)
        val byteRate = sampleRate * channels * bitsPerSample / 8
        val blockAlign = channels * bitsPerSample / 8
        val totalLength = dataLength + 36

        // "RIFF"
        header[0] = 'R'.code.toByte()
        header[1] = 'I'.code.toByte()
        header[2] = 'F'.code.toByte()
        header[3] = 'F'.code.toByte()
        header[4] = (totalLength and 0xff).toByte()
        header[5] = ((totalLength shr 8) and 0xff).toByte()
        header[6] = ((totalLength shr 16) and 0xff).toByte()
        header[7] = ((totalLength shr 24) and 0xff).toByte()

        // "WAVE"
        header[8] = 'W'.code.toByte()
        header[9] = 'A'.code.toByte()
        header[10] = 'V'.code.toByte()
        header[11] = 'E'.code.toByte()

        // "fmt "
        header[12] = 'f'.code.toByte()
        header[13] = 'm'.code.toByte()
        header[14] = 't'.code.toByte()
        header[15] = ' '.code.toByte()
        header[16] = 16
        header[17] = 0
        header[18] = 0
        header[19] = 0
        header[20] = 1 // PCM
        header[21] = 0
        header[22] = channels.toByte()
        header[23] = 0
        header[24] = (sampleRate and 0xff).toByte()
        header[25] = ((sampleRate shr 8) and 0xff).toByte()
        header[26] = ((sampleRate shr 16) and 0xff).toByte()
        header[27] = ((sampleRate shr 24) and 0xff).toByte()
        header[28] = (byteRate and 0xff).toByte()
        header[29] = ((byteRate shr 8) and 0xff).toByte()
        header[30] = ((byteRate shr 16) and 0xff).toByte()
        header[31] = ((byteRate shr 24) and 0xff).toByte()
        header[32] = blockAlign.toByte()
        header[33] = 0
        header[34] = bitsPerSample.toByte()
        header[35] = 0

        // "data"
        header[36] = 'd'.code.toByte()
        header[37] = 'a'.code.toByte()
        header[38] = 't'.code.toByte()
        header[39] = 'a'.code.toByte()
        header[40] = (dataLength and 0xff).toByte()
        header[41] = ((dataLength shr 8) and 0xff).toByte()
        header[42] = ((dataLength shr 16) and 0xff).toByte()
        header[43] = ((dataLength shr 24) and 0xff).toByte()

        return header
    }

    private fun stopSafeWalk() {
        isServiceRunning = false

        // Inform backend natively that journey is completed/stopped
        if (journeyId.isNotEmpty()) {
            try {
                val reqBuilder = Request.Builder()
                    .url("https://safora-backend.onrender.com/api/journeys/$journeyId/complete")
                    .patch("{}".toRequestBody("application/json; charset=utf-8".toMediaType()))
                if (authToken.isNotEmpty()) {
                    reqBuilder.header("Authorization", "Bearer $authToken")
                }
                httpClient.newCall(reqBuilder.build()).enqueue(object : Callback {
                    override fun onFailure(call: Call, e: IOException) {}
                    override fun onResponse(call: Call, response: Response) { response.close() }
                })
            } catch (e: Exception) {
                Log.w(TAG, "Error notifying journey completion: ${e.message}")
            }
        }

        try {
            locationManager?.removeUpdates(this)
        } catch (e: Exception) {
            Log.w(TAG, "Error removing location updates: ${e.message}")
        }

        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }

        checkStopService()
    }

    override fun onLocationChanged(location: Location) {
        updateProgress(location.latitude, location.longitude)
        postLocationNatively(
            location.latitude,
            location.longitude,
            if (location.hasSpeed()) location.speed else null,
            getBatteryPercentage()
        )
    }

    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    override fun onDestroy() {
        isServiceRunning = false
        stopAudioThreadOnly()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
