'use strict';

exports.__esModule = true;

var _normalizeNativeEvent = require('../normalizeNativeEvent');

var _normalizeNativeEvent2 = _interopRequireDefault(_normalizeNativeEvent);

var _unstableNativeDependencies = require('react-dom/unstable-native-dependencies');

var _unstableNativeDependencies2 = _interopRequireDefault(_unstableNativeDependencies);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// based on https://github.com/facebook/react/pull/4303/files

var ResponderEventPlugin = _unstableNativeDependencies2.default.ResponderEventPlugin,
    ResponderTouchHistoryStore = _unstableNativeDependencies2.default.ResponderTouchHistoryStore;

// On older versions of React (< 16.4) we have to inject the dependencies in
// order for the plugin to work properly in the browser. This version still
// uses `top*` strings to identify the internal event names.
// https://github.com/facebook/react/pull/12629

if (!ResponderEventPlugin.eventTypes.responderMove.dependencies) {
  var topMouseDown = 'topMouseDown';
  var topMouseMove = 'topMouseMove';
  var topMouseUp = 'topMouseUp';
  var topScroll = 'topScroll';
  var topSelectionChange = 'topSelectionChange';
  var topTouchCancel = 'topTouchCancel';
  var topTouchEnd = 'topTouchEnd';
  var topTouchMove = 'topTouchMove';
  var topTouchStart = 'topTouchStart';

  var endDependencies = [topTouchCancel, topTouchEnd, topMouseUp];
  var moveDependencies = [topTouchMove, topMouseMove];
  var startDependencies = [topTouchStart, topMouseDown];

  /**
   * Setup ResponderEventPlugin dependencies
   */
  ResponderEventPlugin.eventTypes.responderMove.dependencies = moveDependencies;
  ResponderEventPlugin.eventTypes.responderEnd.dependencies = endDependencies;
  ResponderEventPlugin.eventTypes.responderStart.dependencies = startDependencies;
  ResponderEventPlugin.eventTypes.responderRelease.dependencies = endDependencies;
  ResponderEventPlugin.eventTypes.responderTerminationRequest.dependencies = [];
  ResponderEventPlugin.eventTypes.responderGrant.dependencies = [];
  ResponderEventPlugin.eventTypes.responderReject.dependencies = [];
  ResponderEventPlugin.eventTypes.responderTerminate.dependencies = [];
  ResponderEventPlugin.eventTypes.moveShouldSetResponder.dependencies = moveDependencies;
  ResponderEventPlugin.eventTypes.selectionChangeShouldSetResponder.dependencies = [topSelectionChange];
  ResponderEventPlugin.eventTypes.scrollShouldSetResponder.dependencies = [topScroll];
  ResponderEventPlugin.eventTypes.startShouldSetResponder.dependencies = startDependencies;
}

var lastActiveTouchTimestamp = null;

var originalExtractEvents = ResponderEventPlugin.extractEvents;
ResponderEventPlugin.extractEvents = function (topLevelType, targetInst, nativeEvent, nativeEventTarget) {
  var hasActiveTouches = ResponderTouchHistoryStore.touchHistory.numberActiveTouches > 0;
  var eventType = nativeEvent.type;

  var shouldSkipMouseAfterTouch = false;
  if (eventType.indexOf('touch') > -1) {
    lastActiveTouchTimestamp = Date.now();
  } else if (lastActiveTouchTimestamp && eventType.indexOf('mouse') > -1) {
    var now = Date.now();
    shouldSkipMouseAfterTouch = now - lastActiveTouchTimestamp < 250;
  }

  if (
  // Filter out mousemove and mouseup events when a touch hasn't started yet
  (eventType === 'mousemove' || eventType === 'mouseup') && !hasActiveTouches ||
  // Filter out events from wheel/middle and right click.
  nativeEvent.button === 1 || nativeEvent.button === 2 ||
  // Filter out mouse events that browsers dispatch immediately after touch events end
  // Prevents the REP from calling handlers twice for touch interactions.
  // See #802 and #932.
  shouldSkipMouseAfterTouch) {
    return;
  }

  var normalizedEvent = (0, _normalizeNativeEvent2.default)(nativeEvent);

  return originalExtractEvents.call(ResponderEventPlugin, topLevelType, targetInst, normalizedEvent, nativeEventTarget);
};

exports.default = ResponderEventPlugin;
module.exports = exports['default'];