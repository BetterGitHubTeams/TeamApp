var Request = require('request');
var Util = require('util');

function GitHub() {
    this.base_uri = 'https://api.github.com';

    // callback(error, data)
    this._get = function(path, success_code, access_token, callback) {
        var options = {
            'url': this.base_uri + path,
            "headers": {
                "authorization": Util.format("token %s", access_token),
                "accept": "application/vnd.github.v3+json",
                "content-type": "application/json",
                "user-agent": "BetterGithubTeams"
            }
        };
        Request.get(options, function(error, response, body){
            if(error) {
                console.error(error);
                callback(error, JSON.parse(body));
            } else if (response.statusCode !== success_code) {
                console.error('Status Code: '+response.statusCode+' - '+response.statusText);
                callback('Status Code: '+response.statusCode+' - '+response.statusText, JSON.parse(body));
            } else {
                callback(error, JSON.parse(body));
            }
        });
    };

    // Gets the Authenticated User
    // callback(err, user)
    this.GetUser = function(access_token, callback) {
        this._get('/user', 200, access_token, function(err, body) {
            callback(err, body);
        });
    };

    // Gets the user by username
    // callback(err, user)
    this.GetUserByUsername = function(username, access_token, callback) {
        this._get(
            Util.format('/users/%s', username),
            200, access_token,
            function(err, body) {
                callback(err, body);
            }
        );
    };

    // Get the Organizations of the authenticated user.
    // callback(err, [orgs])
    this.ListUserOrgs = function(access_token, callback) {
        this._get('/user/orgs', 200, access_token, function(err, body){
            callback(err, body);
        });
    };

    // Gets the Organization by the org login
    // callback(err, detailed_org)
    this.GetOrg = function(login, access_token, callback) {
        this._get(
            Util.format('/orgs/%s',login),
            200, access_token,
            function(err, body){
                callback(err, body);
            }
        );
    };

    // Get teams by org login
    // callback(err, [teams])
    this.ListTeams = function(login, access_token, callback) {
        this._get(
            Util.format('/orgs/%s/teams', login),
            200, access_token,
            function(err, body){
                callback(err, body);
            }
        );
    };

    // Get team by id
    // callback(err, team)
    this.GetTeam = function(id, access_token, callback) {
        this._get(
            Util.format('/teams/%s', id),
            200, access_token,
            function(err, body) {
                callback(err, body);
            }
        );
    };


    //callback(err, [members])
    this.GetTeamMembers = function(id, access_token, callback) {
        var self = this;

        this._get(
            Util.format('/teams/%d/members', id),
            200, access_token,
            function(err, body) {
                callback(err, body);
            }
        );
    };

    this.ListGists = function(access_token, callback) {
        this._get(
            '/gists',
            200, access_token,
            function(err, body) {
                callback(err, body);
            }
        );
    };

    this.GetGist = function(id, access_token, callback) {
        this._get(
            Util.format('/gists/%s', id),
            200, access_token,
            function(err, body) {
                callback(err, body);
            }
        );
    };

    /**************************************************************************
     * Advanced Github
     */

    // callback(err, teams)
    this.GetTeamWithMembers = function(id, access_token, callback) {

        var _team = null;
        var _members = [];

        var SYNC_TODO = 2;
        var SYNC_DONE = 0;
        var SYNC_FUNC = function() {
            SYNC_DONE += 1;
            if(SYNC_DONE >= SYNC_TODO) {

            }
        }



    };
}

module.exports = new GitHub();