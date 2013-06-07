/*
 * Copyright (C) 2008 Herbert Straub <herbert@linuxhacker.at>
 * See http://www.linuxhacker.at for details
 *
 * See enclosed file license.txt for license information (MPL/GPL/LGPL).
 */

EXPORTED_SYMBOLS = ["Share"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

/*
function Share( ) {
  this.init();
}
*/

var Share = {
  objectIds: new Array( ),
  active: false,

  init: function( ) {
    this.objectIds = new Object( );
  },

  /*
   * createNewObjectIdAndCheckIn
   *
   * returns: the new ObjectId
   */
  createNewObjectIdAndCheckIn: function( ) {
    var uuidgen = Cc["@mozilla.org/uuid-generator;1"]
        .getService( Ci.nsIUUIDGenerator );
    newObjectId = uuidgen.generateUUID( ).toString()
        .replace( /[{}]/g, '' );
    //if ( ! this.objectIds.hasOwnProperty( newObjectId ) ) {
    this.objectIds[newObjectId] = false;
    //}

    return newObjectId;
  },

  checkOut: function( objectId ) {
    if ( this.objectIds.hasOwnProperty( objectId ) ) {
      delete this.objectIds[objectId];
    }
  },

  setObjectIdToActive: function( objectId ) {
    this.objectIds[objectId] = true;
    this.active = true;
  },

  setObjectIdToInactive: function( objectId ) {
    this.objectIds[objectId] = false;
    this.active = false;
  },

  getFirstInactiveObjectId: function( objectId ) {
    var inactiveObjectId;

    for ( var item in this.objectIds ) {
      if ( this.objectIds[item] == false ) {
        inactiveObjectId = item;
        break;
      }
    }

    return inactiveObjectId;
  },

  getArrayOfCheckedInObjectIds: function( ) {
    var objectArray = Array( );

    for ( var item in this.objectIds ) {
      objectArray.push( item );
    }

    return objectArray;
  },
}

// vim: set ai tabstop=2 shiftwidth=2 expandtab:
