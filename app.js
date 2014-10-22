var Request = require('request');
var Fs = require('fs');
var Express = require('express');
var ExpressSession = require('express-session');
var Url = require('url');
var Qs = require('querystring');
var Mu = require('mu2');

/******************** STATIC PAGES ********************/
var Static = Object();

//Custom Requires
var GitHub = require('./GitHub.js');

//Express Setup
var App = Express();

App.use(function(req, res, next) {
    ExpressSession({
        secret: 'BetterGithubTeams.TeamApp',
        resave: true,
        saveUninitialized: true
    });
});


/******************** / ********************/
App.get('/', function (req, res) {
    console.log('/');

    res.send('index');
});

/******************** /auth ********************/
/**
1) Redirect users to request GitHub access
**/
App.get('/auth', function(req, res) {
    console.log('/auth');

    var uri = 'https://github.com/login/oauth/authorize';
    var params = {
        client_id: GitHub.client_id,
        redirect_uri: 'http://localhost:3000/auth/code'
    };
    uri = uri + '?' + Qs.stringify(params);

    res.redirect(uri);
});

/******************** /auth/code ********************/
/**
2) Get query code and request access_token
**/
App.get('/auth/code', function(req, res){
    console.log('/auth/code');

    var uri = 'https://github.com/login/oauth/access_token';
    var params = {
        client_id: GitHub.client_id,
        client_secret: GitHub.client_secret,
        code: req.query.code,
        redirect_uri: 'http://localhost:3000/app'
    };
    uri = uri + '?' + Qs.stringify(params);

    Request.post(uri, function(err, res, body){
        var query = Qs.parse(body);
        req.session.access_token = query.access_token;
    });
});

App.get('/app', function(req, res) {
    res.send('app');
});


var Server = App.listen(3000, function () {

    var host = Server.address().address;
    var port = Server.address().port;

    console.log('Example app listening at http://%s:%s', host, port)

});
