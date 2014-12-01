var Request = require('request');
var Express = require('express');
var CookieSession = require('cookie-session');
var ServeStatic = require('serve-static');
var QueryString = require('querystring');
var Jade = require('jade');
var Fs = require('fs');
var Util = require('util');

var GitHub = require('./GitHub');

var App = Express();

// *************************************** JADE COMPILATION ***************************************
var jade_fns = {};
jade_fns['/'] = Jade.compileFile('jade/index.jade');
jade_fns['/dashboard'] = Jade.compileFile('jade/dashboard.jade');
jade_fns['/org'] = Jade.compileFile('jade/org.jade');

// *************************************** GLOBALS ***************************************
var secret_json = JSON.parse(Fs.readFileSync('Secret.json'));
var client_id = secret_json['client_id'];
var client_secret = secret_json['client_secret'];

// *************************************** OTHER FUNCTIONS ***************************************
function MakeWebAlert(type, message) {
    return {"type": type, "message": message};
}

// *************************************** USE METHODS ***************************************
App.use(CookieSession({
    secret: 'BGT-Cookie-Session'
}));

App.use(function(req, res, next){
    console.log(Util.format('%s - %s - %s', req.method, req.path, req.ip));

    if(req.session.web_alerts == null) {
        req.session.web_alerts = [];
    }

    next();
});

App.use('/bootstrap', Express.static('bower_components/bootstrap/dist'));
App.use('/jquery', Express.static('bower_components/jquery/dist'));

App.get('/', function (req, res) {
    var locals = {
        "authenticated": req.session.access_token != undefined
    };
    res.send( jade_fns['/'](locals) );
});

App.get('/auth', function(req, res) {
    var uri = null;
    var params = null;
    if(req.query.code == null) {
        // GET GITHUB CODE
        uri = 'https://github.com/login/oauth/authorize';
        params = {
            "client_id": client_id,
            "redirect_uri": 'http://localhost:3000/auth',
            "scope": 'gist, admin:org, user'
        };
        uri = Util.format('%s?%s', uri, QueryString.stringify(params));
        res.redirect(uri);
    } else {
        //GET GITHUB ACCESS TOKEN
        uri = 'https://github.com/login/oauth/access_token';
        params = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": req.query.code,
            "redirect_uri": 'http://localhost:3000/dashboard'
        };
        uri = uri + '?' + QueryString.stringify(params);

        Request.post(uri, function(err, resp, body){
            var query = QueryString.parse(body);
            req.session.access_token = query['access_token'];

            res.redirect('/dashboard');
        });
    }
});

App.get('/dashboard', function(req, res) {
    if(req.session.access_token == null) {
        res.redirect('/');
        return;
    }
    var locals = {
        "authenticated": req.session.access_token != null
    };

    var WAIT_TODO = 2;
    var WAIT_DONE = 0;
    var WAIT_FUNC = function() {
        WAIT_DONE++;
        if(WAIT_DONE >= WAIT_TODO) {
            res.send(jade_fns['/dashboard'](locals));
        }
    };

    GitHub.GetOrgs(req.session.access_token, function(err, orgs){
        locals.orgs = orgs;
        WAIT_FUNC();
    });

    GitHub.GetBGTFile(req.session.access_token, function(err, file){
        if(err){throw err;}

        console.log(file);
        locals.bgt_file = file;
        WAIT_FUNC();
    });
});

App.get('/org/:login', function(req, res){
    res.send('org/login');
});



App.get('/logout', function(req, res){
    delete req.session.access_token;
    res.redirect('/');
});

App.get('/create_bgt_file', function(req, res) {
    if(req.session.access_token == null) {
        res.redirect('/');
        return;
    }

    GitHub.CreateBGTFile(req.session.access_token, function(err){
        if(err){throw err;}
        res.redirect('/dashboard');
    });
});

App.get('/delete_bgt_file', function(req, res) {
    if(req.session.access_token == null) {
        res.redirect('/');
        return;
    }

    GitHub.DeleteBGTFile(req.session.access_token, function(err){
        if(err){throw err;}

        res.redirect('/dashboard');
    });
});

App.get('/test', function(req, res){
    GitHub.DeleteGist('ca513a3c0ab41901cb79', req.session.access_token, function(err){
        if(err){throw err;}

        res.send('Deleted');
    });
});

var Server = App.listen(3000, function () {
    var host = Server.address().address;
    var port = Server.address().port;
    console.log(Util.format('Example app listening at http://%s:%s', host, port));
});
