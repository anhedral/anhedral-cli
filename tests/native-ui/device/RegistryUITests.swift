import XCTest
final class RegistryUITests: XCTestCase {
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
    // The source places its 20-point label above the input with a 12-point gap.
    let label = app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: input.frame.minX + 20, dy: input.frame.minY - 22))
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
        app.scrollViews.firstMatch.swipeUp()
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
    let scroll = app.scrollViews.firstMatch
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
        let down = value.exists && value.frame.midY < scroll.frame.minY
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

}
