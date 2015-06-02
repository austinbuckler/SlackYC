var http = require('http');
var Firebase = require('firebase');
var unirest = require('unirest');
var moment = require('moment');

var botConfig = require('./bot');

var port = process.env.PORT || 3000;

var hackerNewsAPI = 'https://hacker-news.firebaseio.com/v0/';
var slackHook = '';

var topStories = function(callback) {
  var fbRequest = new Firebase(hackerNewsAPI + 'topstories');

  fbRequest.once('child_added', function(snapshot) {
    return callback(snapshot.val());
  }, function(err) {
    console.log('Request to firebase failed: ' + err.code);
  });
};

var storyInfo = function(data, callback) {
  var fbRequest = new Firebase(hackerNewsAPI + 'item/' + data);
  fbRequest.once('value', function(data) {
      return callback(data.val());
  });
};

/**
 * Checks for an empty config value.
 * This could be redone a lot better.
 * @returns {string}
 */
var checkEmptyConfig = function() {
    var cfgMessage = "";
    if (botConfig.iconURL.length != 0) {
        cfgMessage += ('"icon_url":' + botConfig.iconURL.jsonify());
    }
    if (botConfig.iconEmoji.length != 0) {
        cfgMessage += ('"icon_emoji":' + botConfig.iconEmoji.jsonify());
    }
    if (botConfig.username.length != 0) {
        cfgMessage += ('"username":' + botConfig.username.jsonify());
    }
    if (botConfig.channel.length != 0) {
        cfgMessage += ('"channel":' + botConfig.channel.jsonify());
    }
    if (botConfig.unfurlLinks == true) {
        cfgMessage += ('"unfurl_links":' + botConfig.unfurlLinks + ', ');
    }
    return cfgMessage;
};

var formatMessage = function(key, value, story) {
    var message = value;
    if (message.contains('[title]')) {
        message = message.replace('[title]', story.title);
        //message = message.replace('&', '&amp;');
        //message = message.replace('<', '&lt;');
        //message = message.replace('>', '&gt;');
    }
    if (message.contains('[type]')) { message = message.replace('[type]', story.type); }
    if (message.contains('[time]')) {
        var formattedTime = moment(story.time).format();
        var difference = moment(formattedTime).from('hh');
        message = message.replace('[time]', difference);
    }
    if (message.contains('[text]')) { message = message.replace('[text]', story.text); }
    if (message.contains('[score]')) { message = message.replace('[score]', story.score); }
    if (message.contains('[id]')) { message = message.replace('[id]', story.id); }
    if (message.contains('[author]')) { message = message.replace('[author]', story.by); }
    if (message.contains('[url]')) { message = message.replace('[url]', story.url); }
    return '"' + key +'":' + JSON.stringify(message);
};

http.createServer().listen(port, function() {
    topStories(function(topStory) {
        storyInfo(topStory, function(story) {
            var slackRequest = unirest.post(slackHook);
            slackRequest
                .header('Accept', 'application/json')
                .field(
                    'payload', "{" + checkEmptyConfig() + formatMessage('text', botConfig.text, story) + "}"
                )
                .end(function (response) {
                    console.log(response.body);
                });
        });
    });
});
console.log('Listening...');

String.prototype.contains = function(str) {
    return this.indexOf(str) != -1;
};

String.prototype.jsonify = function() {
    return JSON.stringify(this) + ', ';
}
