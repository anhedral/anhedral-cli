package dev.anhedral.registryqa

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.*
import java.io.File
import kotlin.math.abs
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TestName
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class RegistryAndroidTests {
  @get:Rule val testName = TestName()
  private val packageName = "dev.anhedral.registryqa"
  private fun AccessibilityNodeInfo.named(name: String): Boolean =
    textAsString()?.trim() == name || contentDescription?.toString()?.trim() == name

  @Before fun openGallery() = uiAutomator {
    // Animating native placeholders must remain testable without changing OS animation settings.
    Configurator.getInstance().setWaitForIdleTimeout(0)
    startApp(packageName)
    onElementOrNull(timeoutMs = 1_000) { named("All examples") }?.click()
    onElement(timeoutMs = 30_000) { named("Find an example") }.waitForStable()
  }
  private fun UiAutomatorTestScope.openStory(name: String) {
    onElement { named("Find an example") }.setText(name)
    // Resolve the edited control and its filtered row before injecting a physical tap.
    onElement { named("Find an example") && textAsString() == name }
    onElement { named("Open " + name) }.apply { waitForStable(); click() }
    onElement { textAsString() == name }
  }
  private fun UiAutomatorTestScope.label(name: String): UiObject2 {
    for (direction in listOf(Direction.DOWN, Direction.UP)) {
      for (attempt in 0..24) {
        try {
          val container = onElementOrNull(timeoutMs = 200) { isScrollable }
          val viewport = container?.visibleBounds ?: Rect(0, 0, device.displayWidth, device.displayHeight)
          val visible: AccessibilityNodeInfo.() -> Boolean = {
            val bounds = Rect().also { getBoundsInScreen(it) }
            named(name) && isVisibleToUser && !bounds.isEmpty && viewport.contains(bounds.centerX(), bounds.centerY())
          }
          onElementOrNull(timeoutMs = 250, block = visible)?.let { return it }
          if (container == null || !container.scroll(direction, 0.6f)) break
        } catch (_: StaleObjectException) {
          // Layout state and navigation can replace nodes. Resolve fresh native objects
          // before the next assertion or gesture instead of retaining a stale container.
        }
      }
    }
    throw AssertionError("Missing visible native label: " + name)
  }
  @After fun captureNativeEvidence() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val run = InstrumentationRegistry.getArguments().getString("evidenceRun") ?: "local"
    require(run.matches(Regex("[A-Za-z0-9_-]+")))
    val directory = File(instrumentation.targetContext.getExternalFilesDir(null), "native-qa/" + run)
    directory.mkdirs()
    val device = UiDevice.getInstance(instrumentation)
    assertTrue("Could not capture the native screen", device.takeScreenshot(File(directory, testName.methodName + ".png")))
    device.dumpWindowHierarchy(File(directory, testName.methodName + ".xml"))
  }
  @Test fun authoredPaginationRetainsSelectionAndBoundaries() = uiAutomator {
    openStory("new-york-v4/pagination-demo")
    label("3").click()
    onElement { named("3") && isSelected }
    onElement { named("Next page") && !isEnabled }
    label("1").click()
    onElement { named("1") && isSelected }
    onElement { named("Previous page") && !isEnabled }
  }
  @Test fun authoredToggleRetainsNativeSelection() = uiAutomator {
    openStory("new-york-v4/toggle-demo")
    onElement { named("Toggle bookmark") && !isSelected }.click()
    onElement { named("Toggle bookmark") && isSelected }
  }
  @Test fun authoredLabelFocusesTheAssociatedNativeInput() = uiAutomator {
    openStory("new-york-v4/input-with-label")
    val input = onElement { named("Email") && className == "android.widget.EditText" && !isFocused }
    val bounds = input.visibleBounds
    val density = InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density
    // The associated label is excluded from duplicate accessibility traversal. Touch its authored
    // 20dp line above the input's 12dp gap, then prove focus before sending any text.
    device.click(bounds.left + (20 * density).toInt(), bounds.top - (22 * density).toInt())
    onElement { named("Email") && className == "android.widget.EditText" && isFocused }
    type("native@example.com")
    onElement { named("Email") && textAsString() == "native@example.com" }
  }
  @Test fun allButtonPresetsRetainGeometryAndActions() = uiAutomator {
    openStory("native/button-preset-matrix")
    val density = InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density
    val presets = listOf("vega" to 36, "nova" to 32, "maia" to 36, "lyra" to 32, "mira" to 28, "luma" to 36, "sera" to 40, "rhea" to 32)
    for ((name, height) in presets) {
      val button = label("Native preset " + name)
      assertTrue("Incorrect native height for " + name, abs(button.visibleBounds.height() / density - height) <= 1.0f)
      button.click()
      label("Selected preset: " + name)
    }
  }
  @Test fun inlineAndComposedLinksReachNativeDestinations() = uiAutomator {
    openStory("native/navigation-contract")
    label("the native route").click()
    label("Visited route: /native")
    label("Composed native route").click()
    label("Visited route: /login")
    label("Native section anchor").click()
    label("Visited anchor: section")
  }
  @Test fun composedNativeHostsDeliverExactlyOneAction() = uiAutomator {
    openStory("native/render-hosts")
    val actions = listOf("Registry view action" to "view", "Text badge action" to "text", "Registry click action" to "registry")
    for ((index, action) in actions.withIndex()) {
      label(action.first).click()
      label("Host action: " + action.second)
      label("Host count: " + (index + 1))
    }
  }
  @Test fun nativeLayoutPrimitivesMeasureAuthoredGeometry() = uiAutomator {
    openStory("native/layout-primitives")
    for (status in listOf("Ratio geometry: 160x80", "Horizontal geometry: 160x1", "Vertical geometry: 1x80", "Skeleton geometry: 100x20")) label(status)
  }
  @Test fun authoredDescriptionsRetainTermsAndValues() = uiAutomator {
    openStory("base/separator-example")
    for (index in 1..3) label("Item " + index + ": Value " + index)
  }
  @Test fun nativeCardPresetsRetainMeasuredSpacing() = uiAutomator {
    openStory("native/card-metrics")
    val heights = mapOf("vega" to listOf(68,52), "nova" to listOf(52,44), "maia" to listOf(68,52), "lyra" to listOf(52,44), "mira" to listOf(52,44), "luma" to listOf(68,52), "sera" to listOf(84,60), "rhea" to listOf(60,52))
    for ((style, values) in heights) for ((index,size) in listOf("default","sm").withIndex()) label("Card " + style + " " + size + " geometry: 160x" + values[index])
    label("Card footer geometry: 160x105")
  }

  @Test fun authoredCardControlsAndListRetainNativeSemantics() = uiAutomator {
    openStory("base/card-example")
    label("24px").click()
    onElement { named("24px") && isSelected }
    onElement { named("16px") && !isSelected }
    label("1. New analytics widgets for daily/weekly metrics")
    label("5. Follow-up meeting scheduled for next Tuesday")
  }

}
