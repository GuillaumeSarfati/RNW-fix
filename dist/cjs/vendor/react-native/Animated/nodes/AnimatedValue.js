/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */
'use strict';

exports.__esModule = true;

var _AnimatedInterpolation = require('./AnimatedInterpolation');

var _AnimatedInterpolation2 = _interopRequireDefault(_AnimatedInterpolation);

var _AnimatedNode = require('./AnimatedNode');

var _AnimatedNode2 = _interopRequireDefault(_AnimatedNode);

var _AnimatedWithChildren2 = require('./AnimatedWithChildren');

var _AnimatedWithChildren3 = _interopRequireDefault(_AnimatedWithChildren2);

var _InteractionManager = require('../../../../exports/InteractionManager');

var _InteractionManager2 = _interopRequireDefault(_InteractionManager);

var _NativeAnimatedHelper = require('../NativeAnimatedHelper');

var _NativeAnimatedHelper2 = _interopRequireDefault(_NativeAnimatedHelper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var NativeAnimatedAPI = _NativeAnimatedHelper2.default.API;

var _uniqueId = 1;

/**
 * Animated works by building a directed acyclic graph of dependencies
 * transparently when you render your Animated components.
 *
 *               new Animated.Value(0)
 *     .interpolate()        .interpolate()    new Animated.Value(1)
 *         opacity               translateY      scale
 *          style                         transform
 *         View#234                         style
 *                                         View#123
 *
 * A) Top Down phase
 * When an Animated.Value is updated, we recursively go down through this
 * graph in order to find leaf nodes: the views that we flag as needing
 * an update.
 *
 * B) Bottom Up phase
 * When a view is flagged as needing an update, we recursively go back up
 * in order to build the new value that it needs. The reason why we need
 * this two-phases process is to deal with composite props such as
 * transform which can receive values from multiple parents.
 */
function _flush(rootNode) {
  var animatedStyles = new Set();
  function findAnimatedStyles(node) {
    if (typeof node.update === 'function') {
      animatedStyles.add(node);
    } else {
      node.__getChildren().forEach(findAnimatedStyles);
    }
  }
  findAnimatedStyles(rootNode);
  /* $FlowFixMe */
  animatedStyles.forEach(function (animatedStyle) {
    return animatedStyle.update();
  });
}

/**
 * Standard value for driving animations.  One `Animated.Value` can drive
 * multiple properties in a synchronized fashion, but can only be driven by one
 * mechanism at a time.  Using a new mechanism (e.g. starting a new animation,
 * or calling `setValue`) will stop any previous ones.
 *
 * See http://facebook.github.io/react-native/docs/animatedvalue.html
 */

var AnimatedValue = function (_AnimatedWithChildren) {
  _inherits(AnimatedValue, _AnimatedWithChildren);

  function AnimatedValue(value) {
    _classCallCheck(this, AnimatedValue);

    var _this = _possibleConstructorReturn(this, _AnimatedWithChildren.call(this));

    _this._startingValue = _this._value = value;
    _this._offset = 0;
    _this._animation = null;
    _this._listeners = {};
    return _this;
  }

  AnimatedValue.prototype.__detach = function __detach() {
    this.stopAnimation();
    _AnimatedWithChildren.prototype.__detach.call(this);
  };

  AnimatedValue.prototype.__getValue = function __getValue() {
    return this._value + this._offset;
  };

  AnimatedValue.prototype.__makeNative = function __makeNative() {
    _AnimatedWithChildren.prototype.__makeNative.call(this);

    if (Object.keys(this._listeners).length) {
      this._startListeningToNativeValueUpdates();
    }
  };

  /**
   * Directly set the value.  This will stop any animations running on the value
   * and update all the bound properties.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#setvalue
   */


  AnimatedValue.prototype.setValue = function setValue(value) {
    if (this._animation) {
      this._animation.stop();
      this._animation = null;
    }
    this._updateValue(value, !this.__isNative /* don't perform a flush for natively driven values */
    );
    if (this.__isNative) {
      NativeAnimatedAPI.setAnimatedNodeValue(this.__getNativeTag(), value);
    }
  };

  /**
   * Sets an offset that is applied on top of whatever value is set, whether via
   * `setValue`, an animation, or `Animated.event`.  Useful for compensating
   * things like the start of a pan gesture.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#setoffset
   */


  AnimatedValue.prototype.setOffset = function setOffset(offset) {
    this._offset = offset;
    if (this.__isNative) {
      NativeAnimatedAPI.setAnimatedNodeOffset(this.__getNativeTag(), offset);
    }
  };

  /**
   * Merges the offset value into the base value and resets the offset to zero.
   * The final output of the value is unchanged.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#flattenoffset
   */


  AnimatedValue.prototype.flattenOffset = function flattenOffset() {
    this._value += this._offset;
    this._offset = 0;
    if (this.__isNative) {
      NativeAnimatedAPI.flattenAnimatedNodeOffset(this.__getNativeTag());
    }
  };

  /**
   * Sets the offset value to the base value, and resets the base value to zero.
   * The final output of the value is unchanged.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#extractoffset
   */


  AnimatedValue.prototype.extractOffset = function extractOffset() {
    this._offset += this._value;
    this._value = 0;
    if (this.__isNative) {
      NativeAnimatedAPI.extractAnimatedNodeOffset(this.__getNativeTag());
    }
  };

  /**
   * Adds an asynchronous listener to the value so you can observe updates from
   * animations.  This is useful because there is no way to
   * synchronously read the value because it might be driven natively.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#addlistener
   */


  AnimatedValue.prototype.addListener = function addListener(callback) {
    var id = String(_uniqueId++);
    this._listeners[id] = callback;
    if (this.__isNative) {
      this._startListeningToNativeValueUpdates();
    }
    return id;
  };

  /**
   * Unregister a listener. The `id` param shall match the identifier
   * previously returned by `addListener()`.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#removelistener
   */


  AnimatedValue.prototype.removeListener = function removeListener(id) {
    delete this._listeners[id];
    if (this.__isNative && Object.keys(this._listeners).length === 0) {
      this._stopListeningForNativeValueUpdates();
    }
  };

  /**
   * Remove all registered listeners.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#removealllisteners
   */


  AnimatedValue.prototype.removeAllListeners = function removeAllListeners() {
    this._listeners = {};
    if (this.__isNative) {
      this._stopListeningForNativeValueUpdates();
    }
  };

  AnimatedValue.prototype._startListeningToNativeValueUpdates = function _startListeningToNativeValueUpdates() {
    var _this2 = this;

    if (this.__nativeAnimatedValueListener) {
      return;
    }

    NativeAnimatedAPI.startListeningToAnimatedNodeValue(this.__getNativeTag());
    this.__nativeAnimatedValueListener = _NativeAnimatedHelper2.default.nativeEventEmitter.addListener('onAnimatedValueUpdate', function (data) {
      if (data.tag !== _this2.__getNativeTag()) {
        return;
      }
      _this2._updateValue(data.value, false /* flush */);
    });
  };

  AnimatedValue.prototype._stopListeningForNativeValueUpdates = function _stopListeningForNativeValueUpdates() {
    if (!this.__nativeAnimatedValueListener) {
      return;
    }

    this.__nativeAnimatedValueListener.remove();
    this.__nativeAnimatedValueListener = null;
    NativeAnimatedAPI.stopListeningToAnimatedNodeValue(this.__getNativeTag());
  };

  /**
   * Stops any running animation or tracking. `callback` is invoked with the
   * final value after stopping the animation, which is useful for updating
   * state to match the animation position with layout.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#stopanimation
   */


  AnimatedValue.prototype.stopAnimation = function stopAnimation(callback) {
    this.stopTracking();
    this._animation && this._animation.stop();
    this._animation = null;
    callback && callback(this.__getValue());
  };

  /**
   * Stops any animation and resets the value to its original.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#resetanimation
   */


  AnimatedValue.prototype.resetAnimation = function resetAnimation(callback) {
    this.stopAnimation(callback);
    this._value = this._startingValue;
  };

  /**
   * Interpolates the value before updating the property, e.g. mapping 0-1 to
   * 0-10.
   */


  AnimatedValue.prototype.interpolate = function interpolate(config) {
    return new _AnimatedInterpolation2.default(this, config);
  };

  /**
   * Typically only used internally, but could be used by a custom Animation
   * class.
   *
   * See http://facebook.github.io/react-native/docs/animatedvalue.html#animate
   */


  AnimatedValue.prototype.animate = function animate(animation, callback) {
    var _this3 = this;

    var handle = null;
    if (animation.__isInteraction) {
      handle = _InteractionManager2.default.createInteractionHandle();
    }
    var previousAnimation = this._animation;
    this._animation && this._animation.stop();
    this._animation = animation;
    animation.start(this._value, function (value) {
      // Natively driven animations will never call into that callback, therefore we can always
      // pass flush = true to allow the updated value to propagate to native with setNativeProps
      _this3._updateValue(value, true /* flush */);
    }, function (result) {
      _this3._animation = null;
      if (handle !== null) {
        _InteractionManager2.default.clearInteractionHandle(handle);
      }
      callback && callback(result);
    }, previousAnimation, this);
  };

  /**
   * Typically only used internally.
   */


  AnimatedValue.prototype.stopTracking = function stopTracking() {
    this._tracking && this._tracking.__detach();
    this._tracking = null;
  };

  /**
   * Typically only used internally.
   */


  AnimatedValue.prototype.track = function track(tracking) {
    this.stopTracking();
    this._tracking = tracking;
  };

  AnimatedValue.prototype._updateValue = function _updateValue(value, flush) {
    this._value = value;
    if (flush) {
      _flush(this);
    }
    for (var _key in this._listeners) {
      this._listeners[_key]({ value: this.__getValue() });
    }
  };

  AnimatedValue.prototype.__getNativeConfig = function __getNativeConfig() {
    return {
      type: 'value',
      value: this._value,
      offset: this._offset
    };
  };

  return AnimatedValue;
}(_AnimatedWithChildren3.default);

exports.default = AnimatedValue;
module.exports = exports['default'];