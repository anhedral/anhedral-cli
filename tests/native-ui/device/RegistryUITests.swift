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

}
