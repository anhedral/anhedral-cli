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
          val container = onElementOrNull(timeoutMs = 200) { viewIdResourceName == "registry-story-scroll" }
          val viewport = container?.visibleBounds ?: Rect(0, 0, device.displayWidth, device.displayHeight)
          val visible: AccessibilityNodeInfo.() -> Boolean = {
            val bounds = Rect().also { getBoundsInScreen(it) }
            named(name) && isVisibleToUser && !bounds.isEmpty && viewport.contains(bounds.centerX(), bounds.centerY())
          }
          onElementOrNull(timeoutMs = 250, block = visible)?.let { return it }
          if (container == null) break
          // A false scroll result can race the freshly mounted native layout. Keep
          // resolving the owned story viewport and allow the injected gesture to settle.
          val moved = container.scroll(direction, 0.6f)
          Thread.sleep(150)
          println("Registry reveal: " + name + " " + direction + " moved=" + moved + " viewport=" + viewport)
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
    device.click(bounds.centerX(), bounds.top - (22 * density).toInt())
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

  @Test fun callbackButtonsAndComposedControlsPreserveNativeActions() = uiAutomator {
    openStory("native/button-callbacks")
    label("Open composed callback select").click()
    label("Team callback plan").click()
    label("Callback selected plan: two")
    label("Callback submits: 0")
    label("Callback view action").click()
    label("Callback text action").click()
    label("Callback view count: 1")
    label("Callback text count: 1")
    label("Submit callback form").click()
    label("Callback submits: 1")
    label("Begin callback pending").click()
    onElement { contentDescription?.toString()?.startsWith("Callback pending") == true && !isEnabled }
  }

  @Test fun sourceSpinnerRetainsNativeGlyphGeometryAndActions() = uiAutomator {
    openStory("native/spinner-paint")
    label("Spinner geometry: 24x24")
    label("Badge spinner geometry: 12x12")
    label("Spinner actions: 0")
    label("Spinner action").click()
    label("Spinner actions: 1")
    label("Stop native spinner").click()
    label("Spinner motion stopped")
    label("Native source spinner")
  }

  @Test fun nativeInputsRetainSourceHeightsAndTextareaResizes() = uiAutomator {
    openStory("native/input-metrics")
    val density=InstrumentationRegistry.getInstrumentation().targetContext.resources.displayMetrics.density
    for ((name,height) in listOf("vega" to 36,"nova" to 32,"maia" to 36,"lyra" to 32,"mira" to 28,"luma" to 36,"sera" to 40,"rhea" to 32)) {
      val field=label("Native input "+name)
      assertTrue("Incorrect input height: "+name,abs(field.visibleBounds.height()/density-height)<=1.0f)
    }
    label("Legacy textarea height: 90")
    label("Textarea height: 64")
    onElement { viewIdResourceName == "registry-story-scroll" }.scroll(Direction.DOWN,0.6f)
    label("Native growing textarea").setText("one\ntwo\nthree\nfour\nfive\nsix\nseven")
    onElement(timeoutMs=15000) { textAsString()?.let { it.startsWith("Textarea height: ") && (it.substringAfterLast(": ").toIntOrNull() ?: 0)>64 } == true }
    label("Native growing textarea").setText("")
    label("Textarea height: 64")
  }
  @Test fun systemDocumentPickerSelectsAndCancelsWithoutLosingWork() = uiAutomator {
    openStory("native/file-input")
    onElement { contentDescription?.toString()?.startsWith("Native document") == true }.click()
    device.wait(Until.findObject(By.desc("Show roots")),15000)
    if (!device.hasObject(By.text("Open from"))) device.findObject(By.desc("Show roots")).click()
    assertTrue("Document roots drawer did not open",device.wait(Until.hasObject(By.text("Open from")),5000))
    device.waitForIdle(1000)
    device.wait(Until.findObject(By.text("Downloads")),5000).click()
    assertTrue("Document roots drawer did not close",device.wait(Until.gone(By.text("Open from")),5000))
    device.wait(Until.findObject(By.text("anhedral-native-file-qa.txt")),15000).click()
    label("Document selection: anhedral-native-file-qa.txt:true")
    onElement { contentDescription?.toString()?.startsWith("Native document") == true }.click()
    onElement(timeoutMs=15000) { packageName?.toString()?.contains("documentsui")==true }
    device.pressBack()
    label("Document cancellations: 1")
    label("Document selection: anhedral-native-file-qa.txt:true")
  }
  @Test fun systemDateAndTimePickersCommitAndCancel() = uiAutomator {
    openStory("native/temporal-input")
    onElement { contentDescription?.toString()?.startsWith("Native date") == true }.click()
    onElement(timeoutMs=15000) { contentDescription?.toString()?.let { it.contains("17") && it.contains("October") && it.contains("2026") } == true }.click()
    onElement { textAsString()=="OK" }.click()
    label("Date selection: 2026-10-17")
    onElement { contentDescription?.toString()?.startsWith("Native time") == true }.click()
    onElement(timeoutMs=15000) { textAsString()=="OK" }.click()
    label("Time selection: 15:42")
    onElement { contentDescription?.toString()?.startsWith("Native date") == true }.click()
    onElement(timeoutMs=15000) { textAsString()=="CANCEL" || textAsString()=="Cancel" }.click()
    label("Date selection: 2026-10-17")
  }

}
