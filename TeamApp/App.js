var Request = require('request');
var Express = require('express');
var ExpressSession = require('express-session');
var QueryString = require('querystring');
var Jade = require('jade');
var Fs = require('fs');

var App = Express();

// *************************************** JADE COMPILATION ***************************************
var index_fn = Jade.compileFile('jade_templates/index.jade');
var app_fn = Jade.compileFile('jade_templates/app.jade');

// *************************************** GLOBALS ***************************************
var secret_json = JSON.parse(Fs.readFileSync('Secret.json'));
var client_id = secret_json['client_id'];
var client_secret = secret_json['client_secret'];

// *************************************** AUTH ***************************************
function getOauthCode(req, res) {
    var uri = 'https://github.com/login/oauth/authorize';
    var params = {
        "client_id": client_id,
        "redirect_uri": 'http://localhost:3000/auth'
    };
    uri = uri + '?' + QueryString.stringify(params);
    res.redirect(uri);
}
function getOauthAccessToken(req, res) {
    var uri = 'https://github.com/login/oauth/access_token';
    var params = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": req.query.code,
        "redirect_uri": 'http://localhost:3000/app'
    };
    uri = uri + '?' + QueryString.stringify(params);

    Request.post(uri, function(err, resp, body){
        var query = QueryString.parse(body);
        resp.session.access_token = query['access_token'];

        res.redirect('/app');
    });
}

// *************************************** USE METHODS ***************************************

App.use(ExpressSession( {secret: 'BGT-TeamApp-SessionKey'} ));

App.use(function(req, res, next){
    console.log('%s - %s - %s', req.method, req.path, req.ip);
    next();
});

// *************************************** GET METHODS ***************************************

App.get('/', function (req, res) {
    var locals = {
        page_title: 'Home'
    };

    res.send( index_fn(locals) );
});

//Handle Oauth stuff, send to /app if successful.
App.get('/auth', function(req, res) {
    if(req.query.code) {
        getOauthCode(req, res);
    } else {
        getOauthAccessToken(req, res);
    }

});

App.get('/app', function(req, res) {
    var locals = {
        page_title: 'App'
    };

    res.send( app_fn(locals) );
});


var Server = App.listen(3000, function () {

    var host = Server.address().address;
    var port = Server.address().port;

    console.log('Example app listening at http://%s:%s', host, port)

});
