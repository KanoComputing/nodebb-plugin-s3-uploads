var Package = require('./package.json');

var AWS = require('aws-sdk'),
    mime = require('mime'),
    uuid = require('uuid').v4,
    fs = require('fs'),
    path = require('path'),

  winston = module.parent.require('winston'),
  db = module.parent.require('./database');


(function(plugin) {
  "use strict";

  var S3Conn = null;
  var settings = {
    "accessKeyId": false,
    "secretAccessKey": false,
    "bucket": process.env.S3_UPLOADS_BUCKET || undefined
  };

  var accessKeyIdFromDb = false;
  var secretAccessKeyFromDb = false;

  var adminRoute = '/admin/plugins/s3-uploads';

  function fetchSettings(callback){
    db.getObjectFields(Package.name, Object.keys(settings), function(err, newSettings){
      if (err) {
        winston.error(err.message);
        if (typeof callback === 'function') {
          callback(err);
        }
        return;
      }

      accessKeyIdFromDb = false;
      secretAccessKeyFromDb = false;

      if(newSettings.accessKeyId){
        settings.accessKeyId = newSettings.accessKeyId;
        accessKeyIdFromDb = true;
      }else{
        settings.accessKeyId = false;
      }

      if(newSettings.secretAccessKey){
        settings.secretAccessKey = newSettings.secretAccessKey;
        secretAccessKeyFromDb = false;
      }else{
        settings.secretAccessKey = false;
      }

      if(!newSettings.bucket){
        settings.bucket = process.env.S3_UPLOADS_BUCKET || "";
      }else{
        settings.bucket = newSettings.bucket;
      }

      if(settings.accessKeyId && settings.secretAccessKey){
        AWS.config.update({
          accessKeyId: settings.accessKeyId,
          secretAccessKey: settings.secretAccessKey
        });
      }

      if (typeof callback === 'function') {
        callback();
      }
    });
  }

  function S3(){
    if(!S3Conn){
      S3Conn = new AWS.S3();
    }

    return S3Conn;
  }

  function makeError(err){
    if(err instanceof Error){
      err.message = Package.name + " :: " + err.message;
    }else{
      err = new Error(Package.name + " :: " + err);
    }

    winston.error(err.message);
    return err;
  }

  plugin.activate = function(){
    fetchSettings();
  };

  plugin.deactivate = function(){
    S3Conn = null;
  };

  plugin.load = function(app, middleware, controllers){
    fetchSettings(function(err) {
      if (err) {
        return winston.error(err.message);
      }

      app.get(adminRoute, middleware.admin.buildHeader, renderAdmin);
      app.get('/api' + adminRoute, renderAdmin);

      app.post('/api' + adminRoute + '/bucket', bucket);
      app.post('/api' + adminRoute + '/credentials', credentials);
    });
  };

  function renderAdmin(req, res) {
    var data = {
      bucket: settings.bucket,
      accessKeyId: (accessKeyIdFromDb && settings.accessKeyId) || '',
      secretAccessKey: (accessKeyIdFromDb && settings.secretAccessKey) || ''
    };

    res.render('admin/plugins/s3-uploads', data);
  }

  function bucket(req, res, next) {
    var data = req.body;
    var newSettings = {
      bucket: data.bucket || ''
    };

    saveSettings(newSettings, res, next);
  }

  function credentials(req, res, next) {
    var data = req.body;
    var newSettings = {
      accessKeyId: data.accessKeyId || '',
      secretAccessKey: data.secretAccessKey || ''
    };

    saveSettings(newSettings, res, next);
  }

  function saveSettings(settings, res, next) {
    db.setObject(Package.name, settings, function(err) {
      if (err) {
        return next(makeError(err));
      }

      fetchSettings();
      res.json('Saved!');
    });
  }

  plugin.handleUpload = function (image, callback) {
    if(!image || !image.path){
      winston.error(image);
      return callback(makeError("Invalid image data from plugin hook 'filter:uploadImage'"));
    }

    fs.readFile(image.path, putObject);

    function putObject(err, buffer){
      if(err) {
        return callback(makeError(err));
      }

      var params = {
        Bucket: settings.bucket,
        ACL: "public-read",
        Key: uuid() + path.extname(image.name),
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: mime.lookup(image.name)
      };

      S3().putObject(params, function(err){
        if(err){
          return callback(makeError(err));
        }

        callback(null, {
          name: image.name,
          // Use protocol-less urls so that both HTTP and HTTPS work:
          url: "//" + params.Bucket + ".s3.amazonaws.com/" + params.Key
        });
      });
    }
  };

  var admin = plugin.admin =  {};

  admin.menu = function(headers, callback) {
    headers.plugins.push({
      "route": '/plugins/s3-uploads',
      "icon": 'fa-picture-o',
      "name": 'S3 Uploads'
    });

    callback(null, headers);
  };

}(module.exports));
