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
import android.media.MediaRecorder
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

    private var mediaRecorder: MediaRecorder? = null
    private var currentAudioFile: File? = null

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
                startLockScreenAudio(alertId)
            }
            ACTION_TRIGGER_SOS -> {
                triggerEmergencySosNatively()
            }
        }

        return START_STICKY
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
        startForeground(NOTIFICATION_ID, notification)

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

    // Task 5.2 TRG-6-lite: Start 30s audio recording using the active foreground service's microphone access
    fun startLockScreenAudio(alertId: String): String? {
        try {
            stopAudioRecording()

            val outputDir = File(cacheDir, "emergency_audio").apply { if (!exists()) mkdirs() }
            currentAudioFile = File(outputDir, "sos_${alertId}_lockscreen.m4a")

            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(applicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioEncodingBitRate(64000)
                setAudioSamplingRate(44100)
                setOutputFile(currentAudioFile?.absolutePath)
                prepare()
                start()
            }

            Log.i(TAG, "Lock-screen audio recording started: ${currentAudioFile?.absolutePath}")
            return currentAudioFile?.absolutePath
        } catch (e: Exception) {
            Log.w(TAG, "Failed to start lock-screen audio: ${e.message}")
            return null
        }
    }

    fun stopAudioRecording(): String? {
        val path = currentAudioFile?.absolutePath
        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping mediaRecorder: ${e.message}")
        } finally {
            mediaRecorder = null
        }
        return path
    }

    private fun stopSafeWalk() {
        isServiceRunning = false
        stopAudioRecording()

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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
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
        stopSafeWalk()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
