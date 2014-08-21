var _ = require('underscore');
//returns true if valid, otherwise returns an error message
exports.validateNewUser = function(body){
  var username = body.username;
  var password = body.password;
  if(username && password){
    if(username.length > 3 && password.length > 3){
      return true;
    }
  }
  return false;
};