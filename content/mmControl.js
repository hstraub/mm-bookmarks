// vim: set ai tabstop=2 shiftwidth=2 expandtab:

Components.utils.import( "resource://modules/log4moz.js" );
var mmControlLogger = Log4Moz.Service.getLogger( "MMBookmarks.Control" );

var mmCredentialsChanged=null;
var mmSelectedTab=null;
var gJson=null;

function onLoad()
{
  mmCredentialsChanged=false;
  mmControlLogger.debug("mmControl:onLoad\n");
  document.getElementById('autosync').checked=gSettings.automaticSync;
  document.getElementById('autodownload').checked=gSettings.automaticDownload;
  document.getElementById('autoupload').checked=gSettings.automaticUpload;
  document.getElementById('mm-bookmark-status').value=gSettings.statusText;
  document.getElementById('mm-bookmarks-version-name').value=gSettings.version;
  gJson=new mmJson( );

  prefObserverStatusText.register( );

  if (!gSettings.uninitialized) {
    mmControlLogger.debug("username: "+gSettings.user+"\n");
    document.getElementById('mm-username').value=gSettings.user;
    document.getElementById('mm-password').value=gSettings.password;
    document.getElementById('mm-status-panels').selectedIndex=1;
    document.getElementById('mm-status-tabs').selectedIndex=1;
    mmSelectedTab=1;
    getLogdata();
  } else {
    document.getElementById('mm-synchronize-button').disabled=true;
    document.getElementById('mm-online-bookmark-button').disabled=true;
  }

}

function tab_selection_changed()
{
  mmSelectedTab=document.getElementById("mm-status-tabs").selectedIndex
  if (mmSelectedTab==2 &&
  !gSettings.uninitialized) {
    getLogdata();
  }
}

function mmHelp ()
{
  if (mmSelectedTab==0) {
    window.open(gSettings.helpAccount, "_blanks");
  } else if (mmSelectedTab==1) {
    window.open(gSettings.helpStatus, "_blanks");
  } else if (mmSelectedTab==2) {
    window.open(gSettings.helpLog, "_blanks");
  } else if (mmSelectedTab==3) {
    window.open(gSettings.helpOptions, "_blanks");
  } else if (mmSelectedTab==4) {
    window.open(gSettings.helpAbout, "_blanks");
  } else {
    window.open("http://www.mobilmail.at", "_blanks");
  }
}
  
function endeaus()
{
  if (mmCredentialsChanged) {
    save_user_and_password();
  }
  prefObserverStatusText.unregister( );
  return true;
}

function setup()
{
  window.open("chrome://mmbookmarks/content/mmOptions.xul", "_blanks", "chrome");
}

function credentials_changed()
{
  mmCredentialsChanged=true;
  document.getElementById("mm-save-user-and-pass").disabled=false;
}

function save_user_and_password()
{
  try {
    gSettings.removeUser();
  } catch(e) {alert("Fehler bei Remove User");}

  gSettings.user=document.getElementById("mm-username").value;
  gSettings.password=document.getElementById("mm-password").value;
  gSettings.uninitialized=false;
  mmCredentialsChanged=false;
  document.getElementById("mm-save-user-and-pass").disabled=true;
  gSettings.statusText="unbekannt...";
  document.getElementById("mm-bookmark-status").value=gSettings.statusText;
  document.getElementById('mm-synchronize-button').disabled=false;
  document.getElementById('mm-online-bookmark-button').disabled=false;
}

function clear_user_and_password()
{
  try {
    gSettings.removeUser();
  } catch(e) {alert("Fehler bei Remove User");}

  document.getElementById("mm-username").value="";
  document.getElementById("mm-password").value="";
  gSettings.uninitialized=true;
  mmCredentialsChanged=false;
  document.getElementById("mm-save-user-and-pass").disabled=true;
  gSettings.statusText="unbekannt...";
  document.getElementById("mm-bookmark-status").value=gSettings.statusText;
  document.getElementById('mm-synchronize-button').disabled=true;
  document.getElementById('mm-online-bookmark-button').disabled=true;
}

// FIXME: Weg damit
function saveChanges()
{
  if (document.getElementById("mm-remember-password").checked==true) {
    gSettings.user=document.getElementById("mm-username").value;
    gSettings.password=document.getElementById("mm-password").value;
  } else {
    gSettings.removeUser();
  }
  gSettings.automaticSync=document.getElementById("autosync").checked;
  gSettings.automaticDownload=document.getElementById("autodownload").checked;
  gSettings.automaticUpload=document.getElementById("autoupload").checked;
  gSettings.uninitialized=false;
}

function synchronizeNow()
{
  gSynchronizer.serverSynchronize();
  document.getElementById("mm-synchronize-button").disabled=true;
  document.documentElement.getButton("accept").disabled=true;
  setTimeout(activateSynchronize, 8000);
}

function activateSynchronize()
{
  document.getElementById("mm-synchronize-button").disabled=false;
}

function getLogdata()
{
  if (gSettings.uninitialized) {
    throw "Error: Require valid credentials";
  }

  var req=new XMLHttpRequest()
  var sRequest=gSettings.mmBaseUrl+"/storage1/bookmarks3.py?logdata";
  req.open("GET", sRequest, true,  gSettings.escapedUser, gSettings.escapedPassword);
  req.onerror = function(aEvent) {
    return;
  }
  req.onload=function(aEvent) {
    var rowCount=document.getElementById('loglist').getRowCount();
    for (i=0; i<rowCount; i++) {
      document.getElementById('loglist').removeItemAt(0);
    }
    var inputRows=req.responseText.split("\n");
    mmControlLogger.debug("Result: "+req.responseText+"\r\n");
    for (i=0; i<inputRows.length-1; i++) {
      mmControlLogger.debug("  Item: "+inputRows[i]+"\n");
      try {
      inputFields = inputRows[i].split(" ");
      row = document.createElement ( "listitem" );
      // FIXME: stark verbesserungswuerdig
      mmControlLogger.debug( "  Nr: "+inputFields[0] );
      cell = document.createElement( "listcell" );
      cell.setAttribute( "label", inputFields[0] );
      row.appendChild( cell );

      cell = document.createElement( "listcell" );
      var zeit = inputFields[2].replace( /\.\d+.+/, "" );
      var tmp = inputFields[1] + " " + zeit;
      cell.setAttribute( "label", tmp );
      row.appendChild( cell );

      cell = document.createElement( "listcell" );
      cell.setAttribute( "label", inputFields[3] );
      row.appendChild( cell );

      document.getElementById('loglist').appendChild( row );
      } catch(e) {alert("Fehler "+e); }
    }
  }

  req.send(null);
}

function onlineBookmarks ()
{
  window.open(gSettings.mmBaseUrl, "_blanks", "");
}

var prefObserverStatusText = {
  register: function( ) {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);

    // For this._branch we ask that the preferences 
    // for extensions.myextension. and children
    this._branch = prefService.getBranch("mobilmail.statusText");

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
        mmControlLogger.debug( "Preference mobilmail.statusText Changed!!\n" );
        document.getElementById('mm-bookmark-status').value =
            gSettings.statusText;
        
    }
  }
}
