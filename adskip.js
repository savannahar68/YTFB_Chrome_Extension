(function () {
  var classList = [
    'videoAdUiSkipButton', // Old close ad button
    'ytp-ad-skip-button ytp-button', // New close ad button
    'ytp-ad-overlay-close-button', // Close overlay button
  ];

  var timeoutId;
  var observedSkipBtn;
  var skipBtnObserver;

  /**
   * Loops over all the class names of buttons that we need to click to skip an
   * ad or overlay, and returns an array of those elements.
   *
   * @param {Array<String>} classNames 
   * @returns {Array<Element>} 
   */
  function existingButtons(classNames) {
    return classNames
      .map(name => {
        return Array.from(document.getElementsByClassName(name)) || [];
      })
      .reduce(function(acc, elems) {
        return acc.concat(elems);
      }, [])
  }

  /**
   * We check if the button is visible by using the `offsetParent` attribute
   * on an element. It is `null` if the element, or any of its parents, is set
   * to have style `display:none`.
   * 
   * @param {Element} button 
   * @returns {boolean} 
   */
  function isBtnVisible(button) {
    return button.offsetParent === null ? false : true;
  }

  /**
   * Since we do not click the button as long as it is not visible, we can
   * attach an observer to listen for the button's attribute changes to figure
   * out when the element becomes visible.
   * 
   * @param {Element} button 
   */
  function triggerClickWhenVisible(button) {
    if (button === observedSkipBtn) {
      return;
    }

    // Find the actual parent with the display style 'none' so that we can
    // listen to that element's changes.
    var parentWithDisplayStyle = (function() {
      var currentParent = button;
      while (currentParent !== null) {
        if (currentParent.style.display === 'none') {
          return currentParent;
        }

        currentParent = currentParent.parentElement;
      }

      return null;
    })();

    if (!parentWithDisplayStyle) {
      return;
    }

    // If we had been observing another button, disconnect from that. If that
    // element still exists in the DOM, click on it for good measure.
    if (skipBtnObserver && observedSkipBtn) {
      skipBtnObserver.disconnect();
      triggerClick(observedSkipBtn);
    }

    // If this is the first skip button we have encountered, we will have to
    // set up the observer first.
    if (!skipBtnObserver) {
      skipBtnObserver = new MutationObserver(function() {
        if (!isBtnVisible(observedSkipBtn)) {
          return;
        }

        triggerClick(observedSkipBtn);
        observedSkipBtn = undefined;
        skipBtnObserver.disconnect();
      });
    }

    observedSkipBtn = button;
    skipBtnObserver.observe(parentWithDisplayStyle, { attributes: true });
  }

  /**
   * Loops over all the buttons that need to be clicked and triggers the click
   * even on those buttons.
   */
  function checkAndClickButtons() {
    existingButtons(classList).forEach(button => {
      if (!isBtnVisible(button)) {
        triggerClickWhenVisible(button);
        
        return;
      } 

      triggerClick(button);
    })
  }

  /**
   * Triggers a click event on the given DOM element.
   * 
   * This function is based on an answer here:
   * http://stackoverflow.com/questions/2705583/how-to-simulate-a-click-with-javascript
   * 
   * @param {Element} el
   */
  function triggerClick(el) {
    var etype = 'click';

    if (typeof el.fireEvent === 'function') {
      el.fireEvent('on' + etype);
    } else if (typeof el.dispatchEvent === 'function') {
      var evObj = document.createEvent('Events');
      evObj.initEvent(etype, true, false);
      el.dispatchEvent(evObj);
    }
  }

  /**
   * Initializes an observer on the YouTube Video Player to get events when any
   * of its child elements change. We can check for the existance of the skip ad
   * buttons on those changes.
   *
   * @returns {Boolean}
   */
  function initObserver() {
    if (!('MutationObserver' in window)) {
      return false;
    }

    var ytdPlayer = (function(nodeList) {
      return nodeList && nodeList[0];
    })(document.getElementsByTagName('ytd-player'));

    if (!ytdPlayer) {
      return false;
    }

    var observer = new MutationObserver(function() {
      checkAndClickButtons();
    });

    observer.observe(ytdPlayer, { childList: true, subtree: true });

    clearTimeout(timeoutId); 
    return true;
  } 


  function initTimeout() {
    clearTimeout(timeoutId);

    if (initObserver()) {
      return;
    }

    timeoutId = setTimeout(function() {
      checkAndClickButtons();

      initTimeout();
    }, 2000);
  }

  var inIframe = (function() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  })();

  /**
   * Only start the script if we are at the top level. YouTube has a few iframes
   * in the page which would also be running this content script.
   */
  if (!inIframe) {
    initTimeout();
  }
})();
