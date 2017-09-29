import * as utils from 'src/utils';
import { format } from 'src/url';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';

const VERSION = '0.3';
const BIDDER_CODE = 'adyoulike';
export const spec = {
  code: BIDDER_CODE,
  aliases: ['ayl'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    const sizes = getSize(bid.sizes);
    if (!bid.params || !bid.params.placement || !sizes.width || !sizes.height) {
      return false;
    }
    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {bidderRequest} - bidderRequest.bids[] is an array of AdUnits and bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidderRequest) {
    const payload = {
      Version: _VERSION,
      Placements: placements,
      TransactionIds: bidRequests.reduce(getTransactionIds),
      PageRefreshed: getPageRefreshed()
    };

    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: createEndpoint(),
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];

    // For this adapter, serverResponse is a list
    serverResponse.forEach(response => {
      const bid = createBid(bidRequest, response)
      if (bid) {
        bidResponses.push(bid);
      }
    });

    return bidResponses
  }
}

/* Get current page referrer url */
function getReferrerUrl() {
  let referer = '';
  if (window.self !== window.top) {
    try {
      referer = window.top.document.referrer;
    } catch (e) { }
  } else {
    referer = document.referrer;
  }
  return referer;
}

/* Get current page canonical url */
function getCanonicalUrl() {
  let link;
  if (window.self !== window.top) {
    try {
      link = window.top.document.head.querySelector('link[rel="canonical"][href]');
    } catch (e) { }
  } else {
    link = document.head.querySelector('link[rel="canonical"][href]');
  }

  if (link) {
    return link.href;
  }
  return '';
}

/* Get parsed size from request size */
function getSize(requestSizes) {
  const parsed = {};
  const size = utils.parseSizesInput(requestSizes)[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  const parsedSize = size.toUpperCase().split('X');
  const width = parseInt(parsedSize[0], 10);
  if (width) {
    parsed.width = width;
  }

  const height = parseInt(parsedSize[1], 10);
  if (height) {
    parsed.height = height;
  }

  return parsed;
}

/* Get information on page refresh */
function getPageRefreshed() {
  try {
    if (performance && performance.navigation) {
      return performance.navigation.type === performance.navigation.TYPE_RELOAD;
    }
  } catch (e) { }
  return false;
}

function getTransactionIds(transactionIds, bid) {
  if (!transactionIds) {
    transactionIds = {}
  }

  if (!bid.params.placement) {
    return
  }

  transactionIds[bid.params.placement] = bid.transactionId;

  return transactionIds
}

/* Create endpoint url */
function createEndpoint(region) {
  if (!region) {
    region = ""
  }

  if (region != "") {
    region = "-" + region
  }

  return format({
    protocol: (document.location.protocol === 'https:') ? 'https' : 'http',
    host: 'hb-api' + region + '.omnitagjs.com',
    pathname: '/hb-api/prebid',
    search: createEndpointQS()
  });
}

/* Create endpoint query string */
function createEndpointQS() {
  const qs = {};

  const ref = getReferrerUrl();
  if (ref) {
    qs.RefererUrl = encodeURIComponent(ref);
  }

  const can = getCanonicalUrl();
  if (can) {
    qs.CanonicalUrl = encodeURIComponent(can);
  }

  return qs;
}

/* Get parsed size from request size */
function getSize(requestSizes) {
  const parsed = {};
  const size = utils.parseSizesInput(requestSizes)[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  const parsedSize = size.toUpperCase().split('X');
  const width = parseInt(parsedSize[0], 10);
  if (width) {
    parsed.width = width;
  }

  const height = parseInt(parsedSize[1], 10);
  if (height) {
    parsed.height = height;
  }

  return parsed;
}

/* Create bid from response */
function createBid(bidRequest, response) {
  if (!response || !response.Banner) {
    return
  }

  const size = getSize(bidRequest.sizes);

  return {
    requestId: bidRequest.bidId,
    bidderCode: spec.code,
    width: size.width,
    height: size.height,
    cpm: response.Price,
    ad: response.Banner
  };
}

registerBidder(spec);
