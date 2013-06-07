/*
 * Copyright (C) 2008 Herbert Straub <herbert@linuxhacker.at>
 * See http://www.linuxhacker.at for details
 *
 * See enclosed file license.txt for license information (MPL/GPL/LGPL).
 */

var observerBookmarks = {
  inBatchUpdate: false,
  logger: Log4Moz.Service.getLogger( "MMBookmarks.observerBookmarks" ),
  bmsvc: Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
      .getService(Components.interfaces.nsINavBookmarksService),

  onBeginUpdateBatch: function( ) {
    this.logger.debug( "observerBookmarks:onBeginUpdateBatch\n");
    this.inBatchUpdate = true;
  },

  onEndUpdateBatch: function( ) {
    this.logger.debug( "observerBookmarks: onEndUpdateBatch\n");
    this.inBatchUpdate = false;
  },

  onItemAdded: function( id, folder, index ) {
    var title = this.bmsvc.getItemTitle( id );
    this.logger.debug( "Flag: inBatchUpdate: " + this.inBatchUpdate + "\n" );
    this.logger.debug( "observerBookmarks: onItemAdded id: " + id + " folder: " + folder
        + " index: " + index + " Title: " + title);
    if ( ! this.inBatchUpdate  && ! title.match( /Live Bookmark loading/ ) ) {
      gSettings.bookmarksModified = true;
      gSettings.statusText = "Lokal modifiziert -> Upload...";
    }
  },

  onItemRemoved: function( id, folder, index ) {
    this.logger.debug( "observerBookmarks: onItemRemoved id: " + id + " folder: " + folder
        + " index: " + index + " Title: " + this.bmsvc.getItemTitle( id ) );
    if ( ! this.inBatchUpdate ) {
      gSettings.bookmarksModified = true;
      gSettings.statusText = "Lokal modifiziert -> Upload...";
    }
  },

  onItemChanged: function( id, property, isAnnotationProperty, value ) {
    this.logger.debug( "observerBookmarks: onItemChanged id: " + id + " property: " + property
        + " isAnnotationProperty: " + isAnnotationProperty + " value: "
        + value + " Title: " + this.bmsvc.getItemTitle( id ) );
    if ( ! this.inBatchUpdate ) {
      if ( ( isAnnotationProperty == false && property == "favicon" ) 
          || ( property == "livemark/expiration" ) ) {
        // FIXME: nichts zu tun
        this.logger.debug( "onItemChange: no update - favicon\n" );
      } else {
        gSettings.bookmarksModified = true;
        gSettings.statusText = "Lokal modifiziert -> Upload...";
      }
    }
  },

  onItemVisited: function( id, visitID, time ) {
    this.logger.debug( "observerBookmarks: onItemVisited id:" + id + " visitID: " 
        + visitID + " time: " + time + "\n" );
  },

  onItemMoved: function( id, oldParent, oldIndex, newParent, newIndex ) {
    this.logger.debug( "observerBookmarks: onItemMoved id: " + id + " oldParent: " + oldParent
        + " oldIndex: " + oldIndex + " newParent: " + newParent
        + " newIndex: " + newIndex + " Title: " + this.bmsvc.getItemTitle( id ) );
    if ( ! this.inBatchUpdate ) {
      gSettings.bookmarksModified=true;
      gSettings.statusText = "Lokal modifiziert -> Upload...";
    }
  },

  QueryInterface: function( iid ) {
    this.logger.debug( "observerBookmarks: QueryInterface iid: " + iid + "\n" );
  },
};

// vim: set ai tabstop=2 shiftwidth=2 expandtab:
