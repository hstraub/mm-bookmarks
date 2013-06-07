// 2008-04-12 Herbert Straub

Components.utils.import( "resource://modules/log4moz.js" );

function mmJson() {
  this._init();
}

mmJson.prototype = {
  filename : "mmbookmarks.json",
  zipFilename: "mmbookmarks.zip",
  places : null,
  logger: Log4Moz.Service.getLogger( "MMBookmarks.mmJson" ),

  _init: function() {
    this.logger.debug("mmJson im init\n");
    //http://developer.mozilla.org/en/docs/Places_migration_guide#Backup.2FRestore
    Components.utils.import("resource://gre/modules/utils.js");

    /* FIXME: wo kommt der jetzt hin
    // Add Bookmark Observer
    var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
        .getService( Components.interfaces.nsINavBookmarksService);
     bmsvc.addObserver( observer, false );
     this.logger.debug( "mmJson: addObserver\n" );
     */
  },

  get source( ) {
    return this.bookmarksToJSONFileAndReturnData( this.filename, false );
  },

  get zippedSource( ) {
    return this.bookmarksToJSONFileAndReturnData( this.filename, true );
  },

  set source( data ) {
    var ds = Components.classes["@mozilla.org/file/directory_service;1"]
        .getService( Components.interfaces.nsIProperties);
    var aFile = ds.get( "ProfD", Components.interfaces.nsIFile );
    aFile.append( "mmbookmarks-tmp.json" );
    // init stream
    var stream = Components.classes["@mozilla.org/network/file-output-stream;1"]
        .createInstance(Components.interfaces.nsIFileOutputStream);
    stream.init(aFile, 0x02 | 0x08 | 0x20, 0600, 0);

    // utf-8 converter stream
    var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].
                 createInstance(Components.interfaces.nsIConverterOutputStream);
    converter.init(stream, "UTF-8", 0, 0x0000);

    // weep over stream interface variance
    var streamProxy = {
      converter: converter,
      write: function( data, aLen ) {
        this.converter.writeString( data);
      }
    };

    converter.writeString( data );

    converter.close( );
    stream.close( );

    this.JSONFileToBookmarks( aFile.leafName );
  },

  set zippedSource( data ) {
  },

  zipJSONFile: function( inputFile, zipFile ) {
    var zipper = Components.classes['@mozilla.org/zipwriter;1']
        .createInstance( Components.interfaces.nsIZipWriter );

    zipper.open( zipFile, 0x04 | 0x08 | 0x20 );
    zipper.addEntryFile( 
        inputFile.path,
        Components.interfaces.nsIZipWriter.COMPRESSION_FASTEST,
        inputFile,
        false
        );
    zipper.close( );
  },

  unzipJSONFile: function( zipFile, outputFile ) {
    var zipper = Components.classes['@mozilla.org/zipwriter;1']
        .createInstance( Components.interfaces.nsIZipReader );

    zipper.open( zipFile, 0x04 | 0x08 | 0x20 );
    /* TODO: offen
    zipper.addEntryFile( 
        inputFile.path,
        Components.interfaces.nsIZipWriter.COMPRESSION_FASTEST,
        inputFile,
        false
        );
    */
    zipper.close( );
  },

  bookmarksToJSONFileAndReturnData: function(destFile, zipDataFlag) {
    var oData = "";
    var ds = Components.classes['@mozilla.org/file/directory_service;1']
                       .getService(Components.interfaces.nsIProperties);
    var aFile = ds.get('ProfD', Components.interfaces.nsIFile);
    var zipFile = ds.get('ProfD', Components.interfaces.nsIFile);
    aFile.append(destFile);
    zipFile.append( this.zipFilename );
    PlacesUtils.backupBookmarksToFile(aFile);

    // now zip the data
    if ( zipDataFlag == true ) {
      this.zipJSONFile( aFile, zipFile );
      aFile = zipFile;
    }
    
    // open file stream
    var stream = Components.classes["@mozilla.org/network/file-input-stream;1"]
        .createInstance(Components.interfaces.nsIFileInputStream);
    stream.init(aFile, 0x01, 0, 0);
    var converted = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
        .createInstance(Components.interfaces.nsIConverterInputStream);
    converted.init(stream, "UTF-8", 1024,
        Components.interfaces.nsIConverterInputStream
        .DEFAULT_REPLACEMENT_CHARACTER);

    // read in contents
    var str = {};
    var oData = "";
    while (converted.readString(4096, str) != 0)
      oData += str.value;
    converted.close();

    dump( "Data: " + oData );
    return oData;
  },

  JSONFileToBookmarks: function(jsonFilename) {
    var ds = Components.classes['@mozilla.org/file/directory_service;1']
                       .getService(Components.interfaces.nsIProperties);
    var aFile = ds.get('ProfD', Components.interfaces.nsIFile);
    aFile.append(jsonFilename);

    PlacesUtils.restoreBookmarksFromJSONFile(aFile);
  },

}

// vim: set ai tabstop=2 shiftwidth=2 expandtab:
