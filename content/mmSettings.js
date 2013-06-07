// vim: set ai tabstop=2 shiftwidth=2 expandtab:

Components.utils.import( "resource://modules/log4moz.js" );

function mmSettings(){
  this._init();
}

mmSettings.prototype=
{
  prefs: null,
  converter: null,
  _strbundle:null,
  firefoxVersion3:false,
  logger: null,

  _init:function()
  {
  	this.logger = Log4Moz.Service.getLogger( "MMBookmarks.mmSettings" );
    this.logger.debug("mmSettings:_init\n");
    var prefsService = Components.classes["@mozilla.org/preferences-service;1"].
    getService(Components.interfaces.nsIPrefService);
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);
    if (versionChecker.compare(appInfo.version, "3.0a")>=0) {
      this.firefoxVersion3=true;
    }
    this.logger.debug("mmSettings.firefoxVersion3: "+this.firefoxVersion3+"\n");
			
    this.prefs = prefsService.getBranch("mobilmail.");
    this.prefs.setBoolPref("publicid",true);
    this.prefs.setBoolPref("merge",false);

    this.converter=Components.classes["@mozilla.org/intl/texttosuburi;1"]
        .getService(Components.interfaces.nsITextToSubURI);
    this.logger.debug("mmSettings:_init user: "+this.user+"\n");
    this.logger.debug("mmSettings:_init hostname: "+this.hostname+"\n");

    this._strbundle=Components.classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService)
      .createBundle("chrome://mmbookmarks/locale/mmControl.properties");
  },

  getCharPref: function(string, def)
  {
    var result;
    
    try {
      result = this.prefs.getCharPref(string);
    } catch (e) {
      result = def;
    }
    
    return result;
  },

  getIntPref: function(string, def)
  {
    var result;
    
    try {
      result = this.prefs.getIntPref(string);
    } catch (e) {
      result = def;
    }
    
    return result;
  },

  setBool: function(string,value)
  {
    this.prefs.setBoolPref(string,value);
  },

  // FIXME: Straub
  getBool: function(string, def)
  {
    var result;
    
    try {
      result = this.prefs.getBoolPref(string);
    } catch (e) {
      result = def;
    }
    
    return result;
  },

  getBoolPref: function(string, def)
  {
    var result;
    
    try {
      result = this.prefs.getBoolPref(string);
    } catch (e) {
      result = def;
    }
    
    return result;
  },
    
  get cacheFolder(){
      return this.getCharPref("session.root","");
  },

  set cacheFolder(aStr){
    this.prefs.setCharPref("session.root",aStr);
  },

  get cacheToolbar(){
      return this.getCharPref("session.toolbar","");
  },

  set cacheToolbar(aStr){
    this.prefs.setCharPref("session.toolbar",aStr);
  },

  get _file(){
    var ds = Components.classes['@mozilla.org/file/directory_service;1']
                       .getService(Components.interfaces.nsIProperties);
    var file = ds.get('ProfD', Components.interfaces.nsIFile);
    file.append("bookmarks.xml");
    return file;
  },

  get _backupfile(){
    var ds = Components.classes['@mozilla.org/file/directory_service;1']
                       .getService(Components.interfaces.nsIProperties);
    var file = ds.get('ProfD', Components.interfaces.nsIFile);
    file.append("bookmarks_backup_.xml");
    return file;
  },

  get _undoFile(){
    var ds = Components.classes['@mozilla.org/file/directory_service;1']
                       .getService(Components.interfaces.nsIProperties);
    var file = ds.get('ProfD', Components.interfaces.nsIFile);
    file.append("bmsync__undo__.xml");
    return file;
  },

  get _redoFile(){
    var ds = Components.classes['@mozilla.org/file/directory_service;1']
                       .getService(Components.interfaces.nsIProperties);
    var file = ds.get('ProfD', Components.interfaces.nsIFile);
    file.append("bmsync__redo__.xml");
    return file;
  },

  get undoable(){
    return this._undoFile.exists() && this.cacheFolder &&
           this.selectedFolder==this.cacheFolder &&
           this.getBool("session.enabled",false);
  },

  get redoable(){
    return this._redoFile.exists() && this.cacheFolder &&
           this.selectedFolder==this.cacheFolder &&
           this.getBool("session.enabled",false);
  },

  set undoCache(aStr){
    if(aStr)
      this.write(this._undoFile,aStr);
    else if(this._undoFile.exists())
      this._undoFile.remove(false);
  },

  set redoCache(aStr){
    if(aStr)
      this.write(this._redoFile,aStr);
    else if(this._redoFile.exists())
      this._redoFile.remove(false);
  },

  get redoCache(){
    return (this._redoFile.exists())? this.read(this._redoFile): "";
  },

  get undoCache(){
    return (this._undoFile.exists())? this.read(this._undoFile): "";
  },

  get doMerge()
  {
    return this.getBool("merge",false)
  },

  get cache()
  {
    return (this._file.exists())? this.read(this._file): "";
  },

  set cache(aStr)
  {
    this.write(this._file,aStr);
  },

  getString: function(aName) {
    try{
      if(this._stringbundle)
        return this._strbundle.GetStringFromName(aName);
    }catch(e){ alert(e+"\n\n"+aName);}
    return aName;
  },

  get user(){
    return this.getCharPref("user", "");
  },

  set user(string){
    this.prefs.setCharPref("user", string);
  },

  get escapedUser() {
    return this.converter.ConvertAndEscape("utf-8", this.user);
  },

  get hostname() {
    return this.getCharPref("hostname", "bookmarks.mobilmail.at");
  },

  set hostname(host) {
    this.prefs.setCharPref("hostname", host);
  },

  get protocoll() {
    return this.getCharPref("protocoll", "https");
  },

  set protoccoll(proto) {
    this.setCharPref("protocoll", proto);
  },

  get password() 
  {
    if (!this.firefoxVersion3) {
      var host= new Object();
      var user= new Object();
      var pass= new Object();
      try{
        var pmInternal = Components.classes["@mozilla.org/passwordmanager;1"]
          .createInstance(Components.interfaces.nsIPasswordManagerInternal);
        pmInternal.findPasswordEntry(this.hostname,this.user,"",host,user,pass);
        return pass.value;
      } catch(e) {
        return "";
      }
    } else {
      var password="";
      var myLoginManager = Components.classes["@mozilla.org/login-manager;1"]
       .getService(Components.interfaces.nsILoginManager);
      var logins = myLoginManager.findLogins({}, "https://"+this.hostname, null, "Authorization required");
      for (var i = 0; i < logins.length; i++) {
        if (logins[i].username == this.user) {
          password = logins[i].password;
          break;
        }
      }
      return password;
    }

  },

  set password(aStr){
    if (!this.firefoxVersion3) {
      var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
        .createInstance(Components.interfaces.nsIPasswordManager);
      try { 
        passwordManager.removeUser(this.hostname, this.user);
      } catch(e) {}
      passwordManager.addUser(this.hostname, this.user, aStr);
    } else {
      var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                             Components.interfaces.nsILoginInfo,
                                             "init");
      var loginInfo = new nsLoginInfo('https://'+this.hostname,
        null, 'Authorization required',
        this.user, aStr, "", "");
      var myLoginManager = Components.classes["@mozilla.org/login-manager;1"]
       .getService(Components.interfaces.nsILoginManager);
      
      this.removeUser();
      try {
        myLoginManager.addLogin(loginInfo);
      } catch(e) {alert(e); }
    }
  },

  // FIXME: what is this?
  get escapedPassword() {
    return this.converter.ConvertAndEscape("utf-8", this.password);
  },

  removeUser:function()
  {
    if (!this.firefoxVersion3) {
      var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
        .createInstance(Components.interfaces.nsIPasswordManager);
      if (this.user=="") {
        return;
      }
      passwordManager.removeUser(this.hostname, this.user);
      this.user="";
    } else {
      var passwordManager = Components.classes["@mozilla.org/login-manager;1"]
                             .getService(Components.interfaces.nsILoginManager);
      var logins = passwordManager.findLogins({}, "https://"+this.hostname, null, "Authentication required");
          
      for (var i = 0; i < logins.length; i++) {
        if (logins[i].username == this.user) {
          passwordManager.removeLogin(logins[i]);
          this.user="";
          break;
        }
      }
    }
  },

  get automaticDownload() {
    return this.getBoolPref("automaticDownload", false);
  },

  set automaticDownload(flag) {
    this.prefs.setBoolPref("automaticDownload", flag);
  },

  get automaticUpload() {
    return this.getBoolPref("automaticUpload", false);
  },

  set automaticUpload(flag) {
    this.prefs.setBoolPref("automaticUpload", flag);
  },

  get automaticSync() {
    return this.getBoolPref("automaticSync", false);
  },

  set automaticSync(flag) {
    this.prefs.setBoolPref("automaticSync", flag);
  },

  set bookmarksModified(flag) {
    this.prefs.setBoolPref("bookmarksModified", flag);
  },

  get bookmarksModified() {
    return this.getBoolPref("bookmarksModified", false);
  },

  set uninitialized(flag) {
    this.prefs.setBoolPref("uninitialized", flag);
  },

  get uninitialized() {
    return this.getBoolPref("uninitialized", true);
  },

  set initializeInProgress(flag) {
    this.prefs.setBoolPref("initializeInProgress", flag);
  },

  get initializeInProgress() {
    return this.getBoolPref("initializeInProgress", false);
  },

  set timerActive(flag) {
    this.prefs.setBoolPref("timerActive", flag);
  },

  get timerActive(flag) {
    return this.getBoolPref("timerActive", false);
  },

  set localDbSerialNr(string) {
    this.prefs.setCharPref("localdbserialnr", string);
  },

  get localDbSerialNr() {
    return this.getCharPref("localdbserialnr","0");
  },

  set centralDbSerialNr(string) {
    this.prefs.setCharPref("centraldbserialnr", string);
  },

  get centralDbSerialNr() {
    return this.getCharPref("centraldbserialnr","0");
  },

  set statusText(string) {
    this.prefs.setCharPref("statusText", string);
  },

  get statusText() {
    return this.getCharPref("statusText", "unbekannt");
  },

  set syncIntervall(seconds) {
    this.prefs.setIntPref("syncIntervall", seconds);
  },

  get syncIntervall() {
    return this.getIntPref("syncIntervall", 300);
  },

  set modifiedIntervall(seconds) {
    this.prefs.setIntPref("modifiedIntervall", seconds);
  },

  get modifiedIntervall() {
    return this.getIntPref("modifiedIntervall", 30);
  },

  set lastSyncTime(ms) {
    this.prefs.setCharPref("lastSyncTime", ms);
  },

  get lastSyncTime() {
    return this.getCharPref("lastSyncTime", "0");
  },

  get mmBaseUrl() {
    return this.protocoll+":"+this.hostname;
  },

  get selectedFolder(){
    var folder= this.getCharPref("folderId","");
      return (folder)? folder:"NC:BookmarksRoot";
  },

  set selectedFolder(aStr){
    this.prefs.setCharPref("folderId",aStr);
  },

  get loadConfiguration() {
    return this.getBoolPref("loadConfiguration", true);
  },

  set loadConfiguration(flag) {
    this.prefs.setBoolPref("loadConfiguration", flag);
  }, 

  get helpAccount() {
    return this.getCharPref("helpAccount", "http://www.mobilmail.at");
  },

  set helpAccount(url) {
    this.prefs.setCharPref("helpAccount", url);
  },

  get helpStatus() {
    return this.getCharPref("helpStatus", "http://www.mobilmail.at");
  },

  set helpStatus(url) {
    this.prefs.setCharPref("helpStatus", url);
  },

  get helpLog() {
    return this.getCharPref("helpLog", "http://www.mobilmail.at");
  },

  set helpLog(url) {
    this.prefs.setCharPref("helpLog", url);
  },

  get helpOptions() {
    return this.getCharPref("helpOptions", "http://www.mobilmail.at");
  },

  set helpOptions(url) {
    this.prefs.setCharPref("helpOptions", url);
  },

  get helpAbout() {
    return this.getCharPref("helpAbout", "http://www.mobilmail.at");
  },

  set helpAbout(url) {
    this.prefs.setCharPref("helpAbout", url);
  },

  get version() {
    return(this.getInstallFileInfo("version"));
  },

  set lastVersion(version) {
    this.prefs.setCharPref("lastVersion", version);
  },

  get lastVersion() {
    return this.getCharPref("lastVersion", "");
  },

  set logLevel( level ) {
    this.prefs.setCharPref( "logLevel", level );
  },

  get logLevel( ) {
    return this.getCharPref( "logLevel", "Error" );
  },

  // cleanup to 0.24
  cleanup1:function() {
    try {
      this.prefs.clearUserPref("hostname");
    } catch(e) {}
  },

  read:function(aFile)
  {
    var fs = Components.classes['@mozilla.org/network/file-input-stream;1']
            .createInstance(Components.interfaces.nsIFileInputStream);
    var ss = Components.classes['@mozilla.org/scriptableinputstream;1']
            .createInstance(Components.interfaces.nsIScriptableInputStream);
    try{
      fs.init(aFile, 0x01, 0000, false);
      ss.init(fs);
      var str = ss.read(-1);
      ss.close();
      fs.close();
      return str;
    }catch(e){alert(e);}
    return "";
  },

  get mimetype(){
    if(!this.charset)
      return "text/xml";
    else
      return "text/xml; charset=" + this.charset;
  },

  get charset() {
    return "utf-8";
  },

  write:function(aFile,aStr)
  {
    var output=Components.classes['@mozilla.org/network/file-output-stream;1']
               .createInstance(Components.interfaces.nsIFileOutputStream);
    var input = Components.classes["@mozilla.org/io/string-input-stream;1"]
              .createInstance(Components.interfaces.nsIStringInputStream);
    input.setData(aStr, -1);
    var length=input.available();
    input.close();
    output.init(aFile, 0x20|0x02|0x08, 0666, 0);
    output.write(aStr, length);
    output.close();
  },

  getInstallFileInfo:function(key)
  {
    var rdf=Components.classes["@mozilla.org/rdf/rdf-service;1"].
      getService(Components.interfaces.nsIRDFService);
    var ds=Components.classes["@mozilla.org/extensions/manager;1"].
      getService(Components.interfaces.nsIExtensionManager).datasource;
    var r1 = rdf.GetResource("urn:mozilla:item:{14a231f3-d929-4d97-82ef-9bf95d4c71be}");
    var r2 = rdf.GetResource("http://www.mozilla.org/2004/em-rdf#"+key);
    var t = ds.GetTarget(r1, r2, true);
    if (t instanceof Components.interfaces.nsIRDFLiteral) {
      return t.Value;
    } else {
      throw("Error getting Info for "+key);
    }
  }

};

var gSettings=new mmSettings();
