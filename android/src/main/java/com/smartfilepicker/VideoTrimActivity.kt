package com.smartfilepicker

import android.app.Activity
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class VideoTrimActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val inputUriString = intent.getStringExtra(EXTRA_INPUT_URI)
    if (inputUriString.isNullOrBlank()) {
      setResult(Activity.RESULT_CANCELED)
      finish()
      return
    }

    val maxDurationMs = intent.getLongExtra(EXTRA_MAX_DURATION_MS, -1L).takeIf { it > 0L }
    val minDurationMs = intent.getLongExtra(EXTRA_MIN_DURATION_MS, -1L).takeIf { it > 0L } ?: 0L

    val trimVideoClass = findTrimVideoClass()
    if (trimVideoClass == null) {
      // Dependency missing or class renamed.
      setResult(Activity.RESULT_CANCELED)
      finish()
      return
    }

    val startForResult =
      registerForActivityResult(androidx.activity.result.contract.ActivityResultContracts.StartActivityForResult()) { result ->
        val data = result.data
        if (result.resultCode == Activity.RESULT_OK && data != null) {
          val trimmedPath = getTrimmedVideoPath(trimVideoClass, data)
          if (trimmedPath.isNullOrBlank()) {
            setResult(Activity.RESULT_OK) // treated as cancel by module
          } else {
            setResult(Activity.RESULT_OK, intentForResult(trimmedPath))
          }
        } else {
          setResult(Activity.RESULT_OK) // treated as cancel by module
        }
        finish()
      }

    val builder = trimVideoClass
      .getMethod("activity", String::class.java)
      .invoke(null, inputUriString)
      ?: run {
        setResult(Activity.RESULT_CANCELED)
        finish()
        return
      }

    // disableCompression()
    runCatching {
      builder.javaClass.getMethod("disableCompression").invoke(builder)
    }

    val minSec = (minDurationMs / 1000L).toInt().coerceAtLeast(0)
    val maxSec = (maxDurationMs?.div(1000L))?.toInt()?.coerceAtLeast(0)

    val trimTypeClass = findTrimTypeClass()
    if (trimTypeClass != null) {
      val setTrimType = builder.javaClass.methods.firstOrNull { it.name == "setTrimType" && it.parameterTypes.size == 1 }
      val setMinDuration = builder.javaClass.methods.firstOrNull { it.name == "setMinDuration" && it.parameterTypes.size == 1 }
      val setFixedDuration = builder.javaClass.methods.firstOrNull { it.name == "setFixedDuration" && it.parameterTypes.size == 1 }
      val setMinToMax = builder.javaClass.methods.firstOrNull { it.name == "setMinToMax" && it.parameterTypes.size == 2 }

      fun enumConst(name: String): Any? =
        runCatching { java.lang.Enum.valueOf(trimTypeClass as Class<out Enum<*>>, name) }.getOrNull()

      if (minSec > 0 && maxSec != null && maxSec > 0) {
        val tt = enumConst("MIN_MAX_DURATION")
        if (tt != null && setTrimType != null && setMinToMax != null) {
          setTrimType.invoke(builder, tt)
          setMinToMax.invoke(builder, minSec, maxSec)
        }
      } else if (maxSec != null && maxSec > 0) {
        // Library doesn't have "max only"; approximate using min=1s.
        val tt = enumConst("MIN_MAX_DURATION")
        if (tt != null && setTrimType != null && setMinToMax != null) {
          setTrimType.invoke(builder, tt)
          setMinToMax.invoke(builder, 1, maxSec)
        }
      } else {
        // Default trim type (unlimited max). Min duration is validated after trimming.
      }
    }

    // start(Activity, ActivityResultLauncher)
    builder.javaClass
      .getMethod("start", Activity::class.java, androidx.activity.result.ActivityResultLauncher::class.java)
      .invoke(builder, this, startForResult)
  }

  private fun intentForResult(path: String) =
    android.content.Intent().putExtra(EXTRA_OUTPUT_PATH, path)

  private fun findTrimVideoClass(): Class<*>? {
    val candidates = listOf(
      "com.gowtham.library.ui.TrimVideo",
      "com.gowtham.library.utils.TrimVideo",
      "com.gowtham.library.TrimVideo"
    )
    for (name in candidates) {
      val cls = runCatching { Class.forName(name) }.getOrNull()
      if (cls != null) return cls
    }
    return null
  }

  private fun findTrimTypeClass(): Class<*>? {
    val candidates = listOf(
      "com.gowtham.library.utils.TrimType",
      "com.gowtham.library.TrimType"
    )
    for (name in candidates) {
      val cls = runCatching { Class.forName(name) }.getOrNull()
      if (cls != null && cls.isEnum) return cls
    }
    return null
  }

  private fun getTrimmedVideoPath(trimVideoClass: Class<*>, data: android.content.Intent): String? {
    // Signature differs across versions; treat result as string-ish.
    val m = trimVideoClass.methods.firstOrNull { it.name == "getTrimmedVideoPath" && it.parameterTypes.size == 1 } ?: return null
    return runCatching { m.invoke(null, data)?.toString() }.getOrNull()
  }

  companion object {
    const val EXTRA_INPUT_URI = "sfp_input_uri"
    const val EXTRA_MAX_DURATION_MS = "sfp_max_duration_ms"
    const val EXTRA_MIN_DURATION_MS = "sfp_min_duration_ms"
    const val EXTRA_OUTPUT_PATH = "sfp_output_path"
  }
}
