const fetch = require("node-fetch");
const statusCodes = require("http-status-codes");
const base64url = require('base64url');

const tUsrDao = require('./usrDao');
const config = require('./config');
const utils = require('./utils');

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
    const payload = JSON.parse(base64url.decode(cushion[1]));

    const introspectionResponse = await fetch(config.auth.introspectionEndpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Authorization': 'Basic ' + utils.encodeClientCredentials(config.protectedResource.resourceId, config.protectedResource.resourceSecret),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: utils.createRequestBody({token: incomingToken}),
    });

    if(!introspectionResponse.ok) {
      console.log('introspection failed');
      throw new Error(`introspection failed`);
    }

    const isActive = await introspectionResponse.json();

    if (!isActive) {
      console.log('token inactive');
      throw new Error(`token inactive`);
    }

    req.accessToken = payload;
    next();
    return;

  } catch (e) {
    console.log(e);
    res.status(statusCodes.UNAUTHORIZED).end();
    return;
  }
};

const getUserInfo = async (req, res) => {
  const accessToken = req.accessToken;

  // OpenID Connect defines a special scopes `openid` that controls overall access to the UserInfo endpoint with access token
  if (accessToken.scopes.indexOf('openid') === -1) {
    console.log(`${utils.fetchCurrentDatetimeJst()} [resourceController.getUserInfo] no openid in the scopes`);
    res.status(statusCodes.FORBIDDEN).end();
    return;
  }


  const userInfoFactory =  {
    "openid": usr => ({sub: usr['sub']}),
    "profile": usr => utils.getPropsFromObj(['name', 'familyName', 'givenName', 'middleName', 'nickname', 'preferredUsername', 'profile', 'picture', 'website', 'gender', 'birthdate', 'zoneinfo', 'locale', 'updatedAt'], usr),
    "email": usr => utils.getPropsFromObj(['email', 'emailVerified'], usr),
    "address": usr => ({address: usr['address']}), // address is a JSON object {streetAddress, locality, region, postalCode, country}
    "phone": usr => utils.getPropsFromObj(['phoneNumber', 'phoneNumberVerified'], usr)
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

  console.log(`${utils.fetchCurrentDatetimeJst()} [resourceController.getUserInfo] userInfo = ${JSON.stringify(userInfo)}`);

  res.status(statusCodes.OK).json(userInfo);
};

module.exports = {
  checkAccessToken,
  getUserInfo,
};
