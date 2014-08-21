var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  //relations
  //links:
  initialize: function(){
    this.on('creating', function(model, attr, options){
      bcrypt.genSalt(10, function(err, salt){
        bcrypt.hash(model.get('password'), salt, null, function(err, hash){
          model.set('password', hash);
        });
      });
    });
  }
});

module.exports = User;