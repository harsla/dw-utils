'use strict'
var stream = require('stream')

class Tail extends stream.Readable{
  constructor(options, server, url){
    super(options);
    this.url = url;
    this.poll_interval = options.poll_interval || 2000; // 2 second default
    this.cursor = 0;
    this.ETag = '';
    this.supports_range = true; 
    this.server = server

    this.fetch();
  }

  _read(){
    // ignore everything
  }

  process_response(error, response, body){
    //console.log(response.headers)
    if (response.statusCode == 200 || response.statusCode == 206){
      this.ETag = response.headers['etag'] || response.headers['date']
      this.lastmodified = response.headers['date']
      this.cursor += Number(response.headers['content-length'])
      this.push(body)
    }
    if (response.statusCode == 200){
      this.cursor = Number(response.headers['content-length'])
    }
  }

  fetch(){
    let headers = {}
    if (this.cursor > 0){
      headers['Range'] = `bytes=${this.cursor}-`
    }
    this.server.get_stream(this.url, {
      headers : headers,
      cb      : (error, response, body) => {
        this.process_response(error, response, body)
      }
    })
    .on('end', () => {
      setTimeout(() => { this.fetch() }, this.poll_interval)
    })
  }
}

module.exports = Tail
