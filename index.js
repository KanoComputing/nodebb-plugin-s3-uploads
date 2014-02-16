var Package = require("./package.json");

var AWS = require('aws-sdk'),
    async = require('async'),
    mime = require("mime"),
    uuid = require("uuid").v4,
    fs = require('fs'),
    path = require('path'),

  winston = module.parent.require('winston'),
  db = module.parent.require('./database'),
  templates = module.parent.require('./../public/src/templates');
  User = module.parent.require("./user");


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

  function fetchSettings(){
    db.getObjectFields(Package.name, Object.keys(settings), function(err, newSettings){
      if(err) {
        return winston.error(err);
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

    winston.error(err);
    return err;
  }

  function migrateUserPictures(finished){
    var changes = [];
    User.getUsers('users:joindate', 0, -1, function(err, users){
      if(err){
        finished(err);
      }

      async.eachLimit(users, 20, function(user, next){
        if(!user.uploadedpicture){
          next();
        }
        
        changes.push({ previous: user.uploadedpicture, current: uuid() });
        next();
      }, function(err){
        finished(err, changes);
      });
    });
  }

  function migrate(respond){
    var results = {
      userPictures: [],
      topicPictures: []
    };

    async.applyEachSeries([
      migrateUserPictures
    ], function(results){
      console.log(arguments);

      var response = "<dl>";
      // if(results.userPictures.length > 0){
      //   response += "<dt>User Pictures</dt>";
      //   results.userPictures.forEach(function(change){
      //     response += "<dd><code>" + change.previous + " -&gt; " + change.current + "</code></dd>"
      //   });
      // }

      respond(null, response);
    });
  }

  // Delete settings on deactivate:
  plugin.activate = function(){
    fetchSettings();
  };

  // Delete settings on deactivate:
  plugin.deactivate = function(){
    S3Conn = null;
  };

  plugin.load = function(){
    fetchSettings();
  };

  plugin.handleUpload = function (image, callback) {
    if(!image || !image.path){
      winston.error(image);
      return callback(makeError("Invalid image data from plugin hook 'filter:uploadImage'"));
    }

    fs.readFile(image.path, putObject);

    function putObject(err, buffer){
      // Error from FS module:
      if(err){
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
  }


  var admin = plugin.admin = {};
  var adminRoute = "/plugins/s3-uploads";
  var adminMigrateRoute = adminRoute + "/migrate";

  admin.menu = function(headers) {
    headers.plugins.push({
      "route": adminRoute,
      "icon": 'fa-picture-o',
      "name": 'S3 Uploads'
    });

    return headers;
  }

  admin.route = function(pluginAdmin, callback) {
    async.mapSeries([
      path.join(__dirname, 'public/templates/admin.tpl'),
      path.join(__dirname, 'public/templates/migrate.tpl')
    ], function(path, cb){
      fs.readFile(path, cb);
    }, function(err, files){
      if(err){
        return callback(makeError(err), pluginAdmin);
      }

      var adminTemplate = templates.prepare(files[0].toString("utf-8"));
      var migratorTemplate = templates.prepare(files[1].toString("utf-8"));

      pluginAdmin.routes.push({
        route: adminRoute,
        method: 'get',
        options: function(req, res, next){
          next({
            req: req,
            res: res,
            route: adminRoute,
            name: 'S3 Uploads',
            content: adminTemplate.parse({
              bucket: settings.bucket,
              accessKeyId: (accessKeyIdFromDb && settings.accessKeyId) || "",
              secretAccessKey: (accessKeyIdFromDb && settings.secretAccessKey) || ""
            })
          });
        }
      });

      pluginAdmin.api.push({
        route: adminRoute + "/bucket",
        method: 'post',
        callback: function(req, res, next){
          var data = req.body;
          var newSettings = {
            bucket: data.bucket || ""
          }

          db.setObject(Package.name, newSettings, function(err, res){
            if(err){
              winston.error(makeError(err));
              return next({ error: true, message: err.toString() });
            }

            fetchSettings();
            return next({ error: false, message: 'Saved!' });
          });
        }
      });

      pluginAdmin.api.push({
        route: adminRoute + "/credentials",
        method: 'post',
        callback: function(req, res, next){
          var data = req.body;
          var newSettings = {
            accessKeyId: data.accessKeyId || "",
            secretAccessKey: data.secretAccessKey || ""
          };

          db.setObject(Package.name, newSettings, function(err, res){
            if(err){
              winston.error(makeError(err));
              return next({ error: true, message: err.toString() });
            }

            fetchSettings();
            return next({ error: false, message: 'Saved!' });
          });
        }
      });

      // Migrator:
      pluginAdmin.routes.push({
        route: adminMigrateRoute,
        method: 'get',
        options: function(req, res, next){
          next({
            req: req,
            res: res,
            route: adminMigrateRoute,
            name: 'S3 Uploads Migrator',
            content: migratorTemplate.parse({
              bucket: settings.bucket,
              accessKeyId: (accessKeyIdFromDb && settings.accessKeyId) || "",
              secretAccessKey: (accessKeyIdFromDb && settings.secretAccessKey) || ""
            })
          });
        }
      });

      pluginAdmin.api.push({
        route: adminMigrateRoute,
        method: 'post',
        callback: function(req, res, next){
          migrate(function(err, response){
            if(err){
              return next({ err: err });
            }

            return next({ err: null, results: response });
          });
        }
      });

      callback(null, pluginAdmin);
    });
  }
}(module.exports));
