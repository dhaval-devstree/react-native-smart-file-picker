package com.smartfilepicker

import android.os.Bundle
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.yalantis.ucrop.UCropActivity

/**
 * uCrop 2.2.x doesn't handle Android edge-to-edge insets (status/navigation bars),
 * so its toolbar and bottom controls can render underneath system bars.
 *
 * This activity applies system bar insets as padding to the uCrop toolbar and controls.
 */
class SmartUCropActivity : UCropActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Ensure we receive and handle WindowInsets ourselves.
    WindowCompat.setDecorFitsSystemWindows(window, false)
    super.onCreate(savedInstanceState)

    val root = findViewById<View?>(com.yalantis.ucrop.R.id.ucrop_photobox) ?: return
    val toolbar = findViewById<View?>(com.yalantis.ucrop.R.id.toolbar)
    val controlsWrapper = findViewById<View?>(com.yalantis.ucrop.R.id.controls_wrapper)

    val toolbarPaddingLeft = toolbar?.paddingLeft ?: 0
    val toolbarPaddingTop = toolbar?.paddingTop ?: 0
    val toolbarPaddingRight = toolbar?.paddingRight ?: 0
    val toolbarPaddingBottom = toolbar?.paddingBottom ?: 0

    val controlsPaddingLeft = controlsWrapper?.paddingLeft ?: 0
    val controlsPaddingTop = controlsWrapper?.paddingTop ?: 0
    val controlsPaddingRight = controlsWrapper?.paddingRight ?: 0
    val controlsPaddingBottom = controlsWrapper?.paddingBottom ?: 0

    ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
      val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())

      toolbar?.setPadding(
        toolbarPaddingLeft,
        toolbarPaddingTop + systemBars.top,
        toolbarPaddingRight,
        toolbarPaddingBottom
      )

      controlsWrapper?.setPadding(
        controlsPaddingLeft,
        controlsPaddingTop,
        controlsPaddingRight,
        controlsPaddingBottom + systemBars.bottom
      )

      insets
    }

    ViewCompat.requestApplyInsets(root)
  }
}

