import XCTest
final class RegistryUITests: XCTestCase {
  private let authoredStoryCount = 0 // ANHEDRAL_AUTHORED_STORY_COUNT
  func testProgressPresetsRetainNativeGeometryRangeFormattingAndUnknownState() {
    let app=XCUIApplication(bundleIdentifier:"dev.anhedral.registryqa")
    app.launch();openStory("native/progress-contract",in:app)
    let scroll=storyScroll(app)
    func target(_ name:String)->XCUIElement {app.descendants(matching:.any).matching(identifier:name).firstMatch}
    func press(_ name:String) {
      let element=target(name)
      for _ in 0..<12 {if element.exists && element.isHittable {break};scroll.swipeUp()}
      for _ in 0..<12 {if element.exists && element.isHittable {break};scroll.swipeDown()}
      XCTAssertTrue(element.isHittable,name);element.tap()
    }
    let presets=["nova","vega","maia","lyra","mira","luma","sera","rhea","default","new-york","new-york-v4"],heights=[4,6,12,4,4,12,2,8,16,8,8]
    for (index,preset) in presets.enumerated() {
      XCTAssertTrue(app.staticTexts["Progress geometry: "+preset+":320x"+String(heights[index])].waitForExistence(timeout:10))
      press("Next progress preset")
    }
    let base=target("native-progress-base-range"),aria=target("native-progress-aria-range")
    XCTAssertTrue(base.exists);XCTAssertEqual(base.value as? String,"25%")
    XCTAssertTrue(aria.exists);XCTAssertEqual(aria.value as? String,"50%")
    let before=XCTAttachment(screenshot:app.screenshot());before.name="Native source progress range and formatting";before.lifetime = .keepAlways;add(before)
    press("Toggle unknown progress")
    XCTAssertTrue(app.staticTexts["Progress unknown: true"].waitForExistence(timeout:10))
    XCTAssertTrue((target("native-progress-base-unknown").value as? String ?? "").contains("indeterminate progress"))
    XCTAssertFalse((target("native-progress-aria-unknown").value as? String ?? "").contains("50%"))
    let image=XCTAttachment(screenshot:app.screenshot());image.name="Native source indeterminate progress";image.lifetime = .keepAlways;add(image)
    press("Toggle unknown progress")
    XCTAssertTrue(app.staticTexts["Progress unknown: false"].waitForExistence(timeout:10))
    XCTAssertEqual(target("native-progress-aria-unknown").value as? String,"50%")

  }
  func testNativeSelectControlsRetainSourceGeometryAndOptionSemantics() {
    let app=XCUIApplication(bundleIdentifier:"dev.anhedral.registryqa")
    app.launch();openStory("native/native-select-contract",in:app)
    let scroll=storyScroll(app)
    func target(_ name:String)->XCUIElement {app.descendants(matching:.any).matching(identifier:name).firstMatch}
    func press(_ name:String) {
      let element=target(name)
      for _ in 0..<12 {if element.exists && element.isHittable {break};scroll.swipeUp()}
      for _ in 0..<12 {if element.exists && element.isHittable {break};scroll.swipeDown()}
      XCTAssertTrue(element.isHittable,name);element.tap()
    }
    let presets=["nova","vega","maia","lyra","mira","luma","sera","rhea","new-york-v4"],heights=[32,36,36,32,28,36,40,32,36]
    for (index,preset) in presets.enumerated() {
      XCTAssertTrue(app.staticTexts["Native control geometry: "+preset+":"+String(heights[index])+":"+String(heights[index]-4)].waitForExistence(timeout:10))
      if preset == "mira" {
        let image=XCTAttachment(screenshot:app.screenshot());image.name="Native Select Mira compact source controls";image.lifetime = .keepAlways;add(image)
      }
      press("Next native control preset")
    }
    let intrinsic=target("Native intrinsic control")
    XCTAssertTrue(intrinsic.exists);XCTAssertGreaterThan(intrinsic.frame.width,150)
    press("Native option control")
    let blocked=target("Native blocked option");XCTAssertTrue(blocked.waitForExistence(timeout:10));XCTAssertFalse(blocked.isEnabled)
    press("Native text option")
    XCTAssertTrue(app.staticTexts["Native control selected: Native text option; changes=1"].waitForExistence(timeout:10))
    press("Native option control");press("Native empty choice")
    XCTAssertTrue(app.staticTexts["Native control selected: ; changes=2"].waitForExistence(timeout:10))
    XCTAssertFalse(target("Native disabled control").isEnabled)
    let image=XCTAttachment(screenshot:app.screenshot());image.name="Native Select source labels and option semantics";image.lifetime = .keepAlways;add(image)
  }
  func testSelectPresetsRetainNativeSelectionCollectionsAndSearch() {
    let app=XCUIApplication(bundleIdentifier:"dev.anhedral.registryqa")
    app.launch();openStory("native/select-contract",in:app)
    let scroll=storyScroll(app)
    func target(_ name:String)->XCUIElement { app.descendants(matching:.any).matching(identifier:name).firstMatch }
    func press(_ name:String) {
      let element=target(name)
      for _ in 0..<12 { if element.exists && element.isHittable {break};scroll.swipeUp() }
      for _ in 0..<12 { if element.exists && element.isHittable {break};scroll.swipeDown() }
      XCTAssertTrue(element.isHittable,name);element.tap()
    }
    let presets=["nova","vega","maia","lyra","mira","luma","sera","rhea","default","new-york","new-york-v4"],heights=[32,36,36,32,28,36,40,32,40,36,36]
    for (index,preset) in presets.enumerated() {
      XCTAssertTrue(app.staticTexts["Select preset: "+preset].waitForExistence(timeout:10))
      XCTAssertTrue(app.staticTexts["Select geometry: "+preset+":320x"+String(heights[index])].waitForExistence(timeout:10))
      press("Next select preset")
    }
    XCTAssertTrue(app.staticTexts["Select geometry: nova:320x32"].waitForExistence(timeout:10))
    press("Open fruit choices by label")
    let blocked=target("Fruit Blocked");XCTAssertTrue(blocked.waitForExistence(timeout:10));XCTAssertFalse(blocked.isEnabled)
    press("Fruit Beta")
    XCTAssertTrue(app.staticTexts["Selected native fruit: beta"].waitForExistence(timeout:10))
    press("Pick multiple native fruits");press("Multi Alpha");press("Multi Beta");press("Dismiss overlay")
    XCTAssertTrue(app.staticTexts["Selected native multiples: alpha,beta"].waitForExistence(timeout:10))
    XCTAssertTrue(app.staticTexts["Select value height: 20"].waitForExistence(timeout:10))
    press("Search native countries")
    let search=app.textFields["Search options"];XCTAssertTrue(search.waitForExistence(timeout:10))
    search.typeText("missing")
    XCTAssertTrue(app.staticTexts["No native countries"].waitForExistence(timeout:10))
    search.typeText(String(repeating:XCUIKeyboardKey.delete.rawValue,count:7)+"cote\n")
    XCTAssertFalse(target("Türkiye").exists)
    press("Côte d’Ivoire")
    XCTAssertTrue(app.staticTexts["Selected native country: ivory-coast"].waitForExistence(timeout:10))
    press("Open long native list")
    let selected=target("Native long option 29")
    let visible=NSPredicate { _,_ in selected.exists && selected.isHittable }
    expectation(for:visible,evaluatedWith:nil);waitForExpectations(timeout:15)
    let surface=app.otherElements["native-long-select-surface"]
    XCTAssertTrue(surface.exists)
    XCTAssertLessThan(surface.frame.minX,(app.frame.width-surface.frame.width)/3,"Left popup stayed centered")
    press("Native long option 28")
    XCTAssertTrue(app.staticTexts["Selected native long option: 28"].waitForExistence(timeout:10))
    app.buttons["Dark"].tap()
    press("Open long native list")
    let selectedNight=target("Native long option 28")
    expectation(for:NSPredicate {_,_ in selectedNight.exists && selectedNight.isHittable},evaluatedWith:nil);waitForExpectations(timeout:15)
    let screenshot=XCTAttachment(screenshot:app.screenshot());screenshot.name="Native dark select surface";screenshot.lifetime = .keepAlways;add(screenshot)
    press("Native long option 27")
    XCTAssertTrue(app.staticTexts["Selected native long option: 27"].waitForExistence(timeout:10))
    app.buttons["System"].tap()
  }
  func testInputGroupPresetsRetainGeometryEditingAndIndependentActions() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/input-group-contract", in: app)
    let scroll=storyScroll(app)
    func press(_ name:String) {
      let button=app.buttons[name]
      for _ in 0..<12 { if button.exists && button.isHittable { break }; scroll.swipeUp() }
      for _ in 0..<12 { if button.exists && button.isHittable { break }; scroll.swipeDown() }
      XCTAssertTrue(button.isHittable,name)
      button.tap()
    }
    let presets = ["nova","vega","maia","lyra","mira","luma","sera","rhea","default","new-york","new-york-v4"]
    let heights = [32,36,36,32,28,36,40,32,36,36,36]
    for (index,preset) in presets.enumerated() {
      XCTAssertTrue(app.staticTexts["Input group preset: " + preset].waitForExistence(timeout:10))
      XCTAssertTrue(app.staticTexts["Input group geometry: " + preset + ":320x" + String(heights[index])].waitForExistence(timeout:10))
      press("Next input group preset")
    }
    XCTAssertTrue(app.staticTexts["Input group geometry: nova:320x32"].waitForExistence(timeout:10))
    XCTAssertTrue(app.staticTexts["Group registration: inputs=1; refs=true; disabled=false"].waitForExistence(timeout:10))
    let input=app.textFields["Native grouped input"]
    XCTAssertTrue(input.exists)
    app.otherElements["Focus grouped input"].tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout:10))
    input.typeText("Expo\n")
    XCTAssertTrue(app.staticTexts["Grouped input value: Expo"].waitForExistence(timeout:10))
    press("Send grouped input")
    XCTAssertTrue(app.staticTexts["Grouped input actions: 1"].waitForExistence(timeout:10))
    press("Toggle input group disabled")
    XCTAssertTrue(app.staticTexts["Input group disabled: true"].waitForExistence(timeout:10))
    XCTAssertFalse(app.buttons["Send grouped input"].isEnabled)
    press("Toggle input group disabled")
    press("Send grouped input")
    XCTAssertTrue(app.staticTexts["Grouped input actions: 2"].waitForExistence(timeout:10))
    XCTAssertEqual(app.textFields["Readonly grouped input"].value as? String,"Retained")
    press("Open grouped info")
    XCTAssertTrue(app.staticTexts["Grouped connection info"].waitForExistence(timeout:10))
    press("Close grouped info")
    let textarea=app.textViews["Grouped growing textarea"]
    for _ in 0..<10 { if textarea.exists && textarea.isHittable { break };scroll.swipeUp() }
    XCTAssertTrue(textarea.exists)
    let before=textarea.frame.height
    textarea.tap();textarea.typeText("one\ntwo\nthree\nfour\nfive\nsix\nseven")
    expectation(for:NSPredicate { _,_ in textarea.frame.height > before },evaluatedWith:textarea)
    waitForExpectations(timeout:10)
    textarea.typeText(String(repeating:XCUIKeyboardKey.delete.rawValue,count:33))
    expectation(for:NSPredicate { _,_ in textarea.frame.height <= before+1 },evaluatedWith:textarea)
    waitForExpectations(timeout:10)
  }
  func testSourceChartsRetainPresetGeometryAndSeriesInteractions() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/chart-contract", in: app)
    let scroll = storyScroll(app)
    func reveal(_ element: XCUIElement) {
      for _ in 0..<8 {
        if element.exists && !element.frame.isEmpty && scroll.frame.contains(CGPoint(x:element.frame.midX,y:element.frame.midY)) { return }
        scroll.swipeUp()
      }
      for _ in 0..<8 {
        if element.exists && !element.frame.isEmpty && scroll.frame.contains(CGPoint(x:element.frame.midX,y:element.frame.midY)) { return }
        scroll.swipeDown()
      }
      XCTFail("Missing visible chart control: " + element.description)
    }
    func label(_ text: String) {
      let element = app.staticTexts.matching(identifier:text).firstMatch
      XCTAssertTrue(element.waitForExistence(timeout:10),text)
      reveal(element)
    }
    func press(_ text: String) {let element=app.buttons[text];reveal(element);element.tap()}
    for preset in ["nova","vega","maia","lyra","mira","luma","sera","rhea","default","new-york","new-york-v4"] {
      label("Chart preset: " + preset)
      let height = preset == "mira" ? 52 : ["luma","sera","rhea"].contains(preset) ? 46 : 48
      label("Tooltip geometry: " + preset + ":128x" + String(height))
      press("Next chart preset")
    }
    for kind in ["bar","line","area","pie","radar","radial"] {
      label("Chart kind: " + kind)
      press("Next chart point");label("Chart selection: February=20");label("20")
      press("Next chart point");label("Chart selection: March=30");label("30")
      press("Next chart point");label("Chart selection: January=10");label("10")
      press("Next chart kind")
    }
  }
  func testSourceExampleLayoutsRetainPaddingFlexAndGridGeometry() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/example-layout", in: app)
    let scroll = storyScroll(app)
    for text in ["Example panel geometry: 320x116", "Example child geometry: 48,48,20,20", "Example zero geometry: 320x20", "Example zero child: 0,0,20,20", "Example grid geometry: 144x116;144x116"] {
      let value = app.staticTexts.matching(identifier:text).firstMatch
      func visible() -> Bool { value.exists && !value.frame.isEmpty && scroll.frame.contains(CGPoint(x:value.frame.midX,y:value.frame.midY)) }
      for _ in 0..<12 { if visible() { break }; scroll.swipeUp() }
      XCTAssertTrue(visible(), text)
    }
  }
  func testEveryAuthoredStoryCommitsOnTheNativeRenderer() {
    XCTAssertGreaterThan(authoredStoryCount, 0)
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/runtime-sweep", in: app)
    XCTAssertTrue(app.staticTexts["Runtime sweep planned: \(authoredStoryCount)"].waitForExistence(timeout: 10))
    let passed = app.staticTexts["Runtime sweep passed: \(authoredStoryCount)/\(authoredStoryCount)"]
    let failed = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Runtime sweep failed: ")).firstMatch
    let deadline = Date().addingTimeInterval(600)
    while Date() < deadline {
      if passed.exists { return }
      if failed.exists { XCTFail(failed.label); return }
      if app.state != .runningForeground { XCTFail("Native sweep app left the foreground"); return }
      _ = passed.waitForExistence(timeout: 1)
    }
    XCTFail("Native sweep did not commit every authored story")
  }

  func storyScroll(_ app:XCUIApplication) -> XCUIElement {
    // Fabric's iOS scroll accessibility element does not expose the wrapper testID.
    // Choose the largest native viewport so nested recipe scroll areas stay independent.
    let candidates=app.scrollViews.allElementsBoundByIndex
    XCTAssertFalse(candidates.isEmpty,"Missing native story viewport")
    return candidates.max(by:{a,b in a.frame.width*a.frame.height < b.frame.width*b.frame.height}) ?? app.scrollViews.firstMatch
  }
  func openStory(_ name: String, in app: XCUIApplication) {
    let search = app.textFields["Find an example"]
    XCTAssertTrue(search.waitForExistence(timeout: 30))
    search.tap()
    for character in name { search.typeText(String(character)) }
    search.typeText("\n")
    let button = app.buttons["Open " + name]
    XCTAssertTrue(button.waitForExistence(timeout: 10))
    button.tap()
  }
  func testAuthoredPaginationOnNativeOS() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("new-york-v4/pagination-demo", in: app)
    let third = app.buttons.matching(NSPredicate(format: "label MATCHES %@", "\\s*3\\s*")).firstMatch
    XCTAssertTrue(third.waitForExistence(timeout: 10))
    third.tap()
    XCTAssertTrue(third.isSelected)
    XCTAssertFalse(app.buttons["Next page"].isEnabled)
    app.buttons.matching(NSPredicate(format: "label MATCHES %@", "\\s*1\\s*")).firstMatch.tap()
    XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label MATCHES %@", "\\s*1\\s*")).firstMatch.isSelected)
    XCTAssertFalse(app.buttons["Previous page"].isEnabled)
  }
  func testAuthoredToggleOnNativeOS() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("new-york-v4/toggle-demo", in: app)
    let toggle=app.buttons["Toggle bookmark"]
    XCTAssertTrue(toggle.waitForExistence(timeout:10))
    XCTAssertFalse(toggle.isSelected)
    toggle.tap()
    XCTAssertTrue(toggle.isSelected)
  }
  func testAuthoredLabelFocusesItsNativeInput() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("new-york-v4/input-with-label", in: app)
    let input = app.textFields["Email"]
    XCTAssertTrue(input.waitForExistence(timeout: 10))
    // The 14-point source label sits above a 12-point gap; the editable AX frame excludes its border.
    let label = app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: input.frame.midX, dy: input.frame.minY - 20))
    label.tap()
    app.typeText("native@example.com")
    XCTAssertEqual(input.value as? String, "native@example.com")
  }
  func testButtonPresetsRetainNativeGeometryAndActions() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/button-preset-matrix", in: app)
    let cases: [(String, CGFloat)] = [("vega",36),("nova",32),("maia",36),("lyra",32),("mira",28),("luma",36),("sera",40),("rhea",32)]
    for (name,height) in cases {
      let button=app.buttons["Native preset " + name]
      XCTAssertTrue(button.waitForExistence(timeout:10))
      XCTAssertEqual(button.frame.height,height,accuracy:1)
      button.tap()
      XCTAssertTrue(app.staticTexts["Selected preset: " + name].waitForExistence(timeout:3))
    }
  }

  func testInlineAndComposedNativeLinksReachTheirDestinations() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/navigation-contract", in: app)
    for (label, result) in [("the native route", "Visited route: /native"), ("Composed native route", "Visited route: /login"), ("Jump to section", "Visited anchor: section")] {
      let link = app.links[label]
      XCTAssertTrue(link.waitForExistence(timeout: 10))
      link.tap()
      XCTAssertTrue(app.staticTexts[result].waitForExistence(timeout: 3))
    }
  }

  func testComposedNativeViewAndTextHostsKeepRealActions() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/render-hosts", in: app)
    for (index, entry) in [("Registry view action", "Host action: view"), ("Text badge action", "Host action: text"), ("Registry click action", "Host action: registry")].enumerated() {
      let (label,result) = entry
      let button = app.buttons.matching(identifier:label).firstMatch
      XCTAssertTrue(button.waitForExistence(timeout: 10))
      button.tap()
      XCTAssertTrue(app.staticTexts[result].waitForExistence(timeout: 3))
      XCTAssertTrue(app.staticTexts["Host count: " + String(index + 1)].waitForExistence(timeout: 3))
    }
  }

  func testNativeLayoutPrimitivesMeasureTheirAuthoredGeometry() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/layout-primitives", in:app)
    for status in ["Ratio geometry: 160x80", "Horizontal geometry: 160x1", "Vertical geometry: 1x80", "Skeleton geometry: 100x20"] {
      XCTAssertTrue(app.staticTexts[status].waitForExistence(timeout:10))
    }
    let screenshot = XCTAttachment(screenshot:app.screenshot())
    screenshot.name = "Native layout primitive geometry"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testAuthoredDescriptionsRetainNativeTermsAndValues() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("base/separator-example", in:app)
    for index in 1...3 {
      let value = app.descendants(matching:.any).matching(identifier:"Item " + String(index) + ": Value " + String(index)).firstMatch
      for _ in 0..<4 {
        if value.exists && value.isHittable { break }
        storyScroll(app).swipeUp()
      }
      XCTAssertTrue(value.exists)
      XCTAssertTrue(value.isHittable)
    }
    let screenshot = XCTAttachment(screenshot:app.screenshot())
    screenshot.name = "Native description term and value labels"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testNativeCardPresetsRetainMeasuredSpacing() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/card-metrics", in:app)
    let scroll = storyScroll(app)
    // Passive measurement labels require a nonempty frame entirely within the native
    // viewport. Touch activation is exercised separately by the action cases.
    func visible(_ value: XCUIElement) -> Bool {
      let frame = value.frame
      print("Measurement viewport: " + value.label + " frame=" + String(describing:frame) + " viewport=" + String(describing:scroll.frame))
      return value.exists && !frame.isEmpty && scroll.frame.contains(frame)
    }
    func reveal(_ value: XCUIElement) {
      for _ in 0..<24 {
        if visible(value) { break }
        let down = value.exists && !value.frame.isEmpty && value.frame.minY < scroll.frame.minY
        let start = scroll.coordinate(withNormalizedOffset: CGVector(dx:0.5,dy:down ? 0.3 : 0.7))
        let end = scroll.coordinate(withNormalizedOffset: CGVector(dx:0.5,dy:down ? 0.7 : 0.3))
        start.press(forDuration:0.1,thenDragTo:end,withVelocity:.slow,thenHoldForDuration:0.1)
      }
      XCTAssertTrue(value.exists, value.label)
      XCTAssertTrue(visible(value), value.label + " frame: " + String(describing:value.frame))
      print("Verified visible native label: " + value.label)
    }
    let heights = [("vega",68,52),("nova",52,44),("maia",68,52),("lyra",52,44),("mira",52,44),("luma",68,52),("sera",84,60),("rhea",60,52)]
    for (style, regular, small) in heights {
      for (size,height) in [("default",regular),("sm",small)] {
        reveal(app.staticTexts.matching(identifier:"Card " + style + " " + size + " geometry: 160x" + String(height)).firstMatch)
      }
    }
    reveal(app.staticTexts.matching(identifier:"Card footer geometry: 160x105").firstMatch)
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "Native Card source spacing"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testAuthoredCardControlsAndListOnNativeOS() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("base/card-example", in: app)
    let scroll = storyScroll(app)
    func reveal(_ value: XCUIElement) {
      for _ in 0..<48 {
        if value.exists && !value.frame.isEmpty && scroll.frame.contains(value.frame) { return }
        if value.exists { print("Card reveal frame: " + value.label + " " + String(describing:value.frame) + " viewport " + String(describing:scroll.frame)) }
        let up = value.exists && !value.frame.isEmpty && value.frame.minY < scroll.frame.minY
        let start = scroll.coordinate(withNormalizedOffset: CGVector(dx:0.98,dy:up ? 0.3 : 0.7))
        let end = scroll.coordinate(withNormalizedOffset: CGVector(dx:0.98,dy:up ? 0.7 : 0.3))
        start.press(forDuration:0.1,thenDragTo:end,withVelocity:.slow,thenHoldForDuration:0.1)
      }
      XCTFail("Missing visible Card content: " + value.label)
    }
    let spacing = app.buttons["24px"]
    reveal(spacing)
    spacing.tap()
    XCTAssertTrue(spacing.isSelected)
    XCTAssertFalse(app.buttons["16px"].isSelected)
    let item = app.descendants(matching:.any).matching(identifier:"1. New analytics widgets for daily/weekly metrics").firstMatch
    reveal(item)
    XCTAssertTrue(item.exists)
    let last = app.descendants(matching:.any).matching(identifier:"5. Follow-up meeting scheduled for next Tuesday").firstMatch
    reveal(last)
    XCTAssertTrue(last.exists)
    let screenshot = XCTAttachment(screenshot:app.screenshot())
    screenshot.name = "Authored Card list and spacing controls"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testCallbackButtonsAndComposedControlsOnNativeOS() {
    let app = XCUIApplication(bundleIdentifier: "dev.anhedral.registryqa")
    app.launch()
    openStory("native/button-callbacks", in:app)
    func reveal(_ value:XCUIElement, _ name:String) {
      let scroll=storyScroll(app)
      for _ in 0..<12 {
        if value.exists && value.isHittable { return }
        let up=value.exists && !value.frame.isEmpty && value.frame.minY < scroll.frame.minY
        let start=scroll.coordinate(withNormalizedOffset:CGVector(dx:0.98,dy:up ? 0.3 : 0.7))
        let end=scroll.coordinate(withNormalizedOffset:CGVector(dx:0.98,dy:up ? 0.7 : 0.3))
        start.press(forDuration:0.1,thenDragTo:end,withVelocity:.slow,thenHoldForDuration:0.1)
      }
      XCTFail("Missing callback control: " + name)
    }
    func tap(_ name:String) { let value=app.descendants(matching:.any).matching(identifier:name).firstMatch; reveal(value,name); value.tap() }
    tap("Open composed callback select")
    let plan=app.descendants(matching:.any).matching(identifier:"Team callback plan").firstMatch
    XCTAssertTrue(plan.waitForExistence(timeout:10)); plan.tap()
    XCTAssertTrue(app.staticTexts.matching(identifier:"Callback selected plan: two").firstMatch.exists)
    XCTAssertTrue(app.staticTexts.matching(identifier:"Callback submits: 0").firstMatch.exists)
    tap("Callback view action")
    tap("Callback text action")
    XCTAssertTrue(app.staticTexts.matching(identifier:"Callback view count: 1").firstMatch.exists)
    XCTAssertTrue(app.staticTexts.matching(identifier:"Callback text count: 1").firstMatch.exists)
    tap("Submit callback form")
    XCTAssertTrue(app.staticTexts.matching(identifier:"Callback submits: 1").firstMatch.exists)
    tap("Begin callback pending")
    let pending=app.buttons["Callback pending"]
    XCTAssertTrue(pending.exists); XCTAssertFalse(pending.isEnabled)
    let screenshot=XCTAttachment(screenshot:app.screenshot())
    screenshot.name="Native callback controls and source form semantics"
    screenshot.lifetime = .keepAlways
    add(screenshot)
  }

  func testSourceSpinnerGeometryAndActionsOnNativeOS() {
    let app=XCUIApplication(bundleIdentifier:"dev.anhedral.registryqa")
    app.launch(); openStory("native/spinner-paint",in:app)
    for name in ["Spinner geometry: 24x24","Badge spinner geometry: 12x12","Spinner actions: 0"] {
      XCTAssertTrue(app.staticTexts[name].waitForExistence(timeout:10))
    }
    app.buttons["Spinner action"].tap()
    XCTAssertTrue(app.staticTexts["Spinner actions: 1"].exists)
    app.buttons["Stop native spinner"].tap()
    XCTAssertTrue(app.staticTexts["Spinner motion stopped"].exists)
    XCTAssertTrue(app.descendants(matching:.any).matching(identifier:"Native source spinner").firstMatch.exists)
    let screenshot=XCTAttachment(screenshot:app.screenshot())
    screenshot.name="Native source Spinner glyph and dimensions"; screenshot.lifetime = .keepAlways; add(screenshot)
  }

  func testNativeInputHeightsAndTextareaContentResizing() {
    let app=XCUIApplication(bundleIdentifier:"dev.anhedral.registryqa")
    app.launch(); openStory("native/input-metrics",in:app)
    let scroll=storyScroll(app)
    func reveal(_ element:XCUIElement) {
      for _ in 0..<24 {
        if element.exists && scroll.frame.contains(element.frame) { return }
        scroll.swipeUp()
      }
      XCTFail("Missing input: "+element.label)
    }
    for (name,height) in [("vega",36.0),("nova",32.0),("maia",36.0),("lyra",32.0),("mira",28.0),("luma",36.0),("sera",40.0),("rhea",32.0)] {
      let input=app.textFields["Native input "+name]; reveal(input)
      XCTAssertEqual(input.frame.height,height-2,accuracy:1)
    }
    XCTAssertTrue(app.staticTexts["Input geometry: vega=160x36; nova=160x32; maia=160x36; lyra=160x32; mira=160x28; luma=160x36; sera=160x40; rhea=160x32"].waitForExistence(timeout:10))
    XCTAssertTrue(app.staticTexts["Legacy textarea height: 90"].waitForExistence(timeout:10))
    let textarea=app.textViews["Native growing textarea"]; reveal(textarea)
    XCTAssertEqual(textarea.frame.height,62,accuracy:1)
    textarea.tap(); textarea.typeText("one\ntwo\nthree\nfour\nfive\nsix\nseven")
    let grown=app.staticTexts.matching(NSPredicate(format:"label BEGINSWITH %@","Textarea height: ")).firstMatch
    let expanded=NSPredicate { _,_ in (Int(grown.label.components(separatedBy:": ").last ?? "0") ?? 0) > 64 }
    expectation(for:expanded,evaluatedWith:nil); waitForExpectations(timeout:10)
    XCTAssertEqual(textarea.value as? String,"one\ntwo\nthree\nfour\nfive\nsix\nseven")
    let value=textarea.value as? String ?? ""
    textarea.typeText(String(repeating:XCUIKeyboardKey.delete.rawValue,count:value.count))
    XCTAssertTrue(app.staticTexts["Textarea height: 64"].waitForExistence(timeout:5))
  }
  func testSystemDocumentPickerSelectionAndCancellation() {
    let app=XCUIApplication(bundleIdentifier:"dev.anhedral.registryqa")
    app.launch(); openStory("native/file-input",in:app)
    let field=app.buttons.matching(NSPredicate(format:"label == %@","Native document")).firstMatch
    XCTAssertTrue(field.waitForExistence(timeout:10)); field.tap()
    let browse=app.tabBars["DOC.browsingModeTabBar"].buttons["Browse"]
    if browse.waitForExistence(timeout:3) { browse.tap() }
    let local=app.cells.matching(NSPredicate(format:"label CONTAINS %@","On My iPhone")).firstMatch
    if local.waitForExistence(timeout:3) { local.tap() }
    let folder=app.cells.matching(NSPredicate(format:"label CONTAINS %@","AnhedralRegistryQA")).firstMatch
    if folder.waitForExistence(timeout:3) { folder.tap() }
    let file=app.cells.matching(NSPredicate(format:"label CONTAINS %@","anhedral-native-file-qa")).firstMatch
    XCTAssertTrue(file.waitForExistence(timeout:10)); file.tap()
    XCTAssertTrue(app.staticTexts["Document selection: anhedral-native-file-qa.txt:true"].waitForExistence(timeout:10))
    field.tap()
    let cancel=app.buttons["Cancel"]; XCTAssertTrue(cancel.waitForExistence(timeout:10)); cancel.tap()
    XCTAssertTrue(app.staticTexts["Document cancellations: 1"].waitForExistence(timeout:5))
    XCTAssertTrue(app.staticTexts["Document selection: anhedral-native-file-qa.txt:true"].exists)
  }
  func testSystemDateAndTimeSelectionAndCancellation() {
    let app=XCUIApplication(bundleIdentifier:"dev.anhedral.registryqa")
    app.launch(); openStory("native/temporal-input",in:app)
    let date=app.buttons.matching(NSPredicate(format:"label == %@","Native date")).firstMatch
    XCTAssertTrue(date.waitForExistence(timeout:10)); date.tap()
    XCTAssertTrue(app.pickerWheels.firstMatch.waitForExistence(timeout:10))
    let day=app.pickerWheels.allElementsBoundByIndex.first { ($0.value as? String)=="25" }!
    day.adjust(toPickerWheelValue:"17")
    let selectedDay=NSPredicate { _,_ in (day.value as? String)?.trimmingCharacters(in:.whitespaces)=="17" }
    expectation(for:selectedDay,evaluatedWith:nil); waitForExpectations(timeout:5)
    app.buttons["Apply date"].tap()
    XCTAssertTrue(app.staticTexts["Date selection: 2026-10-17"].waitForExistence(timeout:5))
    app.buttons.matching(NSPredicate(format:"label == %@","Native time")).firstMatch.tap()
    XCTAssertTrue(app.pickerWheels.firstMatch.waitForExistence(timeout:10))
    let minute=app.pickerWheels.allElementsBoundByIndex.first { ($0.value as? String)?.hasPrefix("42")==true }!
    minute.adjust(toPickerWheelValue:"43")
    app.buttons["Apply time"].tap()
    XCTAssertTrue(app.staticTexts["Time selection: 15:43"].waitForExistence(timeout:5))
    date.tap(); app.buttons["Cancel date"].tap()
    XCTAssertTrue(app.staticTexts["Date selection: 2026-10-17"].exists)
    let screenshot=XCTAttachment(screenshot:app.screenshot()); screenshot.name="Native system input values"; screenshot.lifetime = .keepAlways; add(screenshot)
  }

}
