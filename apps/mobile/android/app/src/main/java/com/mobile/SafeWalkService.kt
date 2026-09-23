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
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File

class SafeWalkService : Service(), LocationListener {

    companion object {
        const val TAG = "SafeWalkService"
        const val CHANNEL_ID = "safewalk_corridor"
        const val NOTIFICATION_ID = 9001

        const val ACTION_START = "com.mobile.action.START_SAFE_WALK"
        const val ACTION_STOP = "com.mobile.action.STOP_SAFE_WALK"
        const val ACTION_RECORD_AUDIO = "com.mobile.action.RECORD_AUDIO"

        const val EXTRA_JOURNEY_ID = "journey_id"
        const val EXTRA_DEST_LAT = "dest_lat"
        const val EXTRA_DEST_LNG = "dest_lng"
        const val EXTRA_ALERT_ID = "alert_id"

        var isServiceRunning = false
            private set
    }

    private var journeyId: String = ""
    private var destLat: Double = 0.0
    private var destLng: Double = 0.0

    private var wakeLock: PowerManager.WakeLock? = null
    private var locationManager: LocationManager? = null
    private var notificationManager: NotificationManager? = null

    private var mediaRecorder: MediaRecorder? = null
    private var currentAudioFile: File? = null

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
                startSafeWalkForeground()
            }
            ACTION_STOP -> {
                stopSafeWalk()
            }
            ACTION_RECORD_AUDIO -> {
                val alertId = intent.getStringExtra(EXTRA_ALERT_ID) ?: "emergency"
                startLockScreenAudio(alertId)
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

        // 1. Acquire partial wake lock to keep GPS/thread alive when screen is locked (TRG-2-lite)
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "SafeWalkService::CorridorWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(60 * 60 * 1000L) // 1 hour max safety timeout
        }

        // 2. Start initial foreground notification
        val notification = buildNotification("Safe Walk Activated — monitoring corridor route")
        startForeground(NOTIFICATION_ID, notification)

        // 3. Register native location updates
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

    private fun buildNotification(contentText: String): Notification {
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🚶‍♀️ SAFORA Safe Walk Active")
            .setContentText(contentText)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    // Called on location update to recalculate straight-line distance and ETA (NAV-1)
    fun updateProgress(currentLat: Double, currentLng: Double) {
        if (destLat == 0.0 && destLng == 0.0) return

        val results = FloatArray(1)
        Location.distanceBetween(currentLat, currentLng, destLat, destLng, results)
        val distMeters = results[0]

        // Calibrated walking speed = 1.60 m/s
        val walkSpeed = 1.60
        val etaSecs = distMeters / walkSpeed
        val etaMins = Math.max(1, Math.ceil(etaSecs / 60.0).toInt())

        val distText = if (distMeters >= 1000) {
            String.format("%.1f km", distMeters / 1000.0)
        } else {
            "${distMeters.toInt()}m"
        }

        val contentText = "$distText to go — about $etaMins min"
        val notification = buildNotification(contentText)
        notificationManager?.notify(NOTIFICATION_ID, notification)
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
