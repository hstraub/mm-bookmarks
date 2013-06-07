/*
 * Copyright (C) 2008 Herbert Straub <herbert@linuxhacker.at>
 * See http://www.linuxhacker.at for details
 *
 * See enclosed file license.txt for license information (MPL/GPL/LGPL).
 */


/*
 * Taken from the development example:
 * http://developer.mozilla.org/en/docs/Code_snippets:Preferences
 */
var prefObserverTimerActive = {
  register: function() {
    // First we'll need the preference services to look for preferences.
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);

    // For this._branch we ask that the preferences 
    // for extensions.myextension. and children
    this._branch = prefService.getBranch("mobilmail.timerActive");

    // Now we queue the interface called nsIPrefBranch2.
    // This interface is described as:  
    // "nsIPrefBranch2 allows clients to observe changes to pref values."
    this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);

    // Finally add the observer.
    this._branch.addObserver("", this, false);
  },

  unregister: function() {
    if(!this._branch) return;
    this._branch.removeObserver("", this);
  },

  observe: function(aSubject, aTopic, aData) {
    if(aTopic != "nsPref:changed") return;
    // aSubject is the nsIPrefBranch we're observing (after appropriate QI)
    // aData is the name of the pref that's been changed (relative to aSubject)
    switch (aData) {
      case "pref1":
        // extensions.myextension.pref1 was changed
        break;
      case "pref2":
        // extensions.myextension.pref2 was changed
        break;
      default:
        var logger = Log4Moz.Service.getLogger( "MMBookmarks.prefObserverTimerActive" );
        logger.debug( "Preference mobilmail.timerActive Changed!!\n" );
        logger.debug( "aSubject: " + aSubject + "\n" );
        logger.debug( "aTopic: " + aTopic + "\n" );
        logger.debug( "aData: " + aData + "\n" );
        if ( ! gSettings.timerActive ) {
          prefsTimerActiveChanged( );
        }
    }
  }
}

// vim: set ai tabstop=2 shiftwidth=2 expandtab:
