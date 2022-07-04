const fetch = require("node-fetch");
const statusCodes = require("http-status-codes");
const base64url = require('base64url');

const tUsrDao = require('./tUsrDao');
const config = require('./config');
const util = require('./util');

let savedWords = [];

/**
 * check the incoming access token with one from the database
 */
const checkAccessToken = async (req, res, next) => {
  try {
    const authorization = req.headers["authorization"]; // Express.js automatically lowercases all incoming HTTP headers
    
    const incomingToken =
      authorization?.toLowerCase().indexOf("bearer") === 0 // converts the value of the header to lowercase too
      ? authorization.slice("bearer ".length) // token value itself is case sensitive, hence we slice the original string, not a transformed one
      : (req.body.accessToken ? req.body.accessToken : req.query.accessToken);

    // js's weird behaviour
    if(!incomingToken || incomingToken === 'null') {
      throw new Error(`no matching token for incomingToken`);
    }

    const cushion = incomingToken.split('.');
    const header = JSON.parse(base64url.decode(cushion[0]));
    const payload = JSON.parse(base64url.decode(cushion[1]));

    console.log(`${util.fetchCurrentDatetimeJst()} [resourceController.checkAccessToken] token = {header: ${JSON.stringify(header)}, payload: ${JSON.stringify(payload)}}`);

    const introspectionResponse = await fetch(config.authServer.introspectionEndpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Authorization': 'Basic ' + util.encodeClientCredentials(config.resource.resourceId, config.resource.resourceSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: util.createRequestBody({token: incomingToken}),
    });

    if(!introspectionResponse.ok) {
      throw new Error(`introspection failed`);
    }

    const isActive = await introspectionResponse.json();

    if (!isActive) {
      throw new Error(`token inactive`);
    }

    req.accessToken = payload;
    next();
    return;
  } catch (e) {
    console.log(`${util.fetchCurrentDatetimeJst()} [resourceController.checkAccessToken] ${e}`);
    res.status(statusCodes.UNAUTHORIZED).end();
    return;
  }
};

/**
 * set access control fields for a preflight request
 */
const handleCrossDomainRequest = (req, res, next) => {
  const whitelist = ['http://localhost:9005'];
  if(whitelist.indexOf(req.headers.origin) !== -1) {
    res.header('Access-Control-Allow-Origin', req.headers.origin); // allows cross domain requests from the Origin
  }
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,HEAD,OPTIONS'); // methods allowed for cross domain requests
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-MyRequest,X-MyOption'); // fields allowed in the request header after the preflight request
  res.header('Access-Control-Allow-Credentials', 'true'); // allows Cookie field in the request header after the preflight request
  res.header('Access-Control-Max-Age', 60 * 60); // caches the preflight request for an hour
  res.header('Access-Control-Expose-Headers', 'X-MyResponse'); // allows original fields in the response header
  res.header('X-MyResponse', `${req.headers["x-myrequest"]},${req.headers["x-myoption"]}`);
  res.header('Strict-Transport-Security', 'max-age=3600');

  if (req.method === 'OPTIONS') {
    res.status(statusCodes.OK);
  }

  next();
};

/**
 * returns the protected config.resource given an access token
 */
const getResource = (req, res) => {
  console.log(`${util.fetchCurrentDatetimeJst()}: [resourceController.getResource] req.query = ${JSON.stringify(req.query)}`);

  if (!req.accessToken) {
    res.status(statusCodes.UNAUTHORIZED).end();
    return;
  }

  res.header('Content-Type', 'application/json; charset=utf-8');
  res.header('X-Content-Type-Options', 'nosniff'); // cf. https://atmarkit.itmedia.co.jp/ait/articles/1403/24/news005_2.html
  res.header('X-XSS-Protection', '1; mode=block'); // cf. https://stackoverflow.com/questions/9090577/what-is-the-http-header-x-xss-protection

  if(req.query.lang === 'en') {
    res.json({description: "Hello World"});
    return;
  }

  if (req.query.lang === "fr") {
    res.json({description: "Bonjour monde"});
    return;
  }

  res.json({description: `Error, invalid language: ${escape(req.query.lang)}`}); // prevents XSS attacks
};

/**
 * get savedWords
 */
const readWords = (req, res) => {
  console.log(`${util.fetchCurrentDatetimeJst()}: [resourceController.readWords] req.query = ${JSON.stringify(req.query)}`);
  if (!util.isScopeValid(req.accessToken.scopes, "read")) {
    res.set(`WWW-Authenticate', 'Bearer realm=localhost:9002, error="insufficient_scope", scopes="${req.accessToken.scopes}"`);
    res.status(statusCodes.FORBIDDEN).end();
    return;
  }
  res.json({words: savedWords.join(" "), timestamp: util.fetchCurrentDatetimeJst()});
};

/**
 * update savedWords
 */
const writeWords = (req, res) => {
  console.log(`${util.fetchCurrentDatetimeJst()}: [resourceController.writeWords] req.body = ${JSON.stringify(req.body)}`);
  if (!util.isScopeValid(req.accessToken.scopes, "write")) {
    res.set(`WWW-Authenticate', 'Bearer realm=localhost:9002, error="insufficient_scope", scopes="${req.accessToken.scopes}"`);
    res.status(statusCodes.FORBIDDEN).end();
    return;
  }
  if (req.body.word) {
    savedWords.push(req.body.word);
  }
  res.status(statusCodes.CREATED).end();
};

