// Whole-script strict mode syntax
"use strict";

//http://jobsearch.monster.com/search/devops+Full-Time_58?ye=2-years&where=California&salmin=70000&saltyp=1
//phantomjs getOffers.js -u http://jobsearch.monster.com/search/devops+Full-Time_58?ye=2-years&where=California&salmin=70000&saltyp=1

var webpage           = require('webpage'),
    page              = webpage.create(),
    system            = require('system'),
    args              = require('minimist')(system.args.slice(1)),
    moment            = require('moment'),
    _                 = require('underscore');
    //clearing minimist memory from the pwd and email
    require('minimist')(['stuff', 'nuff', 'nop', 'top', 'nutch', 'fetch', 'ornot']);

var log = function(msg){console.log('['+moment().format('h:mm:ss a')+'] '+msg);};
var exit = function() {
  log('Fin.');
  phantom.exit();
};



if ((args.url == undefined) && (args.u == undefined))
{
  console.log('Usage: getOffers.js --url http://jobsearch.monster.com/search/');
  console.log('       getOffers.js -u http://jobsearch.monster.com/search/');
  exit();
}
var url               = (args.url != undefined)?(args.url):(args.u);

var nodeserver_ip     = system.env.NODESERVER_HOST    || "0.0.0.0",
  nodeserver_port     = system.env.NODESERVER_PORT    || 8811,
  maxDelayPerRequest  = 60;


//
// UTILITY
//
var total = 0;
var current = 0;
var urlLoaded = null;
var click = function(selector, fakeMode)
{
  if (fakeMode === true)
  {
    page.evaluate(function(selector) {
      return $(selector).trigger('click');
    }, selector);
  }
  else
  {
    var position = page.evaluate(function(selector) {
      return $(selector).offset();
    }, selector);
    page.sendEvent("click", position.left, position.top, 'left');
  }
};
var fillAndsubmit = function(form, names) {
  page.evaluate(function(form, names)
  {
    for (var i = names.length - 1; i >= 0; i--)
    {
      var selector = form+' [name='+names[i][0]+']';
      if ($(selector).is('select'))
        $(selector+" option").filter(function() {
          return $.trim($(this).text()) === $.trim(names[i][1]);
        }).prop('selected', true);
      else if ($(selector).is('input'))
        $(selector).val(names[i][1]);
    }
    $(form).submit();
  }, form, names);
};
var currentUrl = function() {
  return page.evaluate(function(){return window.location.href;});
};
var waittil = function(urlToWaitFor, delay, then) {
  urlLoaded = null;
  var start = moment();
  var urls = ( (Array.isArray(urlToWaitFor)) ? (urlToWaitFor) : ([urlToWaitFor]) );
  var intervalID = window.setInterval(function()
  {
    if ((moment().diff(start, 'seconds') > delay) ||
      (urls.indexOf(urlLoaded) > -1)/* ||
      (urls.indexOf(currentUrl()) > -1)*/)
    {
      clearInterval(intervalID);
      var found = ((urls.indexOf(urlLoaded) > -1)/* || ((urls.indexOf(currentUrl())) > -1) */);
      urlLoaded = null;
      then(found);
    }
  },
  200);
};
page.onLoadFinished = function(status) {
  urlLoaded = currentUrl();
  page.includeJs('http://'+nodeserver_ip+':'+nodeserver_port+'/socket.io/socket.io.js');
};
var hasClass = function(el, classToCheck) {
  return page.evaluate(function(el, classToCheck) {
    return $(el).hasClass(classToCheck);
  }, el, classToCheck);
};
var hasDiv = function(selector) {
  var res = page.evaluate(function(selector) {
    return $(selector).length >= 1;
  }, selector);
  return res;
};
page.onConsoleMessage = function(msg, lineNum, sourceId) {
  console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
  if (msg == "exit phantomjs.")
    window.setTimeout(exit, 9000);
};
//
//
//



//DATABASE UTILITIES
var sendCmds = function(offers) {
  page.evaluate(function(offers, url) {
    var id = null;
    var fireWhenReady = function () {
        if (typeof io != 'undefined') {
          if (id != null)
              clearTimeout(id);
          var socket = io.connect(url);
          socket.emit('stack_a_job', JSON.parse(offers), function response(data) {
            console.log('exit phantomjs.');
          });
        }
        else {
          id = setTimeout(fireWhenReady, 100);
        }
    };
    fireWhenReady();
  }, JSON.stringify(offers), 'http://'+nodeserver_ip+':'+nodeserver_port+'/');
};










//
// Algo
//
var save = function(offers) {
  offers = _.flatten(offers);
  var datas = [];
  for (var i = offers.length - 1; i >= 0; i--) {
    var data = {bin:'submitToOffer.js', params:offers[i]};
    datas.push(data);
    log(JSON.stringify(data));
  }
  sendCmds(datas);
};
var thereisanextpage = function() {
  return page.evaluate(function() {
    return $('a.nextLink').length == 1;
  });
};
var nextPage = function(offers)
{
  log('Next page.');
  var next_page_url = page.evaluate(function() {return $('a.nextLink').attr('href');});
  page.open(next_page_url, function() {
    getLinksOffers(offers);
  });
};
var getLinksOffers = function(offers)
{
  if ((offers == null) || (offers == undefined) || (offers == 'success'))
    var offers = [];
  offers.push(page.evaluate(function() {
    var offers = [];
    var push_offer = function(index, value) {
      var offer = {title:null, link:null, location:null}
      offer.title     = $(value).find('.jobTitleContainer').text().trim();
      offer.link      = $(value).find('.jobTitleContainer a').attr('href');
      offer.location  = $(value).find('.jobLocationSingleLine a').text().trim();
      offers.push(offer);
    };
    $('.odd').each(push_offer);
    $('.even').each(push_offer);
    return offers;
  }));
  if (thereisanextpage())
    nextPage(offers);
  else
    save(offers);
};
page.open(url, getLinksOffers);
