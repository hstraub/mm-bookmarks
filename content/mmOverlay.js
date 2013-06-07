// vim: set ai tabstop=2 shiftwidth=2 expandtab:
var gSettings = null;
var gSynchronizer = null;
var gJson = null;
var gBookmarksService; 

Components.utils.import( "resource://modules/share.js" );
Components.utils.import( "resource://modules/log4moz.js" );

function mmBookmarksService( ) {
  this._init( );
}

mmBookmarksService.prototype = {
  _mmSettings: null,
  timerActive: false,
  objectId: null,
  logger: null,

  _init: function () {
  },

  onLoad:function()
  {
   this.initLogs( );
   gJson = new mmJson();
   try {
    gSettings=new mmSettings();
   } catch(e) {alert(e);}
   try {
     gSynchronizer=new mmSynchronizer();
   } catch(e) {alert(e);}

   this._addMenu();

   this.objectId = Share.createNewObjectIdAndCheckIn( );
   this.logger.trace( "My objectId: " + this.objectId + "\n");
   this.logger.trace( "CheckedInObject: " + Share.getArrayOfCheckedInObjectIds( ) + "\n" );

   this.logger.trace( "Register Preference Observer\n" );
   prefObserverTimerActive.register();

   if (gSettings.user=="" || gSettings.password=="") {
     gSettings.uninitialized=true;
   }
   if (this.getBrowserCount()==1) {
     this.logger.trace( "BrowserCount == 1\n" );

     if ( gSettings.lastVersion == "" ) {
       this.logger.info( "Firefox 3 Plugin - resetting DbSerial Numbers" );
       gSettings.lastVersion = gSettings.version;
       gSettings.localDbSerialNr = "0";
       gSettings.centralDbSerialNr = "0";
     }
   
     if ( navigator.Online ) {
       gSettings.statusText = "unbekannt...";
     } else {
       gSettings.statusText = "Offline Mode...";
     }
     gSettings.timerActive=true;
     this.timerActive=1
     gSettings.lastSyncTime="0";
     gSettings.loadConfiguration=true;
     this.regObserver( );
   }
   window.addEventListener( "online", goingOnline, false );
   window.addEventListener( "offline", goingOffline, false );
   window.setTimeout( syncTimer, 1000);
  },

  onUnload:function() {
    prefObserverTimerActive.unregister();
    Share.setObjectIdToInactive( this.objectId );
    Share.checkOut( this.objectId );
    if (this.timerActive) {
      this.logger.debug( "onUnload: Timer active\n" );
      this.unregObserver( );
      gSettings.timerActive=false;
    }
    this.logger.debug( "onUnload getBrowserCount == "
        + this.getBrowserCount( ) + "\n" );
    if (this.getBrowserCount==0) {
      // Last action for end
      gSettings.timerActive=false;
    }
  },

  _addMenu:function()
  {
    try{
      if (!gSettings.firefoxVersion3) {
        var menu=document.getElementById("bookmarks-menu");
      } else {
        var menu=document.getElementById("bookmarksMenu");
      }
      var popup=menu.firstChild;
      var sep=popup.getElementsByTagName("menuseparator")[0];
      var label="MobilMail Bookmarks";
    }catch(e){alert(e); return;}

    try {
    var  element = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "menuitem")
    element.setAttribute("id", "mmbookmarks-menuitem");
    element.setAttribute("label", label);
    element.setAttribute("oncommand", "gBookmarksService.tester();");
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image","chrome://mmbookmarks/skin/mmhordelogo.gif");
    popup.insertBefore(element,sep);
    } catch(e) {alert(e); return;}
  },

  unregObserver:function() {
   var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
      .getService( Ci.nsINavBookmarksService);
   this.logger.debug( "Setting ObjectId to inactive: " + this.objectId + "\n" );
   Share.setObjectIdToInactive( this.objectId );
   this.logger.debug( "First Inactive ObjectId: " + Share.getFirstInactiveObjectId( )
      + "\n" );
   bmsvc.removeObserver( observerBookmarks );
   this.logger.debug( "mmOverlay: removeObserver (removed)\n" );
  },

  regObserver:function() {
   var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"]
      .getService( Ci.nsINavBookmarksService);
   this.logger.debug( "Setting ObjectId to active: " + this.objectId + "\n" );
   Share.setObjectIdToActive( this.objectId );
   this.logger.debug( "First Inactive ObjectId: " + Share.getFirstInactiveObjectId( )
      + "\n" );
   bmsvc.addObserver( observerBookmarks, false );
  },

  getBrowserCount:function () {
    var mediator= Components.classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator);
    var browserWindows=mediator.getEnumerator("navigator:browser", true);
    var cnt=0;
    while(browserWindows.hasMoreElements()) {
      cnt=cnt+1;
      browserWindow=browserWindows.getNext();
    }
    return cnt;
  },

  activateOtherBrowser:function() {
    var mediator= Components.classes['@mozilla.org/appshell/window-mediator;1']
      .getService(Components.interfaces.nsIWindowMediator);
    var browserWindows=mediator.getEnumerator("navigator:browser", true);
  },

  tester:function()
  {
    window.open("chrome://mmbookmarks/content/mmControl.xul", "bmarks", "chrome");
  },

  getLogLevel: function( ) {
    var prefsService = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService);
    var prefs = prefsService.getBranch("mobilmail.");
    var level;

    try {
      level = prefs.getCharPref( "logLevel" );
    } catch ( e ) {
      level = "Error";
    }

    return level;
  },

  initLogs: function( ) {
    var level = this.getLogLevel( );

    this.logger = Log4Moz.Service.getLogger( "MMBookmarks.Main" );
    this.logger.level = Log4Moz.Level[level];

    var formatter = new Log4Moz.BasicFormatter( );
    var root = Log4Moz.Service.rootLogger;
    root.level = Log4Moz.Level[level];

    var consoleLogger = new Log4Moz.ConsoleAppender( formatter );
    consoleLogger.level = Log4Moz.Level[level];
    root.addAppender( consoleLogger );

    var service = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService( Components.interfaces.nsIProperties );
    logFile = service.get( "ProfD", Components.interfaces.nsIFile );
    logFile.append( "mmbookmarks.log" );

    if ( ! logFile.exists( ) ) {
      logFile.create( logFile.NORMAL_FILE_TYPE, 0600 );
    }

    logFileAppender = new Log4Moz.RotatingFileAppender( logFile, formatter );
    logFileAppender.level = Log4Moz.Level['All'];
    root.addAppender( logFileAppender );

    var dumpLogAppender = new Log4Moz.DumpAppender( formatter );
    dumpLogAppender.level = Log4Moz.Level['All'];
    root.addAppender( dumpLogAppender );
  },

};