/**
 * delete the last element from savedWords
 */
const deleteWords = (req, res) => {
  console.log(`${util.fetchCurrentDatetimeJst()}: [resourceController.deleteWords]`);
  if (!util.isScopeValid(req.accessToken.scopes, "delete")) {
    res.set(`WWW-Authenticate', 'Bearer realm=localhost:9002, error="insufficient_scope", scopes="${req.accessToken.scopes}"`);
    res.status(statusCodes.FORBIDDEN).end();
    return;
  }
  savedWords.pop();
  res.status(statusCodes.NO_CONTENT).end();
};

/*
 * returns different kinds of products according to the incoming token's scopes
 */
const getProducts = (req, res) => {
  console.log(`${util.fetchCurrentDatetimeJst()}: [resourceController.getProducts] req.query = ${JSON.stringify(req.query)}`);

  const products = { fruit: [], veggies: [], meats: [] };

  if (util.isScopeValid(req.accessToken.scopes, "fruit")) {
    products.fruit = ["apple", "banana", "kiwi"];
  }

  if (util.isScopeValid(req.accessToken.scopes, "veggies")) {
    products.veggies = ["lettuce", "onion", "potato"];
  }

  if (util.isScopeValid(req.accessToken.scopes, "meats")) {
    products.meats = ["bacon", "steak", "chicken breast"];
  }

  res.header('Content-Type', 'application/json; charset=utf-8');
  res.json(products);
};

/**
 * returns favorites based on the user in an access token
 */
const getFavorites = (req, res) => {
  console.log(`${util.fetchCurrentDatetimeJst()}: [resourceController.getFavorites]`);

  const users = {
    "9XE3-JI34-99999A" : {
      user: 'john',
      favorites: {
        movies: ["Taxi Driver", "The Godfather", "Sonatine"],
        foods: ["nothing"],
        music: ["jazz"],
      }
    },
    "00u1sneigDs6Rolmu2p6": {
      user: 'ken',
      favorites: {
        movies: ["The Multidmensional Vector", "Space Fights", "Jewelry Boss"],
        foods: ["bacon", "pizza", "bacon pizza"],
        music: ["techno", "industrial", "alternative"],
      }
    },
    "1ZT5-OE63-57383B":{
      user: 'bob',
      favorites: {
        movies: ["An Unrequited Love", "Several Shades of Turquoise", "Think Of The Children"],
        foods: ["bacon", "kale", "gravel"],
        music: ["baroque", "ukulele", "baroque ukulele"],
      }
    }
  };

  const sub = req.accessToken.sub;

  if(Object.keys(users).indexOf(sub) === -1) {
    res.json({user: "Unknown", favorites: {movies: [], foods: [], music: []}});
    return;
  }

  res.json(users[sub]);
};

const getUserInfo = async (req, res) => {
  const accessToken = req.accessToken;

  console.log(`${util.fetchCurrentDatetimeJst()} [resourceController.getUserInfo] accessToken = ${JSON.stringify(accessToken)}`);

  // OpenID Connect defines a special scopes `openid` that controls overall access to the UserInfo endpoint with access token
  if (accessToken.scopes.indexOf('openid') === -1) {
    console.log(`${util.fetchCurrentDatetimeJst()} [resourceController.getUserInfo] no openid in the scopes`);
    res.status(statusCodes.FORBIDDEN).end();
    return;
  }

  const getPropsFromObj = (props, obj) => props.reduce((a, p) => ({...a, [p]: obj[p]}), {});

  const userInfoFactory =  {
    "openid": usr => ({sub: usr['sub']}),
    "profile": usr => getPropsFromObj(['name', 'familyName', 'givenName', 'middleName', 'nickname', 'preferredUsername', 'profile', 'picture', 'website', 'gender', 'birthdate', 'zoneinfo', 'locale', 'updatedAt'], usr),
    "email": usr => getPropsFromObj(['email', 'emailVerified'], usr),
    "address": usr => ({address: usr['address']}), // address is a JSON object {streetAddress, locality, region, postalCode, country}
    "phone": usr => getPropsFromObj(['phoneNumber', 'phoneNumberVerified'], usr)
  };

  const user = await tUsrDao.getUserBySub(accessToken.sub);
  if(!user) {
    res.status(statusCodes.NOT_FOUND).end();
    return;
  }

  const userInfo = accessToken.scopes.filter(s => Object.keys(userInfoFactory).indexOf(s) > -1).reduce((a, s) => {
    console.log(`reduce a = ${JSON.stringify(a)}, s = ${JSON.stringify(s)}`);
    return {...a, ...userInfoFactory[s](user)};
  }, {});

  console.log(`${util.fetchCurrentDatetimeJst()} [resourceController.getUserInfo] userInfo = ${JSON.stringify(userInfo)}`);

  res.status(statusCodes.OK).json(userInfo);
};

module.exports = {
  checkAccessToken,
  handleCrossDomainRequest,
  readWords,
  writeWords,
  deleteWords,
  getResource,
  getProducts,
  getFavorites,
  getUserInfo
};
