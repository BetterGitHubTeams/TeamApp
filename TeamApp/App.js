var Request = require('request');
var Express = require('express');
var CookieSession = require('cookie-session');
var QueryString = require('querystring');
var Jade = require('jade');
var Fs = require('fs');

var GitHub = require('./GitHub');

var App = Express();

// *************************************** JADE COMPILATION ***************************************
var index_fn = Jade.compileFile('jade_templates/index.jade');

var app_fn = Jade.compileFile('jade_templates/app/index.jade');
var apporg_fn = Jade.compileFile('jade_templates/app/org.jade');

var me_fn = Jade.compileFile('jade_templates/me.jade');

// *************************************** GLOBALS ***************************************
var secret_json = JSON.parse(Fs.readFileSync('Secret.json'));
var client_id = secret_json['client_id'];
var client_secret = secret_json['client_secret'];

// *************************************** USE METHODS ***************************************

App.use(function(req, res, next){
    console.log('%s - %s - %s', req.method, req.path, req.ip);
    next();
});

App.use(CookieSession({
    secret: 'BGT-Cookie-Session'
}));


// *************************************** GET METHODS ***************************************

App.get('/', function (req, res) {
    var locals = {
        page_title: 'Home'
    };
    res.send( index_fn(locals) );
});

//HANDLE OAUTH TO GITHUB
App.get('/auth', function(req, res) {
    var uri = null;
    var params = null;
    if(req.query.code === null || req.query.code === undefined) {
        // GET GITHUB CODE
        uri = 'https://github.com/login/oauth/authorize';
        params = {
            "client_id": client_id,
            "redirect_uri": 'http://localhost:3000/auth'
        };
        uri = uri + '?' + QueryString.stringify(params);
        res.redirect(uri);
    } else {
        //GET GITHUB ACCESS TOKEN
        uri = 'https://github.com/login/oauth/access_token';
        params = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": req.query.code,
            "redirect_uri": 'http://localhost:3000/app'
        };
        uri = uri + '?' + QueryString.stringify(params);

        Request.post(uri, function(err, resp, body){
            var query = QueryString.parse(body);
            req.session.access_token = query['access_token'];

            res.redirect('/app');
        });
    }

});

// *************************************** APP ***************************************
App.get('/app', function(req, res) {
    var locals = {
        "PAGE_TITLE": "app"
    };

    var WAIT_DONE = 0;
    var WAIT_TODO = 2;
    var WAIT_FUNC = function(){
        WAIT_DONE++;
        if(WAIT_DONE >= WAIT_TODO) {
            res.send( app_fn(locals) );
        }
    };

    BasicGitHub.GetUser(req.session.access_token, function(err, user){
        if(err) {console.log(err);}
        locals.GH_AUTHENTICATED_USER = user;
        WAIT_FUNC();
    });

    BasicGitHub.GetDetailedUserOrgs(req.session.access_token, function(err, orgs){
        if(err) {console.log(err);}
        locals.GH_DETAILED_ORGS = orgs;
        WAIT_FUNC();
    })
});

// *************************************** APP/ORG/:LOGIN ***************************************
App.get('/app/org/:login', function(req, res) {
    var login = req.params.login;
    var locals = {
        "PAGE_TITLE": "Org"
    };

    BasicGitHub.

    res.send( apporg_fn(locals) );

});

var Server = App.listen(3000, function () {

    var host = Server.address().address;
    var port = Server.address().port;

    console.log('Example app listening at http://%s:%s', host, port)

});
