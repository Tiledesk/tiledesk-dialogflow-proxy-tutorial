/* 
    Andrea Sponziello - (c) Tiledesk.com
*/

const axios = require('axios');

/**
 * Wikipedia search
 */
class Wikipedia {

  /**
   * Constructor for TiledeskClient object
   *
   * @example
   * const { Wikipedia } = require('./wikipedia');
   * 
   */
  static API_ENDPOINT = "https://en.wikipedia.org/w/api.php?action=opensearch&limit=4&namespace=0&format=json&search=";

  constructor() {
  }

  doQuery(query, callback) {
    console.log("QUERY", query)
    Wikipedia.myrequest({
        url: Wikipedia.API_ENDPOINT + query,
        method: 'get',
      },
      function(err, json) {
        // example results:
        // [
        //     "leopardi",
        //     [
        //         "Leopardi",
        //         "Leopardi (film)",
        //         "Leopardi (disambiguation)",
        //         "Leopardian poetics"
        //     ],
        //     [
        //         "",
        //         "",
        //         "",
        //         ""
        //     ],
        //     [
        //         "https://en.wikipedia.org/wiki/Leopardi",
        //         "https://en.wikipedia.org/wiki/Leopardi_(film)",
        //         "https://en.wikipedia.org/wiki/Leopardi_(disambiguation)",
        //         "https://en.wikipedia.org/wiki/Leopardian_poetics"
        //     ]
        // ]
        if (callback) {
            let results = []
            if (json) {
                let titles = json[1];
                let urls = json[3];
                for (let i = 0; i < titles.length; i++) {
                  console.log("title:", titles[i]);
                  console.log("url:", urls[i]);
                  results.push({title: titles[i], path: urls[i]})
                  console.log("resu", results)
                }
            }
            callback(null, results);
        }
      })
  }

  static myrequest(options, callback, log) {
    if (log) {
      console.log("API:", options.url);
    }
    let axios_options = {}
    axios_options.url = options.url
    if (options.method) {
        axios_options.method = options.method
    }
    else {
        axios_options.method = 'get'
    }
    if (options.headers) {
        axios_options.headers = options.headers
    }
    if (options.json) {
        axios_options.data = options.json
    }
    axios(axios_options)
      .then(function (response) {
        console.log("response.data:", response.data)
        callback(null, response.data);
      }).catch(function (error) {
        console.log("error:", error);
        callback(error);
      });
    // request(
    //   {
    //     url: options.url,
    //     headers: options.headers,
    //     json: options.json,
    //     method: options.method
    //   },
    //   function(err, res, resbody) {
    //     if (log) {
    //       console.log("** For url:", options.url);
    //       console.log("** Options:", options);
    //       console.log("** Err:", err);
    //       console.log("** Response headers:\n", res.headers);
    //       console.log("** Response body:\n", res.body);
    //     }
    //     if (callback) {
    //       callback(err, res, resbody);
    //     }
    //   }
    // );
  }

}

module.exports = { Wikipedia };