function prefsTimerActiveChanged( ) {
    gBookmarksService.logger.debug( gBookmarksService.objectId + " prefsTimerActiveChanged enterd\n" );
    gBookmarksService.logger.debug( "Objectid " + gBookmarksService.objectId + "\n" );
    gBookmarksService.logger.debug( "Share.active " + Share.active + "\n" );
    gBookmarksService.logger.debug( "Share.getFirstInactiveObjectId " + Share.getFirstInactiveObjectId ( )+ "\n" );
  if ( 
        ( ! Share.active ) 
        && 
        ( Share.getFirstInactiveObjectId( ) == gBookmarksService.objectId )
     ) {
    gBookmarksService.logger.debug( gBookmarksService.objectId + " prefsTimerActiveChanged settings active for " + gBookmarksService.objectId + "\n" );
    gSettings.timerActive=true;
    gBookmarksService.timerActive=1
    gBookmarksService.regObserver( );
  }
}

function syncTimer()
  {
    window.setTimeout(syncTimer, gSettings.modifiedIntervall*1000);
    var now=new Date();
    if (!gSettings.timerActive) {
      gBookmarksService.logger.debug( "Timer is not active for: " + gBookmarksService.objectId + "\n" );
    }
    if ( gBookmarksService.timerActive && navigator.onLine ) {
      if (parseFloat(gSettings.lastSyncTime)+gSettings.syncIntervall*1000<now.getTime()) {
        gSynchronizer.serverSynchronize();
        gSettings.lastSyncTime=now.getTime();
        gBookmarksService.logger.debug(gBookmarksService.objectId + " Timer synchronized: "+now+"\n");
      } else if (gSettings.bookmarksModified) {
        gSynchronizer.serverSynchronize();
        gSettings.lastSyncTime=now.getTime();
        gBookmarksService.logger.debug(gBookmarksService.objectId + " Timer modified: "+now+"\n");
      } else if (gSettings.loadConfiguration) {
        gBookmarksService.logger.debug(gBookmarksService.objectId + " Timer Loading configuration\n");
        gSynchronizer.loadConfiguration();
      }
    } else if ( gBookmarksService.timerActive && ! navigator.onLine ) {
      gSettings.statusText = "Offline Mode";
      gBookmarksService.logger.debug( gBookmarksService.objectId
          + " Navigator is offline; do nothing" );
    } else {
      gBookmarksService.logger.debug(gBookmarksService.objectId + " Timer nothing to do: "+now+"\n");
    }
  }

function windowLoad( ) {
  gBookmarksService = new mmBookmarksService( );
  gBookmarksService.onLoad( );
}

function windowUnload( ) {
  gBookmarksService.onUnload( );
}

function goingOnline( ) {
  gBookmarksService.logger.debug( "Online Event received" );
  if ( gBookmarksService.timerActive ) {
    gBookmarksService.logger.debug( "Setting status text" );
    gSettings.statusText = "Going Online...";
  }
}

function goingOffline( ) {
  gBookmarksService.logger.debug( "Offline Event received" );
  if ( gBookmarksService.timerActive ) {
    gBookmarksService.logger.debug( "Setting status text" );
    gSettings.statusText = "Going Offline...";
  }
}

window.addEventListener( "load", windowLoad, false );
window.addEventListener( "unload", windowUnload, false );
