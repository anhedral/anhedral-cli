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
}
