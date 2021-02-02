var querystring = require("querystring"),
    _ = require('underscore'),
    request = require('request'),
    VError = require('verror'),
    crypto = require("crypto");

class Indodax {
  constructor(key, secret) {  
    this.key = key;
    this.secret = secret;
    this.tapi = 'https://indodax.com/tapi';
    this.api = 'https://indodax.com/api/';
    this.timeout = 5000;
    this._strictSSL = true;
  }
}

Indodax.prototype._get = function(pair, method, callback) {
  this._request({
    url: this.api + method + '/' + pair
  }, callback);
};

Indodax.prototype._post = function(method, params, callback) {
  var functionName = 'indodax._post()',
  self = this;

  if(!self.key || !self.secret) {
    return callback(new VError("%s must provide key and secret to make a private API request.", functionName))
  }
  params.nonce = self._generateNonce();
  var postData = {};
  for (var x in params) {
    postData[x] = params[x];
  }
  postData.method = method;

  var post = querystring.stringify(postData);
  var sign = crypto.createHmac('sha512', self.secret).update(new Buffer(post)).digest('hex').toString();

  var options =  {
    url: self.tapi,
    method: 'POST',
    form: post,
    headers: { 
      "User-Agent": "indodax node.js client",	
      Sign: sign,
      Key: self.key
    }
  };
  self._request(options, callback);
};

Indodax.prototype._request = function (options, callback) {
  var functionName = 'indodax._request()',
  self = this,
  requestOptions = {
    timeout: self.timeout,
    agent: self.agent, 
    strictSSL: self._strictSSL
  };

  for (var key in options) {
    requestOptions[key] = options[key];
  }
  
  request(requestOptions, function(err, response, body) {
  var error = null;
  if(err)
  {
     return callback(new VError('%s %s', functionName, err));
  }
  else if (response.statusCode < 200 || response.statusCode >= 300)
  {
    return callback(new VError('%s HTTP error: %s. Error message: %s', functionName, response.statusCode, response.statusMessage));
  }
  var result;
    try {
      result = JSON.parse(body);
    } catch(error) {
      return callback(new VError('%s Request error: %s', functionName, error.message));
    }
    if(result.error) {
      return callback(new VError('%s API error: %s', functionName, result.error));
    }
    callback(null, result);
  });
};

Indodax.prototype._generateNonce = function() {
  var now = new Date().getTime();

  if(now !== this.last)
    this.nonceIncr = -1;

  this.last = now;
  this.nonceIncr++;
  
  // add padding to nonce incr
  // @link https://stackoverflow.com/questions/6823592/numbers-in-the-form-of-001
  
  var padding =
    this.nonceIncr < 10 ? '000' :
      this.nonceIncr < 100 ? '00' :
        this.nonceIncr < 1000 ?  '0' : '';
  return now + padding + this.nonceIncr;
}

// 
// Public API
// 

Indodax.prototype.getTicker = function(pair, callback) {
  this._get(pair,'ticker', callback);
}

Indodax.prototype.getTrades = function(pair, callback) {
  this._get(pair, 'trades', callback);
}

Indodax.prototype.depth = function(pair, callback) {
  this._get(pair, 'depth', callback);
}

// 
// Private API
//
 
//This method gives user balances and server's timestamp

Indodax.prototype.getAccountBalances = function(callback) {
  this._post('getInfo', {}, callback);
};
 
//This method gives list of deposits and withdrawals of all currencies.

Indodax.prototype.getTransactionsHistory = function(callback) {
  this._post('transHistory', {}, callback);
};

//This method is for opening a new order.

Indodax.prototype.createOrders = function(pair, type, price, amount, callback) {
  const [asset, currency] = pair.split('_');
  var functionName = 'indodax.createOrder()',
  pair = [asset, currency].join('_'),
  params = {
     pair: pair,
     type: type,
     price: price
  };

    if (type === 'buy')
    {
       params = _.extend({[currency]: amount}, params);
    }
    else if (type === 'sell')
    {
       params = _.extend({[asset]: amount}, params);
    }
    else
    {
       return callback(new VError('%s Parameter error: type "%s" needs to be either "buy" or "sell"', functionName, type));
    }
   this._post('trade', params, callback);
};

//This method gives information about transaction in buying and selling history

Indodax.prototype.getTradeHistory = function(pair, callback) {
  this._post('tradeHistory', {
    'pair': pair
  }, callback);
};

//This method gives the list of current open orders (buy and sell).

Indodax.prototype.getActiveOrders = function(pair, callback) {
  if (!callback) {
    callback = pair;
    pair = null;
  }

  this._post('openOrders', {
	pair: pair}, 
	callback);
};

//This method gives the list of order history (buy and sell).

Indodax.prototype.getOrderHistory = function(pair, limit, since, callback) {
  this._post('orderHistory', {
    'pair': pair,
    'count': limit,
    'from': since
  }, callback);
};

//This method gives specific order details.

Indodax.prototype.getOrderDetails = function(pair, orderId, callback) {
  this._post('getOrder', {
    'pair': pair,
    'order_id': orderId
  }, callback);
};

//This method is for cancelling existing open order.

Indodax.prototype.cancelOrder = function(pair, orderId, type, callback) {
  this._post('cancelOrder', {
    'pair': pair,
    'order_id': orderId,
    'type': type
  }, callback);
};

module.exports = Indodax;
