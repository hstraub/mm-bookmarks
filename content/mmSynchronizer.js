// Object Creation, see http://mckoss.com/jscript/object.htm
//
function mmSynchronizer () {this.init();};

Components.utils.import( "resource://modules/log4moz.js" );

mmSynchronizer.prototype= {
  test:null,
  logger: null,

  init:function() {
    this.test="initialized";
    this.logger = Log4Moz.Service.getLogger( "MMBookmarks.synchronizer" );
  },

  serverTest:function() {
    var req = new XMLHttpRequest();
    var sRequest = gSettings.mmBaseUrl+"/storage1/bookmarks3.py?dbserialnr";
    if (gSettings.uninitialized) {
      throw "Error: Require valid credentials";
    }
    req.open("GET", sRequest, true, gSettings.escapedUser, gSettings.escapedPassword)
    req.setRequestHeader('MM-TRANSACTION', '123');
    req.setRequestHeader('MM-SERIAL-NR', '789');

    req.onerror = function(aEvent) {
      gSynchronizer.statusUpdate("Network Error", true);
    };

    req.onload = function(aEvent) {
      var statusText="";
      gSettings.centralDbSerialNr=req.getResponseHeader("MM-CENTRAL-DBSERIALNR");
      if (gSettings.localDbSerialNr==gSettings.centralDbSerialNr) {
        statusText="Synchron("+gSettings.localDbSerialNr+")";
      } else if (Number(gSettings.localDbSerialNr)<Number(gSettings.centralDbSerialNr)) {
        statusText="Veraltert";
      } else if (Number(gSettings.localDbSerialNr)>Number(gSettings.centralDbSerialNr)) {
        statusText="Neuer";
      }
      if (gSettings.bookmarksModified) {
        statusText=statusText+" modified";
      }
    }
    gSynchronizer.statusUpdate(statusText, true);
    req.send(null);
  },

  serverSynchronize:function() {
    if (gSettings.uninitialized) {
      this.logger.error( "Not initialized "+gSettings.initializeInProgress+"\n");
      if (!gSettings.initializeInProgress) {
        gSettings.initializeInProgress=true;
        window.open("chrome://mmbookmarks/content/mmControl.xul", "bmarks", "chrome");
      }
      return;
    }
    var req = new XMLHttpRequest();
    var sRequest = gSettings.mmBaseUrl+"/storage1/bookmarks3.py?dbserialnr";
    req.open("GET", sRequest, true, gSettings.escapedUser, gSettings.escapedPassword);
    req.setRequestHeader('MM-TRANSACTION', '123');
    req.setRequestHeader('MM-SERIAL-NR', '789');
    this.logger.debug( "Serverabfrage" );
    gSynchronizer.statusUpdate("Serverabfrage...", false);
    
    req.onerror = function(aEvent) {
      gSynchronizer.statusUpdate("Network Error", true);
      return;
    };

    req.onload = function(aEvent) {
      gSettings.centralDbSerialNr=req.getResponseHeader("MM-CENTRAL-DBSERIALNR");
      if (gSettings.centralDbSerialNr==0) {
        gSynchronizer.logger.info( "Initial Upload" );
        gSynchronizer.statusUpdate("Initial Upload", false);
        gSynchronizer.serverUpload();
      } else if (gSettings.localDbSerialNr==gSettings.centralDbSerialNr && !gSettings.bookmarksModified) {
        gSynchronizer.logger.debug( "Synchron" );
        gSynchronizer.statusUpdate("Synchron("+gSettings.localDbSerialNr+")", true);
      } else if (gSettings.localDbSerialNr==gSettings.centralDbSerialNr && gSettings.bookmarksModified) {
        gSynchronizer.logger.debug( "Neuer - Upload" );
        gSynchronizer.statusUpdate("Neuer", false);
        gSynchronizer.serverUpload();
      } else if (Number(gSettings.localDbSerialNr)<Number(gSettings.centralDbSerialNr)) {
        gSynchronizer.logger.debug( "Veraltert - Download" );
        gSynchronizer.statusUpdate("Veraltert", false);
        gSynchronizer.serverDownload();
      } else {
        gSynchronizer.logger.error( "Fehlzustand" );
        gSynchronizer.statusUpdate("Fehlzustand");
      }

    }
    
    req.send(null);
  },

  loadConfiguration: function() {
    if (!gSettings.loadConfiguration) {
      return;
    }
    if (gSettings.uninitialized) {
      throw "Error: Require valid credentials";
    }

    var req = new XMLHttpRequest();
    var sRequest = gSettings.mmBaseUrl+"/storage1/bookmarks3.py?configuration+"+
      "version="+gSettings.version;
    req.open("GET", sRequest, true, gSettings.escapedUser, gSettings.escapedPassword);
    
    req.onerror = function(aEvent) {
      gSynchronizer.logger.error( "Configuration Load Error" );
      return;
    };

    req.onload = function(aEvent) {
      var x=req.responseText.split("\n");
      gSynchronizer.logger.trace( "Configuration: "+req.responseText+"\r\n" );
      for (i=0; i<x.length-1; i++) {
        para=x[i].split("=");
        if (para[0]=="clientHelpAccount") {
          gSettings.helpAccount=para[1];
        } else if (para[0]=="clientHelpStatus") {
          gSettings.helpStatus=para[1];
        } else if (para[0]=="clientHelpLog") {
          gSettings.helpLog=para[1];
        } else if (para[0]=="clientHelpOptions") {
          gSettings.helpOptions=para[1];
        } else if (para[0]=="clientHelpAbout") {
          gSettings.helpAbout=para[1];
        } else if (para[0]=="clientModifiedIntervall") {
          gSettings.modifiedIntervall=para[1];
        } else if (para[0]=="clientSyncIntervall") {
          gSettings.syncIntervall=para[1];
        } else {
          gSynchronizer.logger.debug( "Configuration Parameter Error: "+para[0]+"="+para[1] );
        }
      }
      gSettings.loadConfiguration=false;
    }
    
    req.send(null);
  },

  serverUpload:function() {
    try{
      var str=gJson.source;
    }catch(e){alert("__sendData__\n\n"+e);}

    this.bookmarkUpload();
  },

  serverDownload:function() {
    this.bookmarkDownload();
  },

  bookmarkDownload:function() {
    var req=new XMLHttpRequest();
    var sRequest=gSettings.mmBaseUrl+"/storage1/bookmarks3.py?store";
    req.open("GET", sRequest, true, gSettings.escapedUser, gSettings.escapedPassword)
    req.setRequestHeader('MM-TRANSACTION', '123');
    req.setRequestHeader('MM-SERIAL-NR', '789');
    var updateSerialNr=0;
    gSettings.statusText="Downloading...";
    req.onerror = function(aEvent) {
      gSynchronizer.statusUpdate("Download Error");
      return;
    };
    req.onprogress = function(aEvent) {
      alert("Progress position: "+aEvent.position+" total: "+aEvent.totalSize);
    }
    req.onload = function(aEvent) {
      try {
        // alert ("Zipp Info: " + req.getResponseHeader( "MM-JSON-DATA-ZIPPED" ) );
        gJson.source=req.responseText;
        // FIXME: FF3 das muss raus
        //gXBEL.settings.cache=gXBEL.source;
        updateSerialNr=1;
      } catch(e) {
        gSynchronizer.logger.error( "Convert error(download from server Nr: " + req.getResponseHeader( "MM-CENTRAL-DBSERIALNR" ) + "): " + e);
        gSynchronizer.statusUpdate( "Download Data Error" );
        return;
      }
      if (updateSerialNr) {
        gSettings.centralDbSerialNr=req.getResponseHeader("MM-CENTRAL-DBSERIALNR");
        gSettings.localDbSerialNr=gSettings.centralDbSerialNr;
        gSynchronizer.statusUpdate("Synchron("+gSettings.localDbSerialNr+")", true);
        gSynchronizer.logger.debug( "Bookmarks downloaded: "+gSettings.statusText+"\n" );
      }
      gSettings.bookmarksModified=false;
      return;
    }; 

    req.send(null);
  },


  bookmarkUpload:function() {
      var req=new XMLHttpRequest();
      var sRequest=gSettings.mmBaseUrl+"/storage1/bookmarks3.py?store";
      req.open("PUT", sRequest, true, gSettings.escapedUser, gSettings.escapedPassword)
      req.setRequestHeader('MM-LOCAL-DBSERIALNR', '789');
      req.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8' );
      gSettings.statusText="Uploading...";
      gSynchronizer.statusUpdate(gSettings.statusText, false);
      req.onerror = function(aEvent) {
      gSynchronizer.statusUpdate("Upload Error", true);
      return;
    };
    req.onload=function(aEvent) {
        gSynchronizer.logger.trace( req.responseText );
        gSynchronizer.logger.trace( req.responseHeader );
      gSettings.centralDbSerialNr=req.getResponseHeader("MM-CENTRAL-DBSERIALNR");
      gSettings.localDbSerialNr=gSettings.centralDbSerialNr;
      gSettings.bookmarksModified=false;
      gSynchronizer.statusUpdate("Synchron("+gSettings.localDbSerialNr+")", true);
      gSynchronizer.logger.info( "Bookmarks uploaded: "+gSettings.statusText+"\n" );
    };
    // FIXME: send JSON Data bookmarksToJSONFile
    // req.send(gXBEL.source);
    // TODO: dump( "zippedSouce: " + gJson.zippedSource);
    gJson.zippedSource;
    req.send(gJson.source);
  },

  statusUpdate:function(text,fertig) {
    gSettings.statusText=text;
    var nsIWindowMediator = Components.classes['@mozilla.org/appshell/window-mediator;1']
                  .getService(Components.interfaces.nsIWindowMediator);

    var browserWindows=nsIWindowMediator.getEnumerator("", true); 
    while(browserWindows.hasMoreElements())
    {
      var browserWindow=browserWindows.getNext();
      try {
        browserWindow.document.getElementById('mm-bookmark-status').value=text;
      } catch(e) {continue;} 
      if (fertig) {
        try {
          browserWindow.document.getElementById("mm-synchronize-button").disabled=false;
          browserWindow.document.documentElement.getButton("accept").disabled=false;
        } catch(e) {}
      }
    }
  }
};

var gSynchronizer=new mmSynchronizer();
// vim: set ai tabstop=2 shiftwidth=2 expandtab:
