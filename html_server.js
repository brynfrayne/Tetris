// Description: This file is used to run a local server on your computer
function start_html_server() {
    const http = require('http');
    const fs = require('fs');

    const hostname = '0.0.0.0';
    const port = 8080;

    const server = http.createServer(function(request, response) {
      console.log(`request.url: ${request.url}`);
      let extension = '.' + request.url;
      let re = extension.match(/([.])\w+/g);
      let type = (re === null) ? '.html' : re[0];
      let path = (extension === './') ? './index.html' : extension;
      let contentType = '';
      switch (type) {
        case '.html':
          contentType = 'text/html';
          encoding = 'utf8';
          break;
        case '.css':
          contentType = 'text/css';
          encoding = 'utf8';
          break;
        case '.js':
          contentType = 'text/javascript';
          encoding = 'utf8';
          break;
        case '.png':
            contentType = 'image/png';
            encoding = 'binary';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            encoding = 'binary';
            break;
        case '.wav':
            contentType = 'audio/wav';
            encoding = 'binary';
            break;
      }
      fs.readFile(path, (error, data) => {
        if (error) {
          response.writeHead(404);
          response.end();
          return;
        }

        response.writeHead(200, { 'Content-Type': contentType });
        response.write(data);
        response.end();
      });
    }).listen(port, hostname, () => {
        console.log("Server (Local): port 8080");
        console.log("Server (DoCode) running at http://e40cf358e-5674.docode.qwasar.io");
        console.log("Replace e40cf358e-5674 by your current workspace ID");
        console.log("(look at the URL of this page and e40cf358e-5674.docode.qwasar.io, e40cf358e-5674 is your workspace ID)");
    });
  }

  start_html_server();

